import re
import json
import os
from nlp_engine.preprocessing.text_cleaner import preprocess

TAXONOMY_PATH = os.path.join(os.path.dirname(__file__), "skill_taxonomy.json")

with open(TAXONOMY_PATH) as f:
    TAXONOMY: dict[str, dict] = json.load(f)

# Build lookup: alias (lowercase) → canonical name
SKILL_LOOKUP: dict[str, str] = {}
SKILL_CATEGORY: dict[str, str] = {}

for canonical, meta in TAXONOMY.items():
    SKILL_LOOKUP[canonical.lower()] = canonical
    SKILL_CATEGORY[canonical] = meta["category"]
    for alias in meta.get("aliases", []):
        SKILL_LOOKUP[alias.lower()] = canonical


def extract_skills(text: str) -> list[dict]:
    """
    Extract skills from free-text.
    Returns: [{"skill_name": str, "skill_category": str}, ...]
    """
    if not text:
        return []

    text_lower = text.lower()
    found: dict[str, str] = {}  # canonical → category

    # 0. Comma/semicolon-split matching — handles "Python, FastAPI, Redis" style lists
    #    Check each chunk directly against skill lookup before any NLP processing
    for chunk in re.split(r"[,;]", text_lower):
        chunk = chunk.strip()
        if chunk and chunk in SKILL_LOOKUP:
            canonical = SKILL_LOOKUP[chunk]
            found[canonical] = SKILL_CATEGORY[canonical]

    # 1. Token-level matching via spaCy lemmatization
    tokens = preprocess(text)
    for token in tokens:
        if token in SKILL_LOOKUP:
            canonical = SKILL_LOOKUP[token]
            found[canonical] = SKILL_CATEGORY[canonical]

    # 2. Phrase-level matching — scan raw lowercased text for multi-word aliases
    for alias, canonical in SKILL_LOOKUP.items():
        if " " in alias or "/" in alias or "." in alias:
            if alias in text_lower:
                found[canonical] = SKILL_CATEGORY[canonical]

    return [{"skill_name": k, "skill_category": v} for k, v in found.items()]
    