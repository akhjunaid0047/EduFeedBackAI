"""
Celery task definitions for EduFeedback AI NLP pipeline.
These tasks run in Celery workers (synchronous context).
Sync DB access via psycopg2 / SQLAlchemy sync engine.
"""
import logging
import uuid
import json
import sys
import os

# Ensure backend is on the path when running from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from celery import shared_task
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def _get_sync_engine():
    from app.core.config import settings
    # Replace asyncpg driver with psycopg2 for sync Celery workers
    url = settings.DATABASE_URL.replace("+asyncpg", "").replace("postgresql+", "postgresql+psycopg2+")
    if "+asyncpg" in settings.DATABASE_URL:
        url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
    elif settings.DATABASE_URL.startswith("postgresql://") or settings.DATABASE_URL.startswith("postgres://"):
        url = settings.DATABASE_URL  # already sync
    return create_engine(url, pool_pre_ping=True)


@shared_task(bind=True, queue="nlp", name="nlp_engine.tasks.extract_skills")
def extract_skills(self, alumni_id: str):
    """Extract skills from alumni survey free-text fields → save to alumni_skills."""
    from nlp_engine.skill_extraction.skill_extractor import extract_skills as _extract

    try:
        engine = _get_sync_engine()
        with Session(engine) as session:
            row = session.execute(
                text("""
                    SELECT id, job_responsibilities, tools_software, skills_helped_land_job,
                           skills_missing_from_curriculum, skills_acquired_after_graduation,
                           unused_subjects, certifications_completed, suggestions_for_improvement
                    FROM alumni WHERE id = :id
                """),
                {"id": alumni_id},
            ).fetchone()

            if not row:
                return {"status": "not_found"}

            NLP_FIELDS = [
                ("job_responsibilities", False),
                ("tools_software", False),
                ("skills_helped_land_job", False),
                ("skills_missing_from_curriculum", False),
                ("skills_acquired_after_graduation", True),
                ("unused_subjects", False),
                ("certifications_completed", False),
                ("suggestions_for_improvement", False),
            ]

            session.execute(text("DELETE FROM alumni_skills WHERE alumni_id = :id"), {"id": alumni_id})

            inserted = 0
            for col_name, is_post_grad in NLP_FIELDS:
                text_val = getattr(row, col_name, None)
                if not text_val:
                    logger.debug("extract_skills [%s] field=%s → EMPTY/NULL, skipping", alumni_id, col_name)
                    continue
                skills = _extract(text_val)
                logger.info(
                    "extract_skills [%s] field=%s → %d skills from: %r",
                    alumni_id, col_name, len(skills), text_val[:120],
                )
                for skill in skills:
                    session.execute(
                        text("""
                            INSERT INTO alumni_skills
                              (id, alumni_id, skill_name, skill_category, source_field,
                               is_post_graduation, extracted_at)
                            VALUES (:id, :alumni_id, :skill_name, :skill_category,
                                    :source_field, :is_post_grad, now())
                            ON CONFLICT DO NOTHING
                        """),
                        {
                            "id": str(uuid.uuid4()),
                            "alumni_id": alumni_id,
                            "skill_name": skill["skill_name"],
                            "skill_category": skill["skill_category"],
                            "source_field": col_name,
                            "is_post_grad": is_post_grad,
                        },
                    )
                    inserted += 1

            session.commit()
            logger.info("extract_skills [%s] DONE → %d total skills inserted", alumni_id, inserted)
            return {"status": "done", "skills_extracted": inserted}

    except Exception as exc:
        logger.exception("extract_skills task failed for alumni_id=%s", alumni_id)
        raise self.retry(exc=exc, countdown=30, max_retries=3)


