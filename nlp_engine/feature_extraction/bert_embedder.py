import numpy as np

MODEL_NAME = "all-MiniLM-L6-v2"

_instance = None


class BERTEmbedder:
    @classmethod
    def get_instance(cls) -> "BERTEmbedder":
        global _instance
        if _instance is None:
            _instance = cls()
        return _instance

    def __init__(self):
        from sentence_transformers import SentenceTransformer
        self.model = SentenceTransformer(MODEL_NAME)

    def encode(self, texts: list[str], batch_size: int = 64) -> np.ndarray:
        if isinstance(texts, str):
            texts = [texts]
        return self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )

    def encode_single(self, text: str) -> np.ndarray:
        return self.encode([text])[0]
