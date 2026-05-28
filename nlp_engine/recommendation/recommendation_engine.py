from typing import Optional

import numpy as np

from nlp_engine.matching.gap_calculator import (
    calculate_priority_score,
    DEFAULT_GAP_THRESHOLD,
    DEFAULT_MIN_DEMAND_PCT,
)

# ADD threshold sits above the gap floor so only genuinely high-demand skills
# become ADD recs (not every skill that merely passes the gap filter).
HIGH_DEMAND_MULTIPLIER = 1.5

# REDUCE config (topic-driven; see below).
TOPIC_MATCH_FLOOR = 0.45          # syllabus topic must clearly map to the skill
UNUSED_RATIO_THRESHOLD = 0.50     # ≥50% of the skill's alumni mentions came from
                                  # the "subjects never used in your job" field
MIN_UNUSED_MENTIONS = 3           # need at least this many distinct alumni saying
                                  # "never used" before we trust the signal

# OVERHAUL is now decided in tasks.py (bottom-percentile across all courses);
# this constant is kept only as a documentation anchor.
OVERHAUL_THRESHOLD_FLOOR = 0.50


def generate_recommendations(
    skill_gap_results: list[dict],
    course_relevance_score: float,  # kept for backwards-compat; OVERHAUL no longer fires here
    recent_skills: set[str],
    gap_threshold: float = DEFAULT_GAP_THRESHOLD,
    min_demand_pct: float = DEFAULT_MIN_DEMAND_PCT,
    topic_phrases: Optional[list[str]] = None,
    sim_matrix: Optional[np.ndarray] = None,
    skill_names: Optional[list[str]] = None,
    unused_ratio_map: Optional[dict[str, float]] = None,
) -> list[dict]:
    """
    Returns list of recommendation dicts:
    {recommendation_type, target_topic, evidence_summary, priority_score}

    ADD recs are driven off alumni skill gaps (demand without coverage).

    REDUCE recs require the four optional kwargs (topics, sim_matrix, skill_names,
    unused_ratio_map). They are emitted against SYLLABUS topics (not alumni skills)
    when the best-matching alumni skill is predominantly tagged as "never used"
    by alumni. This is an evidence-positive rule — we never recommend reducing a
    topic merely because alumni don't talk about it (the old rule did, which
    flipped the logic and produced false positives on foundational subjects).

    OVERHAUL is no longer emitted here — it is decided in tasks.py using a
    bottom-percentile cutoff across all courses, with course_relevance_score
    as the input. The argument is kept in the signature for backwards compat.
    """
    _ = course_relevance_score  # intentionally unused — see docstring
    recommendations: list[dict] = []
    high_demand_pct = min_demand_pct * HIGH_DEMAND_MULTIPLIER

    # ── ADD: high demand, low current coverage ───────────────────────────
    for gap in skill_gap_results:
        skill = gap["skill_name"]
        sim = gap["max_similarity_score"]
        mention_pct = gap["alumni_mention_pct"]
        mention_count = gap["alumni_mention_count"]
        is_recent = skill in recent_skills

        if mention_pct >= high_demand_pct and sim < gap_threshold:
            trend_note = " Emerging trend in recent cohorts." if is_recent else ""
            evidence = (
                f"Mentioned by {mention_pct * 100:.0f}% of alumni "
                f"({mention_count} respondents). Current syllabus coverage: {sim:.2f}/1.0.{trend_note}"
            )
            priority = calculate_priority_score(1 - sim, mention_pct, is_recent)
            recommendations.append({
                "recommendation_type": "ADD",
                "target_topic": skill,
                "evidence_summary": evidence,
                "priority_score": priority,
            })

    # ── REDUCE: topics alumni explicitly say they didn't use ─────────────
    can_run_reduce = (
        topic_phrases is not None
        and sim_matrix is not None
        and skill_names is not None
        and unused_ratio_map is not None
        and sim_matrix.size > 0
    )
    if can_run_reduce:
        mention_count_map = {g["skill_name"]: g["alumni_mention_count"] for g in skill_gap_results}
        seen_topics: set[str] = set()
        for j, topic in enumerate(topic_phrases):
            if topic in seen_topics:
                continue
            seen_topics.add(topic)
            best_skill_idx = int(np.argmax(sim_matrix[:, j]))
            best_sim = float(sim_matrix[best_skill_idx, j])
            if best_sim < TOPIC_MATCH_FLOOR:
                continue
            best_skill = skill_names[best_skill_idx]
            unused_ratio = unused_ratio_map.get(best_skill, 0.0)
            total_mentions = mention_count_map.get(best_skill, 0)
            unused_mentions = int(round(unused_ratio * total_mentions))
            if unused_ratio < UNUSED_RATIO_THRESHOLD or unused_mentions < MIN_UNUSED_MENTIONS:
                continue

            evidence = (
                f"{unused_mentions} alumni listed '{best_skill}' as a subject they "
                f"never used in their job ({unused_ratio * 100:.0f}% of all mentions "
                f"of this skill). Topic match confidence: {best_sim:.2f}/1.0."
            )
            # Priority scales with both how strongly alumni reject it and how
            # many alumni said so (capped at 1.0 by calculate_priority_score).
            priority = calculate_priority_score(unused_ratio, min(1.0, unused_mentions / 10.0), False)
            recommendations.append({
                "recommendation_type": "REDUCE",
                "target_topic": topic,
                "evidence_summary": evidence,
                "priority_score": priority,
            })

    recommendations.sort(key=lambda x: x["priority_score"], reverse=True)
    return recommendations