@shared_task(bind=True, queue="nlp", name="nlp_engine.tasks.parse_syllabus")
def parse_syllabus(self, syllabus_id: str):
    """Parse uploaded syllabus PDF and extract structured content.

    Delegates to nlp_engine.syllabus_parser.parse_pdf, which handles:
      - multi-course bundles (slices to the matching course code),
      - placeholder PDFs (status='placeholder', so analytics can skip),
      - flexible MODULE/UNIT/CHAPTER/SECTION/WEEK formats,
      - paragraph reassembly + CO-N objective extraction.
    """
    from nlp_engine.syllabus_parser import parse_pdf

    try:
        engine = _get_sync_engine()
        with Session(engine) as session:
            syl = session.execute(
                text("""
                    SELECT sd.original_file_path, c.course_code
                    FROM syllabus_documents sd
                    JOIN courses c ON c.id = sd.course_id
                    WHERE sd.id = :id
                """),
                {"id": syllabus_id},
            ).fetchone()

            if not syl or not syl.original_file_path:
                return {"error": "syllabus not found or missing file path"}

            file_path = syl.original_file_path
            if not os.path.exists(file_path):
                return {"error": f"file not found: {file_path}"}

            structure = parse_pdf(file_path, expected_course_code=syl.course_code)

            # For convenience downstream, also persist a plain-text snapshot.
            # parse_pdf already extracted it; re-derive a short version from
            # the units rather than re-reading the PDF.
            parsed_text_snippet = "\n\n".join(
                f"[{u['title']}]\n" + "\n".join(u.get("topics", []))
                for u in structure.get("units", [])
            )[:50000]

            session.execute(
                text("""
                    UPDATE syllabus_documents
                    SET parsed_text = :txt,
                        parsed_structure = CAST(:struct AS jsonb),
                        is_processed = true
                    WHERE id = :id
                """),
                {
                    "txt": parsed_text_snippet,
                    "struct": json.dumps(structure),
                    "id": syllabus_id,
                },
            )
            session.commit()

            logger.info(
                "parse_syllabus [%s] status=%s units=%d course_code=%s",
                syllabus_id, structure.get("parse_status"),
                len(structure.get("units", [])), structure.get("course_code"),
            )
            return {
                "status": structure.get("parse_status"),
                "units": len(structure.get("units", [])),
            }

    except Exception as exc:
        logger.exception("parse_syllabus failed for syllabus_id=%s", syllabus_id)
        raise self.retry(exc=exc, countdown=30, max_retries=3)


