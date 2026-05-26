import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


def compute_similarity_matrix(skill_phrases: list[str], topic_phrases: list[str]) -> np.ndarray:
    """
    Compute cosine similarity between skill and topic embeddings.
    Returns matrix of shape (len(skill_phrases), len(topic_phrases)).
    Uses BERT embeddings with normalized vectors (dot product = cosine sim).
    """
    if not skill_phrases or not topic_phrases:
        return np.zeros((len(skill_phrases), len(topic_phrases)))

    from nlp_engine.feature_extraction.bert_embedder import BERTEmbedder
    embedder = BERTEmbedder.get_instance()

    skill_embs = embedder.encode(skill_phrases)   # (n_skills, dim)
    topic_embs = embedder.encode(topic_phrases)   # (n_topics, dim)

    # Since embeddings are L2-normalized, dot product == cosine similarity
    return np.dot(skill_embs, topic_embs.T)
