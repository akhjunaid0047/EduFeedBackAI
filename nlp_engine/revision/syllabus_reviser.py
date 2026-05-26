import copy
import numpy as np


def apply_recommendations_to_structure(
    parsed_structure: dict,
    recommendations: list[dict],
) -> dict:
    """
    Apply recommendations to syllabus structure.
    parsed_structure: {"units": [{"title": str, "topics": [str], "objectives": [str]}]}
    Returns a deep-copied revised structure.
    """
    revised = copy.deepcopy(parsed_structure)
    units = revised.get("units", [])

    if not units:
        revised["units"] = []
        units = revised["units"]

    # Lazy-load embedder
    from nlp_engine.feature_extraction.bert_embedder import BERTEmbedder
    embedder = BERTEmbedder.get_instance()

    unit_titles = [u.get("title", "") for u in units]
    unit_embeddings = embedder.encode(unit_titles) if unit_titles else np.array([])

    for rec in recommendations:
        rec_type = rec.get("recommendation_type", "")
        target = rec.get("target_topic", "")

        if rec_type == "ADD":
            if len(unit_embeddings) > 0:
                topic_emb = embedder.encode_single(target)
                sims = np.dot(unit_embeddings, topic_emb)
                best_idx = int(np.argmax(sims))
                if float(sims[best_idx]) > 0.25:
                    units[best_idx]["topics"].append(f"[NEW] {target}")
                else:
                    # Propose a new unit
                    units.append({
                        "title": f"[NEW UNIT] Emerging Topics: {target}",
                        "topics": [f"[NEW] {target}"],
                        "objectives": [],
                    })
                    # Update embeddings for next iteration
                    unit_embeddings = embedder.encode([u.get("title", "") for u in units])
            else:
                units.append({
                    "title": f"[NEW UNIT] {target}",
                    "topics": [f"[NEW] {target}"],
                    "objectives": [],
                })

        elif rec_type == "REDUCE":
            topic_emb = embedder.encode_single(target)
            for unit in units:
                topic_texts = unit.get("topics", [])
                if not topic_texts:
                    continue
                # Filter out already-tagged topics to avoid re-processing
                original_topics = [t for t in topic_texts if not t.startswith("[")]
                if not original_topics:
                    continue
                topic_embs = embedder.encode(original_topics)
                sims = np.dot(topic_embs, topic_emb)
                best_local_idx = int(np.argmax(sims))
                if float(sims[best_local_idx]) > 0.45:
                    # Find the actual index in the full topics list
                    orig_topic = original_topics[best_local_idx]
                    for j, t in enumerate(unit["topics"]):
                        if t == orig_topic:
                            unit["topics"][j] = f"[REVISED — reduced] {t}"
                            break

    return revised
