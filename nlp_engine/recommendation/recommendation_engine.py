from nlp_engine.matching.gap_calculator import calculate_priority_score

HIGH_DEMAND_PCT = 0.15
LOW_SIM_THRESHOLD = 0.40
LOW_ROI_SIM = 0.30
OVERHAUL_THRESHOLD = 0.50  # relevance_score below this → flag for overhaul


def generate_recommendations(
    skill_gap_results: list[dict],
    course_relevance_score: float,
    recent_skills: set[str],
) -> list[dict]:
    """
    Returns list of recommendation dicts:
    {recommendation_type, target_topic, evidence_summary, priority_score}
    """
    recommendations = []

    for gap in skill_gap_results:
        skill = gap["skill_name"]
        sim = gap["max_similarity_score"]
        mention_pct = gap["alumni_mention_pct"]
        mention_count = gap["alumni_mention_count"]
        is_recent = skill in recent_skills

        # HIGH_DEMAND_LOW_COVERAGE → ADD
        if mention_pct >= HIGH_DEMAND_PCT and sim < LOW_SIM_THRESHOLD:
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

        # LOW_ROI_TOPICS → REDUCE
        elif sim < LOW_ROI_SIM and mention_pct < 0.05 and mention_count > 0:
            evidence = (
                f"Low industry relevance (similarity score: {sim:.2f}). "
                f"Only {mention_pct * 100:.1f}% of alumni use this skill in their roles."
            )
            priority = round(calculate_priority_score(1 - sim, 1 - mention_pct, False) * 0.4, 4)
            recommendations.append({
                "recommendation_type": "REDUCE",
                "target_topic": skill,
                "evidence_summary": evidence,
                "priority_score": priority,
            })

    # CURRICULUM_MISALIGNMENT → OVERHAUL
    if course_relevance_score < OVERHAUL_THRESHOLD:
        recommendations.append({
            "recommendation_type": "OVERHAUL",
            "target_topic": "Entire Course Curriculum",
            "evidence_summary": (
                f"Overall course relevance score is {course_relevance_score:.2f}/1.0 "
                f"(threshold: {OVERHAUL_THRESHOLD:.2f}). Course flagged for committee review."
            ),
            "priority_score": round(1.0 - course_relevance_score, 4),
        })

    # Sort by priority descending
    recommendations.sort(key=lambda x: x["priority_score"], reverse=True)
    return recommendations
