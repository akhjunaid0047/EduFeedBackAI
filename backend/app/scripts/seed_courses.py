"""
Seed courses data from CSV into the database.

Usage (run from the /backend directory):
    uv run python -m app.scripts.seed_courses
    uv run python -m app.scripts.seed_courses --csv path/to/file.csv
    uv run python -m app.scripts.seed_courses --clear   # wipe existing data first
"""

import argparse
import asyncio
import uuid
import sys
from pathlib import Path

import pandas as pd
from sqlalchemy import select

# ── resolve project root so the script works from any cwd ──────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[3]   
REPO_ROOT    = PROJECT_ROOT

# the requested file is in the repo root
DEFAULT_CSV  = REPO_ROOT / "sem2.csv"

# ── app imports ───────────────────────────────────────────────────────────────
from app.core.database import AsyncSessionLocal
from app.models.course import Course


def _safe_str(val) -> str | None:
    if val is None:
        return None
    if isinstance(val, float) and pd.isna(val):
        return None
    s = str(val).strip()
    return s if s and s.lower() != "nan" else None


def _safe_int(val) -> int | None:
    try:
        if pd.isna(val):
            return None
        # Convert float to int, rounding it (e.g. 1.5 -> 2)
        return int(round(float(val)))
    except (TypeError, ValueError):
        return None


async def clear_data(db):
    """Delete all course records."""
    print("⚠️  Clearing existing course data …")
    course_result = await db.execute(select(Course))
    for c in course_result.scalars().all():
        await db.delete(c)

    await db.flush()
    print("   Done clearing.\n")


async def seed_courses(csv_path: Path, clear: bool = False):
    if not csv_path.exists():
        print(f"❌ CSV not found: {csv_path}")
        print(f"   Pass --csv <path> to specify the file location.")
        sys.exit(1)

    print(f"📄 Reading CSV: {csv_path}")
    df = pd.read_csv(csv_path)
    print(f"   {len(df)} rows loaded.\n")

    async with AsyncSessionLocal() as db:
        try:
            if clear:
                await clear_data(db)

            ok = skipped = errors = 0

            for index, row in df.iterrows():
                course_code = _safe_str(row.get("course_code"))
                if not course_code:
                    errors += 1
                    print(f"   ⚠️  Row {index}: Missing course_code, skipping.")
                    continue
                
                try:
                    # Check if already exists
                    existing_course = await db.execute(
                        select(Course).filter(Course.course_code == course_code)
                    )
                    if existing_course.scalars().first():
                        skipped += 1
                        continue
                    
                    course_name = _safe_str(row.get("course_name")) or "Unknown"
                    semester = _safe_int(row.get("semester"))
                    credits_val = _safe_int(row.get("credits"))

                    course = Course(
                        id=uuid.uuid4(),
                        course_code=course_code,
                        course_name=course_name,
                        semester=semester,
                        credits=credits_val,
                        is_active=True,
                        department_id=None # Leaving null as not specified in CSV
                    )
                    
                    db.add(course)
                    ok += 1

                    # Flush periodically 
                    if ok % 20 == 0:
                        await db.flush()
                        print(f"   … {ok} inserted so far")

                except Exception as row_err:
                    errors += 1
                    print(f"   ⚠️  Row {index} ({course_code}): {row_err}")
                    continue

            await db.commit()
            print(f"\n✅ Seeding complete — {ok} inserted | {skipped} skipped | {errors} errors")

        except Exception as e:
            await db.rollback()
            print(f"\n❌ Fatal error, rolled back: {e}")
            raise


def parse_args():
    parser = argparse.ArgumentParser(description="Seed courses from a CSV file.")
    parser.add_argument(
        "--csv",
        type=Path,
        default=DEFAULT_CSV,
        help=f"Path to the CSV file (default: {DEFAULT_CSV})",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Delete all existing course records before seeding",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(seed_courses(csv_path=args.csv, clear=args.clear))
