import numpy as np

# Defaults — overridden per-run by institution_settings (see tasks.run_full_analytics)
DEFAULT_GAP_THRESHOLD = 0.40
DEFAULT_MIN_DEMAND_PCT = 0.10
RECENCY_WEIGHT_BOOST = 1.5


def calculate_skill_gaps(
    skill_names: list[str],
    topic_phrases: list[str],
    similarity_matrix: np.ndarray,
    alumni_mention_counts: dict[str, int],
    total_alumni: int,
    recent_skill_names: set[str],
    gap_threshold: float = DEFAULT_GAP_THRESHOLD,
    min_demand_pct: float = DEFAULT_MIN_DEMAND_PCT,
) -> list[dict]:
    """
    Returns list of skill gap records per (skill, course).
    `total_alumni` is the denominator for mention_pct — should be the count of
    alumni who provided any skill data (responsive base), not raw row count.
    """
    results = []
    for i, skill in enumerate(skill_names):
        if similarity_matrix.shape[1] > 0:
            best_sim = float(np.max(similarity_matrix[i]))
        else:
            best_sim = 0.0

        mention_count = alumni_mention_counts.get(skill, 0)
        mention_pct = mention_count / total_alumni if total_alumni > 0 else 0.0
        is_post_grad = skill in recent_skill_names
        gap_flag = best_sim < gap_threshold and mention_pct >= min_demand_pct

        results.append({
            "skill_name": skill,
            "max_similarity_score": round(best_sim, 4),
            "alumni_mention_count": mention_count,
            "alumni_mention_pct": round(mention_pct, 4),
            "gap_flag": gap_flag,
            "is_post_grad_skill": is_post_grad,
        })
    return results


def calculate_course_relevance_score(
    avg_alumni_rating: float,
    avg_skill_match: float,
    avg_co_attainment: float | None,
    weights: dict[str, float],
) -> float:
    """Weighted composite course relevance score (0–1)."""
    alumni_norm = (avg_alumni_rating - 1) / 4  # normalize 1-5 → 0-1
    alumni_norm = max(0.0, min(1.0, alumni_norm))

    if avg_co_attainment is not None and weights.get("co", 0) > 0:
        score = (
            weights["alumni"] * alumni_norm
            + weights["skill_match"] * avg_skill_match
            + weights["co"] * (avg_co_attainment / 100.0)
        )
    else:
        total = weights["alumni"] + weights["skill_match"]
        if total > 0:
            w_a = weights["alumni"] / total
            w_s = weights["skill_match"] / total
        else:
            w_a = w_s = 0.5
        score = w_a * alumni_norm + w_s * avg_skill_match

    return round(min(max(score, 0.0), 1.0), 4)


def calculate_priority_score(
    gap_index: float,
    alumni_mention_pct: float,
    is_recent: bool,
) -> float:
    recency = RECENCY_WEIGHT_BOOST if is_recent else 1.0
    score = gap_index * alumni_mention_pct * recency
    return round(min(score, 1.0), 4)
