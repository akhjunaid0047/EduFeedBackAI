"""
Bulk-upload syllabus PDFs from a folder into the database and dispatch parsing.

For each PDF in the folder, the script:
  1. Searches for a known course_code anywhere in the filename (case-insensitive,
     longest match wins so 'CS1011' is preferred over 'CS101').
  2. Copies the PDF into settings.UPLOAD_DIR with a uuid-prefixed name.
  3. Inserts a row in syllabus_documents (academic_year='2025-26' by default).
  4. Dispatches the parse_syllabus Celery task on the 'nlp' queue.

Usage (run from /backend):
    uv run python -m app.scripts.upload_syllabi
    uv run python -m app.scripts.upload_syllabi --folder ../syllabi
    uv run python -m app.scripts.upload_syllabi --academic-year 2024-25
    uv run python -m app.scripts.upload_syllabi --dry-run
    uv run python -m app.scripts.upload_syllabi --no-parse
"""

import argparse
import asyncio
import re
import shutil
import sys
import uuid
from pathlib import Path

# ── Make sure BOTH backend/ and the repo root are on sys.path ──────────────────
BACKEND_DIR = Path(__file__).resolve().parents[2]   # .../backend
PROJECT_ROOT = BACKEND_DIR.parent                   # .../edufeedbackai (repo root)
for p in (str(BACKEND_DIR), str(PROJECT_ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from sqlalchemy import select  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import AsyncSessionLocal  # noqa: E402
from app.models.course import Course, SyllabusDocument  # noqa: E402
from app.models.user import User  # noqa: E402


DEFAULT_FOLDER = PROJECT_ROOT / "syllabi"
DEFAULT_ACADEMIC_YEAR = "2025-26"


def _normalize(s: str) -> str:
    """Lower-case and treat '_' and '-' as the same separator.

    Filenames use underscores ('TIU_UCS_T201') while course_codes in the DB
    use hyphens ('TIU-UCS-T201'), so we canonicalize both sides before matching.
    """
    return re.sub(r"[-_]", "-", s).lower()


def match_course_code(filename: str, codes: list[str]) -> str | None:
    """Find the longest known course_code that appears in the filename.

    Match is case-insensitive, separator-insensitive ('_' == '-'), and bounded
    by non-alphanumeric chars so 'T101' does not spuriously match 'T1011'.
    """
    stem_norm = _normalize(Path(filename).stem)
    best: str | None = None
    for code in codes:
        code_norm = _normalize(code)
        pattern = rf"(?<![a-z0-9]){re.escape(code_norm)}(?![a-z0-9])"
        if re.search(pattern, stem_norm):
            if best is None or len(code_norm) > len(_normalize(best)):
                best = code
    return best


async def fetch_uploader_id(db) -> uuid.UUID | None:
    """Pick any admin/superadmin so uploaded_by is populated; null is fine too."""
    row = (await db.execute(
        select(User.id).where(User.role.in_(["admin", "superadmin"])).limit(1)
    )).first()
    return row[0] if row else None


async def upload_all(folder: Path, academic_year: str | None, dispatch_parse: bool, dry_run: bool):
    pdfs = sorted(p for p in folder.glob("*.pdf") if p.is_file())
    if not pdfs:
        print(f"❌ No PDFs found in {folder}")
        sys.exit(1)

    print(f"📂 Folder: {folder}")
    print(f"📄 Found {len(pdfs)} PDF(s)\n")

    async with AsyncSessionLocal() as db:
        # Load every course_code once so we can match offline.
        courses = (await db.execute(select(Course.id, Course.course_code))).all()
        if not courses:
            print("❌ No courses in DB. Run seed_courses first.")
            sys.exit(1)
        code_to_id: dict[str, uuid.UUID] = {c.course_code: c.id for c in courses}
        # Sort longest-first so the regex helper prefers the more specific code.
        codes_sorted = sorted(code_to_id.keys(), key=len, reverse=True)

        uploader_id = await fetch_uploader_id(db) if not dry_run else None

        if not dry_run:
            Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

        uploaded_ids: list[uuid.UUID] = []
        matched = unmatched = errors = 0

        for pdf in pdfs:
            code = match_course_code(pdf.name, codes_sorted)
            if not code:
                unmatched += 1
                print(f"  ⚠️  {pdf.name} — no matching course_code, skipping")
                continue

            course_id = code_to_id[code]
            if dry_run:
                matched += 1
                print(f"  [DRY] {pdf.name} → {code}")
                continue

            try:
                dest_name = f"{uuid.uuid4()}_{pdf.name}"
                dest_path = Path(settings.UPLOAD_DIR) / dest_name
                shutil.copyfile(pdf, dest_path)

                doc = SyllabusDocument(
                    id=uuid.uuid4(),
                    course_id=course_id,
                    academic_year=academic_year,
                    original_file_path=str(dest_path),
                    is_processed=False,
                    uploaded_by=uploader_id,
                )
                db.add(doc)
                await db.flush()
                uploaded_ids.append(doc.id)
                matched += 1
                print(f"  ✅ {pdf.name} → {code}  (doc {doc.id})")
            except Exception as e:
                errors += 1
                print(f"  ❌ {pdf.name}: {e}")

        if not dry_run:
            await db.commit()

    print(f"\nSummary: {matched} uploaded | {unmatched} unmatched | {errors} errors")

    if dispatch_parse and uploaded_ids and not dry_run:
        # Import after the session closes so Celery configures cleanly.
        from app.core.celery_app import celery_app  # noqa: F401
        print(f"\n🚀 Dispatching parse_syllabus for {len(uploaded_ids)} document(s)…")
        for sid in uploaded_ids:
            result = celery_app.send_task("nlp_engine.tasks.parse_syllabus", args=[str(sid)])
            print(f"  queued → {sid}  (task_id: {result.id})")
        print("\n   Make sure your Celery worker is running on the 'nlp' queue:")
        print("   uv run celery -A app.core.celery_app worker --pool=solo -Q nlp --loglevel=info")


def parse_args():
    p = argparse.ArgumentParser(description="Bulk-upload syllabus PDFs from a folder.")
    p.add_argument("--folder", type=Path, default=DEFAULT_FOLDER,
                   help=f"Folder containing PDFs (default: {DEFAULT_FOLDER})")
    p.add_argument("--academic-year", default=DEFAULT_ACADEMIC_YEAR,
                   help=f"Academic year tag (default: {DEFAULT_ACADEMIC_YEAR})")
    p.add_argument("--no-parse", action="store_true",
                   help="Skip dispatching the parse_syllabus Celery task")
    p.add_argument("--dry-run", action="store_true",
                   help="Show matches without copying files or writing to DB")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    if not args.folder.exists():
        print(f"❌ Folder does not exist: {args.folder}")
        sys.exit(1)
    asyncio.run(upload_all(
        folder=args.folder,
        academic_year=args.academic_year,
        dispatch_parse=not args.no_parse,
        dry_run=args.dry_run,
    ))