@shared_task(bind=True, queue="nlp", name="nlp_engine.tasks.run_full_analytics")
def run_full_analytics(self, run_id: str):
    """Full analytics pipeline: skill gaps + course relevance + recommendations."""
    from nlp_engine.matching.cosine_matcher import compute_similarity_matrix
    from nlp_engine.matching.gap_calculator import (
        calculate_skill_gaps, calculate_course_relevance_score, calculate_priority_score
    )
    from nlp_engine.recommendation.recommendation_engine import generate_recommendations
    from nlp_engine.recommendation.domain_filter import filter_by_domain

    try:
        engine = _get_sync_engine()
        with Session(engine) as session:
            # Mark RUNNING
            session.execute(
                text("UPDATE analytics_runs SET status='running', started_at=now() WHERE id=:id"),
                {"id": run_id},
            )
            session.commit()

            # Load settings
            cfg = session.execute(
                text("""
                    SELECT faculty_module_enabled, relevance_weight_alumni,
                           relevance_weight_skill_match, relevance_weight_co_attainment,
                           gap_threshold, min_alumni_mention_pct
                    FROM institution_settings LIMIT 1
                """)
            ).fetchone()

            weights = {
                "alumni": cfg.relevance_weight_alumni if cfg else 0.5,
                "skill_match": cfg.relevance_weight_skill_match if cfg else 0.5,
                "co": cfg.relevance_weight_co_attainment if cfg else 0.0,
            }
            gap_threshold = float(cfg.gap_threshold) if cfg and cfg.gap_threshold is not None else 0.40
            min_demand_pct = float(cfg.min_alumni_mention_pct) if cfg and cfg.min_alumni_mention_pct is not None else 0.10

            # Raw alumni count — kept for the analytics_runs snapshot ("dataset size at run time")
            total_alumni = session.execute(text("SELECT COUNT(*) FROM alumni")).scalar() or 1

            # Responsive alumni — used as the denominator for mention_pct. Excludes
            # alumni who left every skill field blank (career-break / exam-prep
            # respondents) so their absence doesn't dilute genuine demand signals.
            responsive_alumni = session.execute(
                text("SELECT COUNT(DISTINCT alumni_id) FROM alumni_skills")
            ).scalar() or 1

            # Get all courses with processed syllabi
            courses = session.execute(text("""
                SELECT c.id AS course_id, c.course_code, c.course_name, c.department_id,
                       sd.id AS syllabus_id, sd.parsed_structure
                FROM courses c
                JOIN syllabus_documents sd ON sd.course_id = c.id
                WHERE sd.is_processed = true AND c.is_active = true
                ORDER BY c.id
            """)).fetchall()

            # Fetch all alumni skills once.
            # COUNT(DISTINCT alumni_id) — a skill mentioned by one alumnus across
            # 3 fields counts once, not three. BOOL_OR collapses the recency flag
            # so the same skill_name doesn't appear twice when some alumni tag it
            # post-grad and others don't.
            all_skills = session.execute(text("""
                SELECT skill_name,
                       MAX(skill_category) AS skill_category,
                       BOOL_OR(is_post_graduation) AS is_post_graduation,
                       COUNT(DISTINCT alumni_id) AS mention_count
                FROM alumni_skills
                GROUP BY skill_name
            """)).fetchall()

            skill_names = [r.skill_name for r in all_skills]
            mention_map = {r.skill_name: int(r.mention_count) for r in all_skills}
            recent_skills = {r.skill_name for r in all_skills if r.is_post_graduation}
            skill_category_map = {r.skill_name: r.skill_category for r in all_skills}

            # Per-skill "unused ratio" — share of alumni mentions for each skill
            # that came from the "subjects you never used in your job" field.
            # Powers the REDUCE rule with explicit evidence rather than absence.
            unused_rows = session.execute(text("""
                SELECT skill_name,
                       COUNT(DISTINCT alumni_id) FILTER (WHERE source_field = 'unused_subjects') AS unused_count,
                       COUNT(DISTINCT alumni_id) AS total_count
                FROM alumni_skills
                GROUP BY skill_name
            """)).fetchall()
            unused_ratio_map = {
                r.skill_name: (float(r.unused_count) / r.total_count if r.total_count else 0.0)
                for r in unused_rows
            }

            if not skill_names:
                session.execute(
                    text("UPDATE analytics_runs SET status='completed', completed_at=now(), alumni_count=:c WHERE id=:id"),
                    {"c": total_alumni, "id": run_id},
                )
                session.commit()
                return {"status": "no_skills"}

            # Collected across the main loop, consumed by the OVERHAUL second
            # pass after all courses are scored.
            course_relevance_map: dict[str, float] = {}

            for course in courses:
                course_id = str(course.course_id)
                structure = course.parsed_structure or {}

                # Skip courses whose PDF was a placeholder / unparseable. The
                # parse_syllabus task tags these with parse_status; older
                # records without the field are treated as 'ok' for back-compat.
                parse_status = structure.get("parse_status", "ok")
                if parse_status != "ok":
                    logger.info(
                        "run_full_analytics skipping course=%s (parse_status=%s)",
                        course.course_code, parse_status,
                    )
                    continue

                topics = []
                for unit in structure.get("units", []):
                    topics.append(unit.get("title", ""))
                    topics.extend(unit.get("topics", []))
                topics = [t.strip() for t in topics if len(t.strip()) > 3]

                if not topics:
                    continue

                # Compute similarity matrix
                sim_matrix = compute_similarity_matrix(skill_names, topics)

                # Skill gaps — thresholds come from institution_settings (live-tunable
                # via the admin UI); responsive_alumni is the correct denominator.
                gap_results = calculate_skill_gaps(
                    skill_names, topics, sim_matrix,
                    mention_map, responsive_alumni, recent_skills,
                    gap_threshold=gap_threshold,
                    min_demand_pct=min_demand_pct,
                )

                # Out-of-domain pruning. The gap engine compares every alumni
                # skill against every course, so e.g. 'java' shows up as a gap
                # in 'Chemistry Lab'. Two-stage filter:
                #   1. Drop rows whose max similarity is below a floor (cheap,
                #      deterministic — catches the clearly disconnected skills).
                #   2. Run the remaining gap-flagged rows through the same LLM
                #      domain filter we already use for recommendations, so
                #      mid-similarity nonsense (java ~ 0.30 in chemistry) gets
                #      removed too. Non-gap ("covered") rows are kept so the
                #      page still shows what the course already aligns with.
                OUT_OF_DOMAIN_FLOOR = 0.15
                gap_results = [
                    g for g in gap_results
                    if (g.get("max_similarity_score") or 0.0) >= OUT_OF_DOMAIN_FLOOR
                ]

                gap_flagged = [g for g in gap_results if g.get("gap_flag")]
                if gap_flagged:
                    fake_recs = [
                        {"recommendation_type": "ADD", "target_topic": g["skill_name"]}
                        for g in gap_flagged
                    ]
                    kept_recs = filter_by_domain(
                        course_code=course.course_code,
                        course_name=course.course_name,
                        syllabus_structure=structure,
                        recommendations=fake_recs,
                    )
                    kept_skills = {r["target_topic"] for r in kept_recs}
                    gap_results = [
                        g for g in gap_results
                        if (not g.get("gap_flag")) or g["skill_name"] in kept_skills
                    ]

                # Persist skill gaps
                session.execute(
                    text("DELETE FROM skill_gap_results WHERE course_id=:cid"),
                    {"cid": course_id},
                )
                for g in gap_results:
                    session.execute(text("""
                        INSERT INTO skill_gap_results
                          (id, course_id, skill_name, skill_category, max_similarity_score,
                           alumni_mention_count, alumni_mention_pct, is_post_grad_skill,
                           gap_flag, analytics_run_id, computed_at)
                        VALUES (:id, :cid, :skill, :cat, :sim, :cnt, :pct, :pg, :gap, :rid, now())
                    """), {
                        "id": str(uuid.uuid4()),
                        "cid": course_id,
                        "skill": g["skill_name"],
                        "cat": skill_category_map.get(g["skill_name"], "Unknown"),
                        "sim": g["max_similarity_score"],
                        "cnt": g["alumni_mention_count"],
                        "pct": g["alumni_mention_pct"],
                        "pg": g["is_post_grad_skill"],
                        "gap": g["gap_flag"],
                        "rid": run_id,
                    })

                # Course relevance score.
                # Per-course rating: filter alumni to those whose department matches
                # this course's department (alumni.department is a free-text string;
                # we match against departments.name OR departments.code, both of
                # which carry values like "CSE"). Falls back to the global average
                # if no alumni from that department have rated.
                avg_rating_row = session.execute(
                    text("""
                        SELECT AVG(a.course_relevance_rating)
                        FROM alumni a
                        JOIN departments d
                          ON LOWER(a.department) IN (LOWER(d.name), LOWER(d.code))
                        WHERE d.id = :dept_id
                          AND a.course_relevance_rating IS NOT NULL
                    """),
                    {"dept_id": course.department_id},
                ).scalar() if course.department_id else None

                if avg_rating_row is None:
                    avg_rating_row = session.execute(
                        text("SELECT AVG(course_relevance_rating) FROM alumni WHERE course_relevance_rating IS NOT NULL")
                    ).scalar()

                avg_rating = float(avg_rating_row) if avg_rating_row is not None else 3.0
                avg_skill_match = float(sim_matrix.mean()) if sim_matrix.size > 0 else 0.5

                avg_co = None
                if weights["co"] > 0:
                    co_row = session.execute(
                        text("SELECT AVG(final_attainment_pct) FROM co_attainment_reports WHERE course_id=:cid"),
                        {"cid": course_id},
                    ).scalar()
                    avg_co = float(co_row) if co_row else None

                relevance = calculate_course_relevance_score(
                    float(avg_rating), avg_skill_match, avg_co, weights
                )
                course_relevance_map[course_id] = relevance

                session.execute(text("DELETE FROM course_relevance_scores WHERE course_id=:cid"), {"cid": course_id})
                session.execute(text("""
                    INSERT INTO course_relevance_scores
                      (id, course_id, relevance_score, alumni_relevance_avg,
                       skill_match_score, co_attainment_avg, analytics_run_id, computed_at)
                    VALUES (:id, :cid, :score, :ar, :sm, :co, :rid, now())
                """), {
                    "id": str(uuid.uuid4()),
                    "cid": course_id,
                    "score": relevance,
                    "ar": round(float(avg_rating), 4),
                    "sm": round(avg_skill_match, 4),
                    "co": avg_co,
                    "rid": run_id,
                })

                # Recommendations — same thresholds as gap stage so ADD/REDUCE
                # bars move together when the admin tunes settings. REDUCE recs
                # now require the topic/sim/unused-ratio inputs so the rule can
                # operate on syllabus topics with evidence-positive signals.
                recs = generate_recommendations(
                    gap_results, relevance, recent_skills,
                    gap_threshold=gap_threshold,
                    min_demand_pct=min_demand_pct,
                    topic_phrases=topics,
                    sim_matrix=sim_matrix,
                    skill_names=skill_names,
                    unused_ratio_map=unused_ratio_map,
                )
                recs = filter_by_domain(
                    course_code=course.course_code,
                    course_name=course.course_name,
                    syllabus_structure=structure,
                    recommendations=recs,
                )
                session.execute(
                    text("DELETE FROM curriculum_recommendations WHERE course_id=:cid AND status='pending'"),
                    {"cid": course_id},
                )
                for rec in recs:
                    session.execute(text("""
                        INSERT INTO curriculum_recommendations
                          (id, course_id, recommendation_type, target_topic,
                           evidence_summary, priority_score, status,
                           included_in_revision, analytics_run_id, generated_at)
                        VALUES (:id, :cid, :type, :topic, :evidence, :priority,
                                'pending', false, :rid, now())
                    """), {
                        "id": str(uuid.uuid4()),
                        "cid": course_id,
                        "type": rec["recommendation_type"].lower(),
                        "topic": rec["target_topic"],
                        "evidence": rec["evidence_summary"],
                        "priority": rec["priority_score"],
                        "rid": run_id,
                    })

            # ── OVERHAUL second pass ────────────────────────────────────────
            # Rank all courses by relevance and flag the bottom 20% — but only
            # those that also fall below an absolute floor of 0.50. The
            # percentile cut prevents all-or-nothing behavior on uniformly
            # weak/strong cohorts; the floor prevents flagging a course that
            # just happens to be the bottom of a strong set.
            OVERHAUL_PERCENTILE = 0.20
            OVERHAUL_ABSOLUTE_FLOOR = 0.50
            if course_relevance_map:
                scores_sorted = sorted(course_relevance_map.items(), key=lambda kv: kv[1])
                cutoff_idx = max(1, int(len(scores_sorted) * OVERHAUL_PERCENTILE))
                bottom_n = scores_sorted[:cutoff_idx]
                bottom_max_score = bottom_n[-1][1] if bottom_n else 0.0
                for cid, rel in bottom_n:
                    if rel >= OVERHAUL_ABSOLUTE_FLOOR:
                        continue
                    evidence = (
                        f"Course relevance {rel:.2f}/1.0 — ranked in the bottom "
                        f"{int(OVERHAUL_PERCENTILE * 100)}% of all courses this run "
                        f"(bottom-bucket ceiling: {bottom_max_score:.2f}, absolute "
                        f"floor: {OVERHAUL_ABSOLUTE_FLOOR:.2f}). Flagged for committee review."
                    )
                    session.execute(text("""
                        INSERT INTO curriculum_recommendations
                          (id, course_id, recommendation_type, target_topic,
                           evidence_summary, priority_score, status,
                           included_in_revision, analytics_run_id, generated_at)
                        VALUES (:id, :cid, 'overhaul', 'Entire Course Curriculum',
                                :evidence, :priority, 'pending', false, :rid, now())
                    """), {
                        "id": str(uuid.uuid4()),
                        "cid": cid,
                        "evidence": evidence,
                        "priority": round(1.0 - rel, 4),
                        "rid": run_id,
                    })

            session.commit()

            # Mark COMPLETED
            session.execute(
                text("UPDATE analytics_runs SET status='completed', completed_at=now(), alumni_count=:c WHERE id=:id"),
                {"c": total_alumni, "id": run_id},
            )
            session.commit()

            return {"status": "completed", "run_id": run_id}

    except Exception as exc:
        logger.exception("run_full_analytics failed for run_id=%s", run_id)
        try:
            engine = _get_sync_engine()
            with Session(engine) as s:
                s.execute(
                    text("UPDATE analytics_runs SET status='failed', error_log=:err WHERE id=:id"),
                    {"err": str(exc)[:2000], "id": run_id},
                )
                s.commit()
        except Exception:
            pass
        raise self.retry(exc=exc, countdown=60, max_retries=2)


