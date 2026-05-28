"""
Flexible syllabus PDF parser.

Designed for the TIU corpus but tolerant of other formats. Handles:
  - Multi-course bundles (PDF contains several Subject Code: sections) by
    slicing the document at course-code boundaries and keeping only the one
    matching the caller-provided code.
  - Placeholder PDFs ("Detailed syllabus was not found...") — flagged with
    parse_status='placeholder' so downstream analytics can skip them instead
    of feeding garbage into BERT.
  - Multiple section vocabularies (MODULE/UNIT/CHAPTER/SECTION/PART/LESSON/
    WEEK/TOPIC), arabic OR roman numbering, and several separators.
  - PDF line wrapping — body lines under each module are joined and then
    re-split at logical sentence boundaries instead of treating each wrapped
    line as a separate topic.
  - Course Outcomes (CO-1..CO-N) embedded mid-paragraph, with Bloom-level
    annotations (K1..K6) interleaved.

Top-level entry point: `parse_pdf(path, expected_course_code=None) -> dict`.

Returned shape (stored as JSONB in syllabus_documents.parsed_structure):
    {
      "parse_status": "ok" | "placeholder" | "empty",
      "course_code": str | None,           # whichever was actually parsed
      "placeholder_reason": str (optional),
      "raw_text_chars": int,               # diagnostic
      "units": [
        {"title": str, "topics": [str, ...], "objectives": [str, ...]}
      ]
    }
"""
from __future__ import annotations

import os
import re
from typing import Optional

# ── Section header detection ────────────────────────────────────────────
# Recognised header keywords. Easy to extend.
_HEADER_KINDS = r"unit|module|chapter|section|part|lesson|week|topic"

# Header line: KIND <num> [: or - or .] <title>
# Examples matched:
#   "MODULE 1: Fundamentals of DSA 6 Hours"
#   "Unit II — Introduction"
#   "Chapter 3. Functions"
#   "WEEK 4 Trees"
#   "Section IV"
_SECTION_HEADER_RE = re.compile(
    rf"^\s*(?P<kind>{_HEADER_KINDS})\s*"
    r"(?:[-–:.]?\s*)"
    r"(?P<num>\d+|[IVXLCDM]+)"
    r"\b[\s:\-–.]*"
    r"(?P<title>.*)$",
    re.IGNORECASE,
)

# Only headers in this set start a NEW unit. The others (topic/week) are kept
# in the regex for flexibility but treated as module-level only when the
# corpus uses them as the primary structural marker.
_UNIT_KIND_PRIMARY = {"unit", "module", "chapter", "section", "part", "week"}


# ── Noise / footer lines to skip outright ──────────────────────────────
_NOISE_PATTERNS = [
    r"^total\s+lectures?\b",
    r"^total\s+hours?\b",
    r"^source\s*[:\-]",
    r"^books?\s*:",
    r"^references?\s*:",
    r"^(text|reference)\s*book",
    r"^isbn[-: ]",
    r"^\d+\s*hours?\s*$",
    r"^page\s*\d+",
    r"^\d{1,4}$",                    # standalone page/footer number
    r"^course\s+(objective|outcome|content)s?\s*:",
    r"^contact\s+hours",
    r"^pre-?requisites?\s*:",
    r"^techno\s+india\s+university",
    r"^department\s+of",
    r"^(semester|credit)s?\s*:",
    r"^(course\s+)?(title|code)\s*:",
    r"^program\s*:",
    r"^subject\s+(name|code)\s*:",
    r"^contact\s+hours?/week",
]
_NOISE_RE = re.compile("|".join(_NOISE_PATTERNS), re.IGNORECASE)


# Cleans trailing "N Hours", "Credit: 3", etc. from titles
_TRAILING_HOURS_RE = re.compile(
    r"\s*(?:\d+\s*hours?|credit\s*:?\s*\d+|\d+\s*credits?)\s*$",
    re.IGNORECASE,
)
# Trailing 1-3 digit number (page number that bled into a topic)
_TRAILING_PAGENUM_RE = re.compile(r"\s+\d{1,4}\s*$")


# ── Course code splitting (multi-course bundles) ───────────────────────
# Match either "Subject Code:" or "Course Code:" followed by a course code.
# Course codes in this corpus look like TIU-UCS-T201 or TIU_UCS_T201; we
# accept letters, digits, hyphens, underscores, dots, and at least 4 chars.
_CODE_BOUNDARY_RE = re.compile(
    r"(?:Subject|Course)\s+Code\s*:\s*([A-Z][A-Z0-9._\-]{3,40})",
    re.IGNORECASE,
)


