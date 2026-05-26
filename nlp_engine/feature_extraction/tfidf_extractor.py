from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
import pickle
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "tfidf_model.pkl")


class TFIDFExtractor:
    def __init__(self, max_features: int = 5000):
        self.vectorizer = TfidfVectorizer(
            max_features=max_features,
            ngram_range=(1, 2),
            sublinear_tf=True,
        )
        self.is_fitted = False

    def fit(self, corpus: list[str]):
        self.vectorizer.fit(corpus)
        self.is_fitted = True

    def transform(self, texts: list[str]) -> np.ndarray:
        return self.vectorizer.transform(texts).toarray()

    def fit_transform(self, corpus: list[str]) -> np.ndarray:
        self.is_fitted = True
        return self.vectorizer.fit_transform(corpus).toarray()

    def save(self, path: str = MODEL_PATH):
        with open(path, "wb") as f:
            pickle.dump(self.vectorizer, f)

    def load(self, path: str = MODEL_PATH):
        with open(path, "rb") as f:
            self.vectorizer = pickle.load(f)
        self.is_fitted = True