@shared_task(bind=True, queue="revision", name="nlp_engine.tasks.run_syllabus_revision")
def run_syllabus_revision(self, revision_id: str, syllabus_id: str):
    """Generate revised syllabus and diff from pending recommendations."""
    from nlp_engine.revision.syllabus_reviser import apply_recommendations_to_structure
    from nlp_engine.revision.diff_generator import generate_diff

    try:
        engine = _get_sync_engine()
        with Session(engine) as session:
            syl = session.execute(
                text("SELECT parsed_structure, course_id FROM syllabus_documents WHERE id=:id"),
                {"id": syllabus_id},
            ).fetchone()

            if not syl:
                return {"error": "syllabus not found"}

            structure = syl.parsed_structure or {"units": []}
            course_id = str(syl.course_id)

            recs = session.execute(text("""
                SELECT recommendation_type, target_topic, evidence_summary, priority_score
                FROM curriculum_recommendations
                WHERE course_id=:cid AND status='pending'
                ORDER BY priority_score DESC
                LIMIT 30
            """), {"cid": course_id}).fetchall()

            rec_list = [
                {
                    "recommendation_type": (r.recommendation_type or "").upper(),
                    "target_topic": r.target_topic,
                    "evidence_summary": r.evidence_summary or "",
                    "priority_score": float(r.priority_score),
                }
                for r in recs
            ]

            if not rec_list:
                diff_data = {"changes": [], "note": "No pending recommendations found."}
                session.execute(
                    text("UPDATE syllabus_revisions SET diff_data=CAST(:d AS jsonb), revised_structure=CAST(:rs AS jsonb) WHERE id=:id"),
                    {"d": json.dumps(diff_data), "rs": json.dumps(structure), "id": revision_id},
                )
                session.commit()
                return {"status": "no_recommendations"}

            revised = apply_recommendations_to_structure(structure, rec_list)
            diff = generate_diff(structure, revised, rec_list)

            session.execute(
                text("UPDATE syllabus_revisions SET diff_data=CAST(:d AS jsonb), revised_structure=CAST(:rs AS jsonb) WHERE id=:id"),
                {"d": json.dumps(diff), "rs": json.dumps(revised), "id": revision_id},
            )
            session.commit()

            return {"status": "done", "changes": len(diff.get("changes", []))}

    except Exception as exc:
        logger.exception("run_syllabus_revision failed for revision_id=%s", revision_id)
        raise self.retry(exc=exc, countdown=30, max_retries=3)
