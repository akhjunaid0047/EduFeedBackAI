"""
Seed syllabus_documents from the repo's syllabi/ folder.

For each PDF in syllabi/:
  1. Extract the course code from the filename (TIU_UCS_T201_… → TIU-UCS-T201).
  2. Look up the matching Course row by normalized course_code.
  3. Copy the PDF into UPLOAD_DIR with a UUID prefix (mirroring the runtime
     upload flow in syllabus_service.upload_syllabus).
  4. Insert a SyllabusDocument row pointing at the copy.
  5. Dispatch the parse_syllabus Celery task so the new parser populates
     parsed_text / parsed_structure (skip with --no-parse).

Idempotent: PDFs whose course already has a SyllabusDocument are skipped
unless --clear is passed (which wipes all SyllabusDocument rows first).

Usage (run from /backend):
    uv run python -m app.scripts.seed_syllabi
    uv run python -m app.scripts.seed_syllabi --clear
    uv run python -m app.scripts.seed_syllabi --no-parse
    uv run python -m app.scripts.seed_syllabi --skip-placeholders   # don't seed
                                                                      # the 6 PDFs
                                                                      # we couldn't
                                                                      # backfill
"""

import argparse
import asyncio
import os
import re
import shutil
import sys
import uuid
from pathlib import Path

