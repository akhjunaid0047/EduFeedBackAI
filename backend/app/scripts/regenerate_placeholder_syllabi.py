"""
Backfill placeholder syllabi from the master B_Tech_CSE.pdf.

The TIU corpus in `syllabi/` contains 17 "placeholder" PDFs that just say the
detailed syllabus wasn't found. The repo-root B_Tech_CSE.pdf is a 180-page
master that includes the detail for most of them. This script:

  1. Extracts every per-course section from the master, keyed by Subject Code.
  2. For each placeholder PDF in `syllabi/`, looks up the matching section and
     re-renders the extracted text as a clean single-course PDF with the same
     filename (overwriting the placeholder).
  3. Reports which placeholders had no matching section in the master so the
     user knows to source them elsewhere.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

# Repo root: backend/app/scripts/this.py → backend/app/scripts → backend/app → backend → repo
REPO_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(REPO_ROOT / "backend"))

import pdfplumber
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer


MASTER_PDF = REPO_ROOT / "B_Tech_CSE.pdf"
SYLLABI_DIR = REPO_ROOT / "syllabi"

# Matches the per-course detail-section start. We use "Subject Code:" rather
# than "Course Code:" because the master uses the former at the top of each
# detail block (the latter only appears in cover/TOC pages).
SUBJECT_CODE_RE = re.compile(
    r"Subject\s+Code\s*:\s*(?P<code>[A-Z][A-Z0-9._\-]{3,40})",
    re.IGNORECASE,
)

# Encoding gotchas: pdfplumber returns text with arbitrary Unicode for things
# like en/em dashes and curly quotes. reportlab's default Helvetica handles
# Latin-1 just fine but chokes on a few — normalize the most common ones.
_UNICODE_FIXES = {
    "‘": "'", "’": "'", "“": '"', "”": '"',
    "–": "-", "—": "-", "−": "-",
    " ": " ", "•": "*", "": "*",
    # pdfplumber's "unknown char" replacement appears as � or � (U+FFFD)
    "�": "-",
}


def _normalize_unicode(s: str) -> str:
    for k, v in _UNICODE_FIXES.items():
        s = s.replace(k, v)
    # Drop any remaining non-ASCII (BERT and reportlab both happier with ASCII)
    return s.encode("ascii", "ignore").decode("ascii")


def _read_master_pages() -> list[str]:
    with pdfplumber.open(str(MASTER_PDF)) as pdf:
        return [(p.extract_text() or "") for p in pdf.pages]


def _build_section_index(pages: list[str]) -> dict[str, str]:
    """
    Walk the master page-by-page, locate every `Subject Code: X` boundary,
    and slice the document into per-course sections. Returns {code -> text}.
    """
    full = "\n\n".join(pages)
    matches = list(SUBJECT_CODE_RE.finditer(full))
    sections: dict[str, str] = {}
    for i, m in enumerate(matches):
        code = m.group("code").upper()
        # Section starts a bit BEFORE "Subject Code:" so we keep the course
        # title/header that precedes it. We back up to the nearest blank line
        # OR ~400 chars, whichever is closer.
        start = max(0, m.start() - 400)
        nl = full.rfind("\n\n", start, m.start())
        if nl != -1:
            start = nl + 2
        end = matches[i + 1].start() - 400 if i + 1 < len(matches) else len(full)
        end = max(end, m.end())
        section = full[start:end]
        # If multiple Subject Code lines pointed at the same course, prefer the
        # longest extracted slice (more complete).
        prev = sections.get(code)
        if prev is None or len(section) > len(prev):
            sections[code] = section
    return sections


def _code_from_filename(name: str) -> str | None:
    """`TIU_UCS_T201_DATA...pdf` → `TIU-UCS-T201`."""
    m = re.match(r"(TIU_[A-Z]+_[A-Z]?\d+[A-Z]?)", name)
    return m.group(1).replace("_", "-").upper() if m else None


def _render_pdf(out_path: Path, course_code: str, section_text: str) -> None:
    """Render the extracted section as a single-course PDF the parser can read."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(out_path), pagesize=A4,
        topMargin=2 * cm, bottomMargin=2 * cm,
        leftMargin=2 * cm, rightMargin=2 * cm,
        title=course_code,
    )
    styles = getSampleStyleSheet()
    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"], fontName="Helvetica",
        fontSize=10, leading=13, spaceAfter=4,
    )
    header_style = ParagraphStyle(
        "Heading", parent=styles["Heading2"], fontName="Helvetica-Bold",
        fontSize=12, leading=15, spaceBefore=8, spaceAfter=4,
    )

    story = []
    for raw_line in section_text.split("\n"):
        line = _normalize_unicode(raw_line.strip())
        if not line:
            story.append(Spacer(1, 4))
            continue
        # Escape minimal XML chars that reportlab Paragraph treats as markup
        safe = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        # Treat MODULE/UNIT/CHAPTER/COURSE-* lines as headings so the rendered
        # PDF visually mirrors the master and the parser still picks them up.
        if re.match(
            r"(?i)^(module|unit|chapter|section)\s*\d|"
            r"^(course\s+(objective|outcome|content)s?\s*:?)$",
            line,
        ):
            story.append(Paragraph(safe, header_style))
        else:
            story.append(Paragraph(safe, body_style))
    doc.build(story)


def main() -> int:
    if not MASTER_PDF.exists():
        print(f"ERROR: master PDF not found at {MASTER_PDF}", file=sys.stderr)
        return 1
    if not SYLLABI_DIR.exists():
        print(f"ERROR: syllabi dir not found at {SYLLABI_DIR}", file=sys.stderr)
        return 1

    print("Reading master PDF…")
    pages = _read_master_pages()
    print(f"  {len(pages)} pages")

    sections = _build_section_index(pages)
    print(f"  indexed {len(sections)} per-course sections")

    # We need to know which placeholder files exist. Detect via the parser.
    from nlp_engine.syllabus_parser import parse_pdf  # noqa: E402

    placeholders: list[tuple[Path, str | None]] = []
    for f in sorted(SYLLABI_DIR.iterdir()):
        if f.suffix.lower() != ".pdf":
            continue
        code = _code_from_filename(f.name)
        result = parse_pdf(str(f), expected_course_code=code)
        if result.get("parse_status") == "placeholder":
            placeholders.append((f, code))

    print(f"\nFound {len(placeholders)} placeholder PDFs to backfill")

    regenerated: list[str] = []
    missing_in_master: list[str] = []
    for path, code in placeholders:
        if code is None:
            missing_in_master.append(path.name + "  (could not extract code from filename)")
            continue
        section = sections.get(code.upper())
        if section is None:
            missing_in_master.append(f"{path.name}  (code {code} not in master)")
            continue
        _render_pdf(path, code, section)
        regenerated.append(f"{path.name}  ({len(section)} chars)")

    print(f"\nRegenerated: {len(regenerated)}")
    for r in regenerated:
        print(f"  + {r}")
    print(f"\nCould not regenerate: {len(missing_in_master)}")
    for m in missing_in_master:
        print(f"  - {m}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