def _normalize_code(s: Optional[str]) -> str:
    """Strip hyphens/underscores/spaces and uppercase, so TIU-UCS-T201 == tiu_ucs_t201."""
    if not s:
        return ""
    return re.sub(r"[\s\-_.]", "", s).upper()


# ── Placeholder detection ──────────────────────────────────────────────
_PLACEHOLDER_PATTERNS = [
    r"detailed\s+syllabus.*was\s+not\s+found",
    r"syllabus\s+is\s+maintained\s+separately",
    r"complete\s+syllabus.*contact\s+the\s+department",
    r"contact\s+the\s+department.*complete\s+syllabus",
    r"syllabus\s+(to\s+be|will\s+be)\s+(announced|provided|updated)",
    r"\btbd\b",
    r"\bto\s+be\s+(announced|decided)\b",
]
_PLACEHOLDER_RE = re.compile("|".join(_PLACEHOLDER_PATTERNS), re.IGNORECASE)


def _placeholder_reason(text: str) -> Optional[str]:
    m = _PLACEHOLDER_RE.search(text)
    if not m:
        return None
    snippet = text[max(0, m.start() - 20): m.end() + 80]
    return re.sub(r"\s+", " ", snippet).strip()


# ── PDF text extraction ────────────────────────────────────────────────
def _extract_text(path: str) -> str:
    import pdfplumber

    parts: list[str] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            t = page.extract_text() or ""
            parts.append(t)
    return "\n".join(parts)


# ── Section slicing for multi-course bundles ───────────────────────────
def _split_by_course_code(text: str, expected_code: Optional[str]) -> tuple[Optional[str], str]:
    """
    Return (matched_code, slice_of_text_for_that_course).
    If only one code is found, return the whole text.
    If multiple codes are found and `expected_code` matches one, return that slice.
    If multiple codes are found and none match, return the first slice — the
    PDF is named after its primary course, and the primary course almost
    always appears first.
    """
    matches = list(_CODE_BOUNDARY_RE.finditer(text))
    if len(matches) <= 1:
        code = matches[0].group(1) if matches else None
        return code, text

    # Build sections: each starts at a code boundary and ends at the next.
    sections: list[tuple[str, str]] = []
    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        sections.append((m.group(1).strip(), text[start:end]))

    if expected_code:
        wanted = _normalize_code(expected_code)
        # Keep all sections whose code contains/matches the expected code.
        # Use 'in' (substring) so partial matches (e.g. TIU-UCS-T201 vs T201)
        # still hit.
        matching = [s for s in sections if wanted and wanted in _normalize_code(s[0])]
        if matching:
            # Concatenate matching sections (rare but possible if same course
            # has multiple Subject Code: headers in its preamble).
            return matching[0][0], "\n".join(s[1] for s in matching)

    return sections[0]


# ── Title cleanup ──────────────────────────────────────────────────────
def _clean_title(t: str) -> str:
    t = _TRAILING_HOURS_RE.sub("", t).strip()
    t = re.sub(r"[\s\-:.]+$", "", t).strip()
    return t


# ── Body → topic list ──────────────────────────────────────────────────
def _split_into_topics(body: str) -> list[str]:
    """
    Reassemble a wrapped-paragraph body into logical topics.

    Strategy: collapse all whitespace to single spaces, strip a trailing page
    number, then split at sentence boundaries — "<punct><space><Capital>" — or
    at semicolons. Pieces shorter than 8 chars are dropped (likely fragments).
    """
    text = re.sub(r"\s+", " ", body).strip()
    text = _TRAILING_PAGENUM_RE.sub("", text)
    if not text:
        return []
    # Split at sentence boundary (preferred) OR semicolon
    pieces = re.split(r"(?<=[.!?])\s+(?=[A-Z])|\s*;\s+(?=[A-Z])", text)
    out: list[str] = []
    for p in pieces:
        p = p.strip().strip(".,;:")
        # Drop terminal "N Hours" / page-number bleed
        p = _TRAILING_HOURS_RE.sub("", p).strip()
        p = _TRAILING_PAGENUM_RE.sub("", p).strip()
        if len(p) >= 8:
            out.append(p[:400])
    return out