# Both backend/ and repo root on sys.path so `from app.…` and `from nlp_engine.…`
# resolve regardless of cwd.
BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent
for p in (str(BACKEND_DIR), str(REPO_ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from sqlalchemy import select  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import AsyncSessionLocal  # noqa: E402
from app.models.course import Course, SyllabusDocument  # noqa: E402


SYLLABI_DIR = REPO_ROOT / "syllabi"


def _normalize_code(s: str | None) -> str:
    if not s:
        return ""
    return re.sub(r"[\s\-_.]", "", s).upper()


def _code_from_filename(name: str) -> str | None:
    """`TIU_UCS_T201_DATA_STRUCTURE…pdf` → `TIU-UCS-T201`."""
    m = re.match(r"(TIU_[A-Z]+_[A-Z]?\d+[A-Z]?)", name)
    return m.group(1).replace("_", "-").upper() if m else None


async def _build_course_index(db: AsyncSession) -> dict[str, Course]:
    """Return {normalized_code: Course} for every course in the DB."""
    result = await db.execute(select(Course))
    return {_normalize_code(c.course_code): c for c in result.scalars().all()}


async def _existing_syllabus_course_ids(db: AsyncSession) -> set[str]:
    """course_id strings that already have a SyllabusDocument."""
    result = await db.execute(select(SyllabusDocument.course_id))
    return {str(r[0]) for r in result.all()}


async def _clear_syllabi(db: AsyncSession) -> int:
    result = await db.execute(select(SyllabusDocument))
    docs = result.scalars().all()
    for d in docs:
        # Best-effort: also delete the copied PDF on disk. We do NOT touch the
        # source in syllabi/ — only the uploads/ copy.
        try:
            if d.original_file_path and os.path.exists(d.original_file_path):
                # Only delete if inside UPLOAD_DIR, to avoid wiping the source.
                if os.path.abspath(d.original_file_path).startswith(
                    os.path.abspath(settings.UPLOAD_DIR)
                ):
                    os.remove(d.original_file_path)
        except OSError:
            pass
        await db.delete(d)
    await db.flush()
    return len(docs)


def _is_placeholder_pdf(path: Path) -> bool:
    """Cheap pre-check using the parser so we can decide whether to seed."""
    from nlp_engine.syllabus_parser import parse_pdf

    code = _code_from_filename(path.name)
    res = parse_pdf(str(path), expected_course_code=code)
    return res.get("parse_status") == "placeholder"


async def seed(clear: bool, no_parse: bool, skip_placeholders: bool) -> int:
    if not SYLLABI_DIR.exists():
        print(f"[ERROR] syllabi/ dir not found at {SYLLABI_DIR}")
        return 1

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    async with AsyncSessionLocal() as db:
        try:
            if clear:
                n = await _clear_syllabi(db)
                print(f"[clear] removed {n} existing SyllabusDocument rows\n")

            courses_by_code = await _build_course_index(db)
            already_seeded = await _existing_syllabus_course_ids(db)

            inserted_ids: list[str] = []
            skipped_existing = 0
            skipped_placeholder = 0
            unmatched: list[str] = []

            for pdf in sorted(SYLLABI_DIR.iterdir()):
                if pdf.suffix.lower() != ".pdf":
                    continue
                code = _code_from_filename(pdf.name)
                if not code:
                    unmatched.append(f"{pdf.name}  (no course code in filename)")
                    continue

                course = courses_by_code.get(_normalize_code(code))
                if course is None:
                    unmatched.append(f"{pdf.name}  (course {code} not in DB)")
                    continue

                if str(course.id) in already_seeded:
                    skipped_existing += 1
                    continue

                if skip_placeholders and _is_placeholder_pdf(pdf):
                    skipped_placeholder += 1
                    continue

                # Copy file into uploads/ with the same UUID-prefix scheme the
                # API uses, so production lookups stay consistent.
                copy_name = f"{uuid.uuid4()}_{pdf.name}"
                copy_path = os.path.join(settings.UPLOAD_DIR, copy_name)
                shutil.copy2(pdf, copy_path)

                doc = SyllabusDocument(
                    id=uuid.uuid4(),
                    course_id=course.id,
                    academic_year=None,
                    original_file_path=copy_path,
                    is_processed=False,
                    uploaded_by=None,
                )
                db.add(doc)
                inserted_ids.append(str(doc.id))
                already_seeded.add(str(course.id))

            await db.commit()

            print(f"Inserted SyllabusDocuments: {len(inserted_ids)}")
            print(f"Skipped (already seeded):  {skipped_existing}")
            if skip_placeholders:
                print(f"Skipped (placeholder PDF): {skipped_placeholder}")
            print(f"Unmatched PDFs:            {len(unmatched)}")
            for u in unmatched:
                print(f"  - {u}")

            if not no_parse:
                # Dispatch parse_syllabus for every still-unparsed row, not
                # just the ones inserted this run. Makes the script safe to
                # re-run when a previous pass was --no-parse or the worker
                # was offline.
                pending = await db.execute(
                    select(SyllabusDocument.id).where(
                        SyllabusDocument.is_processed.is_(False)
                    )
                )
                pending_ids = [str(r[0]) for r in pending.all()]

                from app.core.celery_app import celery_app

                dispatched = 0
                for sid in pending_ids:
                    try:
                        celery_app.send_task(
                            "nlp_engine.tasks.parse_syllabus", args=[sid]
                        )
                        dispatched += 1
                    except Exception as exc:
                        print(f"  [warn] dispatch failed for {sid}: {exc}")
                print(f"\nDispatched parse_syllabus tasks: {dispatched} "
                      f"(unparsed rows in DB)")
                if dispatched:
                    print(
                        "Start the worker to actually process them:\n"
                        "    uv run celery -A app.core.celery_app worker "
                        "--pool=solo -Q nlp --loglevel=info"
                    )

        except Exception:
            await db.rollback()
            raise

    return 0


def parse_args():
    p = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    p.add_argument("--clear", action="store_true",
                   help="Delete existing SyllabusDocument rows (and their uploads/ copies) first")
    p.add_argument("--no-parse", action="store_true",
                   help="Insert rows only — do NOT dispatch parse_syllabus tasks")
    p.add_argument("--skip-placeholders", action="store_true",
                   help="Skip the 6 PDFs that the parser tags as placeholder")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    sys.exit(asyncio.run(seed(
        clear=args.clear,
        no_parse=args.no_parse,
        skip_placeholders=args.skip_placeholders,
    )))
