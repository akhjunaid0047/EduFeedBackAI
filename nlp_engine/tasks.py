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
    """Parse uploaded syllabus PDF and extract structured content."""
    import re
    import pdfplumber

    try:
        engine = _get_sync_engine()
        with Session(engine) as session:
            syl = session.execute(
                text("SELECT original_file_path FROM syllabus_documents WHERE id = :id"),
                {"id": syllabus_id},
            ).fetchone()

            if not syl or not syl.original_file_path:
                return {"error": "syllabus not found or missing file path"}

            file_path = syl.original_file_path
            if not os.path.exists(file_path):
                return {"error": f"file not found: {file_path}"}

            raw_text = ""
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    raw_text += page_text + "\n"

            structure = {"units": []}
            current_unit = None

            for line in raw_text.split("\n"):
                line = line.strip()
                if not line or len(line) < 3:
                    continue
                # Detect unit/module headers
                if re.match(r"(?i)^(unit|module|chapter)\s+[\divxIVX\d]+[\s:\-]?", line):
                    current_unit = {"title": line, "topics": [], "objectives": []}
                    structure["units"].append(current_unit)
                elif current_unit:
                    if re.match(r"(?i)^(co\s*\d|course\s*outcome)", line):
                        current_unit["objectives"].append(line)
                    elif len(line) > 5 and not line.lower().startswith("page"):
                        current_unit["topics"].append(line)

            # Fallback: treat entire text as one unit
            if not structure["units"]:
                lines = [l.strip() for l in raw_text.split("\n") if len(l.strip()) > 10]
                structure["units"] = [{
                    "title": "Course Content",
                    "topics": lines[:60],
                    "objectives": [],
                }]

            session.execute(
                text("""
                    UPDATE syllabus_documents
                    SET parsed_text = :txt, parsed_structure = CAST(:struct AS jsonb), is_processed = true
                    WHERE id = :id
                """),
                {
                    "txt": raw_text[:50000],
                    "struct": json.dumps(structure),
                    "id": syllabus_id,
                },
            )
            session.commit()

            return {"status": "parsed", "units": len(structure["units"])}

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

            total_alumni = session.execute(text("SELECT COUNT(*) FROM alumni")).scalar() or 1

            # Get all courses with processed syllabi
            courses = session.execute(text("""
                SELECT c.id AS course_id, c.course_code, c.course_name,
                       sd.id AS syllabus_id, sd.parsed_structure
                FROM courses c
                JOIN syllabus_documents sd ON sd.course_id = c.id
                WHERE sd.is_processed = true AND c.is_active = true
                ORDER BY c.id
            """)).fetchall()

            # Fetch all alumni skills once
            all_skills = session.execute(text("""
                SELECT skill_name, skill_category, is_post_graduation,
                       COUNT(*) as mention_count
                FROM alumni_skills
                GROUP BY skill_name, skill_category, is_post_graduation
            """)).fetchall()

            skill_names = list({r.skill_name for r in all_skills})
            mention_map = {r.skill_name: int(r.mention_count) for r in all_skills}
            recent_skills = {r.skill_name for r in all_skills if r.is_post_graduation}
            skill_category_map = {r.skill_name: r.skill_category for r in all_skills}

            if not skill_names:
                session.execute(
                    text("UPDATE analytics_runs SET status='completed', completed_at=now(), alumni_count=:c WHERE id=:id"),
                    {"c": total_alumni, "id": run_id},
                )
                session.commit()
                return {"status": "no_skills"}

            for course in courses:
                course_id = str(course.course_id)
                structure = course.parsed_structure or {}
                topics = []
                for unit in structure.get("units", []):
                    topics.append(unit.get("title", ""))
                    topics.extend(unit.get("topics", []))
                topics = [t.strip() for t in topics if len(t.strip()) > 3]

                if not topics:
                    continue

                # Compute similarity matrix
                sim_matrix = compute_similarity_matrix(skill_names, topics)

                # Skill gaps
                gap_results = calculate_skill_gaps(
                    skill_names, topics, sim_matrix,
                    mention_map, total_alumni, recent_skills,
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

                # Course relevance score
                avg_rating = session.execute(
                    text("SELECT AVG(course_relevance_rating) FROM alumni WHERE course_relevance_rating IS NOT NULL")
                ).scalar() or 3.0
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

                # Recommendations
                recs = generate_recommendations(gap_results, relevance, recent_skills)
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
