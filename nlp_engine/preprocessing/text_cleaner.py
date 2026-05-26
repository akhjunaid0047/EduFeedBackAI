import re
from nlp_engine.preprocessing.stopwords import CUSTOM_STOPWORDS

# Lazy-load spaCy to avoid slow import at module level
_nlp = None


def _get_nlp():
    global _nlp
    if _nlp is None:
        import spacy
        _nlp = spacy.load("en_core_web_sm", disable=["ner", "parser"])
    return _nlp


def preprocess(text: str) -> list[str]:
    """Lowercase, tokenize, lemmatize, remove stopwords. Returns unigrams + bigrams."""
    if not text:
        return []
    text = text.lower()
    text = re.sub(r"[^a-z\s]", " ", text)
    nlp = _get_nlp()
    doc = nlp(text)
    tokens = [
        token.lemma_
        for token in doc
        if not token.is_stop
        and not token.is_punct
        and token.is_alpha
        and len(token.lemma_) > 2
        and token.lemma_ not in CUSTOM_STOPWORDS
    ]
    bigrams = ["_".join(b) for b in zip(tokens, tokens[1:])]
    return tokens + bigrams


def clean_text(text: str) -> str:
    """Returns a cleaned single string (not tokenized)."""
    return " ".join(preprocess(text))