# ── Module discovery ───────────────────────────────────────────────────
def _parse_modules(text: str) -> list[dict]:
    """
    Walk lines; whenever a new module header appears, start a new unit and
    accumulate subsequent non-noise lines as the body. At the end, split each
    body into logical topics.
    """
    # If a COURSE CONTENT: block is present, narrow to it so we skip the
    # header/objectives prelude. Otherwise scan the whole text.
    cc_match = re.search(r"COURSE\s*CONTENT\s*:?\s*\n", text, re.IGNORECASE)
    body_start = cc_match.end() if cc_match else 0
    body = text[body_start:]

    units: list[dict] = []
    current_title: Optional[str] = None
    current_body_lines: list[str] = []

    def flush():
        nonlocal current_title, current_body_lines
        if current_title is None and not current_body_lines:
            return
        topics = _split_into_topics(" ".join(current_body_lines))
        units.append({
            "title": current_title or "Course Content",
            "topics": topics,
            "objectives": [],
        })
        current_title = None
        current_body_lines = []

    for raw_line in body.split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        m = _SECTION_HEADER_RE.match(line)
        if m and m.group("kind").lower() in _UNIT_KIND_PRIMARY:
            flush()
            kind = m.group("kind").upper()
            num = m.group("num")
            title_tail = _clean_title(m.group("title") or "")
            current_title = f"{kind} {num}: {title_tail}".rstrip(": ").strip()
            continue
        if _NOISE_RE.search(line):
            continue
        current_body_lines.append(line)

    flush()
    return units


# ── Course Outcome (CO-N) extraction ───────────────────────────────────
def _parse_objectives(text: str) -> list[str]:
    """
    Find the COURSE OUTCOME block, then locate every "CO-N" (or "CON:") tag
    anywhere inside it. Slice the body between consecutive tags as the body
    of the i-th outcome, strip Bloom-level (K1..K6) annotations.
    """
    block_match = re.search(
        r"COURSE\s*OUTCOME\s*:?\s*(.*?)(?:COURSE\s*CONTENT|^\s*MODULE\s+\d|^\s*UNIT\s+\d|\Z)",
        text, re.IGNORECASE | re.DOTALL | re.MULTILINE,
    )
    if not block_match:
        return []
    block = block_match.group(1)

    tag_re = re.compile(r"\bCO\s*[-]?\s*(\d{1,2})\b\s*:?", re.IGNORECASE)
    tags = list(tag_re.finditer(block))
    if len(tags) < 2:
        return []

    out: list[str] = []
    for i, tag in enumerate(tags):
        num = tag.group(1)
        start = tag.end()
        end = tags[i + 1].start() if i + 1 < len(tags) else len(block)
        body = block[start:end]
        # Strip Bloom levels (K1..K6) — they're metadata, not content.
        body = re.sub(r"\bK\s*\d\b", "", body)
        body = re.sub(r"\s+", " ", body).strip().strip(".,;:")
        if len(body) >= 5:
            out.append(f"CO-{num}: {body[:250]}")
    return out


# ── Distribute objectives across detected modules ──────────────────────
def _attach_objectives(units: list[dict], objectives: list[str]) -> None:
    """
    The PDFs in this corpus don't pin objectives to specific modules, so we
    attach the full list to the first unit. Downstream consumers that care
    about per-module mapping can re-bucket from there. Mutates in place.
    """
    if objectives and units:
        units[0]["objectives"] = objectives


# ── Fallback when no headers detected ──────────────────────────────────
def _fallback_units(text: str) -> list[dict]:
    """No MODULE/UNIT markers found — split the whole text into topics."""
    topics = _split_into_topics(text)
    if not topics:
        return []
    return [{"title": "Course Content", "topics": topics[:80], "objectives": []}]


# ── Public entry point ─────────────────────────────────────────────────
def parse_pdf(path: str, expected_course_code: Optional[str] = None) -> dict:
    """
    Parse a syllabus PDF.

    `expected_course_code` lets us pick the right section out of a multi-course
    bundle. When omitted, the first section is used.
    """
    if not os.path.exists(path):
        return {"parse_status": "empty", "units": [], "course_code": None,
                "placeholder_reason": f"file not found: {path}",
                "raw_text_chars": 0}

    raw = _extract_text(path)
    if not raw.strip():
        return {"parse_status": "empty", "units": [], "course_code": None,
                "raw_text_chars": 0}

    placeholder = _placeholder_reason(raw)
    if placeholder:
        # Still record any course code we can see so the consumer knows which
        # course was un-parseable.
        first_code_match = _CODE_BOUNDARY_RE.search(raw)
        return {
            "parse_status": "placeholder",
            "placeholder_reason": placeholder,
            "course_code": first_code_match.group(1) if first_code_match else None,
            "units": [],
            "raw_text_chars": len(raw),
        }

    matched_code, section_text = _split_by_course_code(raw, expected_course_code)
    units = _parse_modules(section_text)
    if not units:
        units = _fallback_units(section_text)
    objectives = _parse_objectives(section_text)
    _attach_objectives(units, objectives)

    status = "ok" if any(u["topics"] for u in units) else "empty"
    return {
        "parse_status": status,
        "course_code": matched_code,
        "units": units,
        "raw_text_chars": len(raw),
    }
