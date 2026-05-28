"""
Dispatch parse_syllabus Celery tasks for syllabus_documents rows.

By default this re-parses only the rows that haven't been processed yet
(is_processed = false). Use --all to re-parse everything (useful after the
parser logic changes and you want existing rows refreshed). Use --course to
target a single course by code.

Usage (from /backend):
    uv run python -m app.scripts.trigger_syllabus_parse
    uv run python -m app.scripts.trigger_syllabus_parse --all
    uv run python -m app.scripts.trigger_syllabus_parse --course TIU-UCS-T201
    uv run python -m app.scripts.trigger_syllabus_parse --status placeholder

Start a worker in another shell to actually run the tasks:
    uv run celery -A app.core.celery_app worker --pool=solo -Q nlp --loglevel=info
"""

import argparse
import asyncio
import re
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent
for p in (str(BACKEND_DIR), str(REPO_ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from sqlalchemy import select  # noqa: E402

from app.core.database import AsyncSessionLocal  # noqa: E402
from app.models.course import Course, SyllabusDocument  # noqa: E402


def _normalize_code(s: str | None) -> str:
    if not s:
        return ""
    return re.sub(r"[\s\-_.]", "", s).upper()


async def trigger(all_rows: bool, course_code: str | None, status: str | None) -> int:
    async with AsyncSessionLocal() as db:
        stmt = select(SyllabusDocument.id, SyllabusDocument.course_id,
                      SyllabusDocument.is_processed, SyllabusDocument.parsed_structure)

        if course_code:
            # Resolve course_code → course_id, then filter
            course_row = await db.execute(
                select(Course).where(
                    Course.course_code.ilike(course_code.strip())
                )
            )
            course = course_row.scalar_one_or_none()
            if course is None:
                # Try normalized match as a fallback
                all_courses = await db.execute(select(Course))
                wanted = _normalize_code(course_code)
                for c in all_courses.scalars().all():
                    if _normalize_code(c.course_code) == wanted:
                        course = c
                        break
            if course is None:
                print(f"[ERROR] no course found for code {course_code!r}")
                return 1
            stmt = stmt.where(SyllabusDocument.course_id == course.id)
        elif not all_rows:
            # Default: only unparsed rows
            stmt = stmt.where(SyllabusDocument.is_processed.is_(False))

        rows = (await db.execute(stmt)).all()

        # Optional status filter — applied client-side because parse_status
        # lives inside the JSONB column.
        if status:
            rows = [r for r in rows if (r.parsed_structure or {}).get("parse_status") == status]

        if not rows:
            print("Nothing to dispatch.")
            return 0

        from app.core.celery_app import celery_app

        dispatched = 0
        failed = 0
        for r in rows:
            try:
                celery_app.send_task("nlp_engine.tasks.parse_syllabus", args=[str(r.id)])
                dispatched += 1
            except Exception as exc:
                failed += 1
                print(f"  [warn] dispatch failed for {r.id}: {exc}")

        scope = "all rows" if all_rows else (
            f"course {course_code}" if course_code else "unparsed rows"
        )
        if status:
            scope += f" with parse_status={status!r}"
        print(f"Dispatched {dispatched} parse_syllabus tasks ({scope})")
        if failed:
            print(f"  {failed} dispatch failures — check Redis connectivity")
        print(
            "\nStart the worker to actually process them:\n"
            "    uv run celery -A app.core.celery_app worker "
            "--pool=solo -Q nlp --loglevel=info"
        )
    return 0


def parse_args():
    p = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    g = p.add_mutually_exclusive_group()
    g.add_argument("--all", dest="all_rows", action="store_true",
                   help="Re-parse every syllabus_documents row, even ones already processed")
    g.add_argument("--course", dest="course_code", metavar="CODE",
                   help="Re-parse a single course by code (e.g. TIU-UCS-T201)")
    p.add_argument("--status", choices=["ok", "placeholder", "empty"],
                   help="Only target rows whose parsed_structure.parse_status matches "
                        "(applied after --all / --course / default filter)")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    sys.exit(asyncio.run(trigger(
        all_rows=args.all_rows,
        course_code=args.course_code,
        status=args.status,
    )))
