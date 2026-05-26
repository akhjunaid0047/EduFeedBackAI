import uuid
from datetime import datetime, timezone


def generate_diff(
    original_structure: dict,
    revised_structure: dict,
    recommendations: list[dict],
) -> dict:
    """
    Produces diff_data JSONB from original structure, revised structure, and recommendations.
    """
    changes = []
    for rec in recommendations:
        rec_type = rec.get("recommendation_type", "")
        target = rec.get("target_topic", "")

        unit_name = _find_unit_for_topic(revised_structure, target)
        proposed_text = _find_proposed_text(revised_structure, target, rec_type)

        change = {
            "change_id": str(uuid.uuid4())[:8],
            "unit": unit_name,
            "type": rec_type,
            "original_text": None if rec_type == "ADD" else target,
            "proposed_text": proposed_text,
            "evidence": rec.get("evidence_summary", ""),
            "priority_score": rec.get("priority_score", 0.0),
            "status": "PENDING",
        }
        changes.append(change)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "changes": changes,
    }


def _find_unit_for_topic(structure: dict, topic: str) -> str:
    topic_lower = topic.lower()
    for unit in structure.get("units", []):
        for t in unit.get("topics", []):
            if topic_lower in t.lower():
                return unit.get("title", "General")
    return "General"


def _find_proposed_text(structure: dict, topic: str, rec_type: str) -> str | None:
    if rec_type == "REDUCE":
        return f"{topic} (condensed — brief overview only)"
    if rec_type == "OVERHAUL":
        return "Complete curriculum review recommended"
    # For ADD — find the actual inserted text in revised structure
    topic_lower = topic.lower()
    for unit in structure.get("units", []):
        for t in unit.get("topics", []):
            if topic_lower in t.lower():
                return t
    return f"[NEW] {topic}"
