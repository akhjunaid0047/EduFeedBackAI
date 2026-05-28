"""
Seed alumni data from CSV into the database.

Usage (run from the /backend directory):
    uv run python -m app.scripts.seed_alumni
    uv run python -m app.scripts.seed_alumni --csv path/to/file.csv
    uv run python -m app.scripts.seed_alumni --clear   # wipe existing data first
"""

import argparse
import asyncio
import uuid
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd
from sqlalchemy import select

# ── resolve project root so the script works from any cwd ──────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[3]   # backend/
REPO_ROOT    = PROJECT_ROOT                          # same as backend/../ = edufeedbackai/

DEFAULT_CSV  = REPO_ROOT / "alumni_realistic_100_entries.csv"

# ── app imports (must come after sys.path is correct) ─────────────────────────
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.alumni import (
    Alumni,
    GenderEnum,
    EmploymentStatusEnum,
    WorkModeEnum,
    PlacementTrainingEnum,
)
from app.models.department import Department
from app.models.user import User, UserRole

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _safe_str(val) -> str | None:
    """Return stripped string or None for NaN / empty values."""
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
        return int(float(val))
    except (TypeError, ValueError):
        return None


def _safe_bool(val) -> bool | None:
    s = _safe_str(val)
    if s is None:
        return None
    return s.lower() == "yes"


# Normalise raw CSV strings → enum members
_GENDER_MAP = {
    "male": GenderEnum.male,
    "female": GenderEnum.female,
    "other": GenderEnum.other,
    "prefer not to say": GenderEnum.prefer_not,
}

_EMPLOYMENT_MAP = {
    "employed": EmploymentStatusEnum.employed,
    "higher studies": EmploymentStatusEnum.higher_studies,
    "unemployed": EmploymentStatusEnum.unemployed,
    "self-employed": EmploymentStatusEnum.self_employed,
    "self employed": EmploymentStatusEnum.self_employed,
    "freelance": EmploymentStatusEnum.freelance,
}

_WORKMODE_MAP = {
    "remote": WorkModeEnum.remote,
    "on-site": WorkModeEnum.onsite,
    "onsite": WorkModeEnum.onsite,
    "hybrid": WorkModeEnum.hybrid,
}

_PLACEMENT_MAP = {
    "yes": PlacementTrainingEnum.yes,
    "no": PlacementTrainingEnum.no,
    "partially": PlacementTrainingEnum.partially,
}


def _map_enum(val, mapping: dict):
    s = _safe_str(val)
    if s is None:
        return None
    return mapping.get(s.lower())


def _parse_timestamp(val) -> datetime | None:
    s = _safe_str(val)
    if not s:
        return None
    try:
        # e.g. "2025/11/27 8:48:06 pm GMT+5:30"
        ts_str = s.split("GMT")[0].strip()
        return datetime.strptime(ts_str, "%Y/%m/%d %I:%M:%S %p")
    except ValueError:
        return None


def _dept_code(name: str) -> str:
    """Derive a short, unique-friendly dept code from the name."""
    return name.upper().replace(" ", "_").replace("/", "_")[:50]


# ──────────────────────────────────────────────────────────────────────────────
# Main seeding logic
# ──────────────────────────────────────────────────────────────────────────────

async def clear_data(db):
    """Delete all alumni, users (alumni role), departments seeded by this script."""
    print("⚠️  Clearing existing seeded data …")
    # Order matters: alumni → users → departments (FK constraints)
    alumni_result = await db.execute(select(Alumni))
    for a in alumni_result.scalars().all():
        await db.delete(a)

    user_result = await db.execute(select(User).filter(User.role == UserRole.alumni))
    for u in user_result.scalars().all():
        await db.delete(u)

    await db.flush()
    print("   Done clearing.\n")


async def seed_data(csv_path: Path, clear: bool = False):
    # ── read CSV ──────────────────────────────────────────────────────────────
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

            # Cache departments to avoid N+1 queries
            dept_cache: dict[str, Department] = {}

            ok = skipped = errors = 0

            for index, row in df.iterrows():
                full_name = _safe_str(row.get("Full Name")) or f"Alumni_{index}"

                try:
                    # ── 1. Department ─────────────────────────────────────────
                    dept_name = _safe_str(row.get("Department")) or "Unknown"
                    if dept_name not in dept_cache:
                        result = await db.execute(
                            select(Department).filter(Department.name == dept_name)
                        )
                        dept = result.scalars().first()
                        if not dept:
                            code = _dept_code(dept_name)
                            # Ensure code uniqueness (append counter if clash)
                            existing_codes = {d.code for d in dept_cache.values()}
                            base_code = code
                            counter = 1
                            while code in existing_codes:
                                code = f"{base_code}_{counter}"
                                counter += 1
                            dept = Department(id=uuid.uuid4(), name=dept_name, code=code)
                            db.add(dept)
                            await db.flush()
                        dept_cache[dept_name] = dept

                    dept = dept_cache[dept_name]

                    # ── 2. User (skip if email already exists) ────────────────
                    email_slug = full_name.lower().replace(" ", ".").replace("..", ".")
                    # Use a deterministic suffix based on row index so re-runs
                    # produce the same email (idempotent seeding).
                    suffix = uuid.uuid5(uuid.NAMESPACE_OID, f"seed-row-{index}").hex[:6]
                    email = f"{email_slug}.{suffix}@edufeedback.test"

                    existing_user = await db.execute(
                        select(User).filter(User.email == email)
                    )
                    if existing_user.scalars().first():
                        skipped += 1
                        continue   # already seeded

                    user = User(
                        id=uuid.uuid4(),
                        email=email,
                        full_name=full_name,
                        password_hash=hash_password("EduFeedback123!"),
                        role=UserRole.alumni,
                        department_id=dept.id,
                        is_active=True,
                    )
                    db.add(user)
                    await db.flush()

                    # ── 3. Alumni record ──────────────────────────────────────
                    alumni = Alumni(
                        id=uuid.uuid4(),
                        user_id=user.id,
                        gender=_map_enum(row.get("Gender"), _GENDER_MAP),
                        degree_program=_safe_str(row.get("Degree/Program")),
                        department=dept_name,
                        graduation_year=_safe_int(row.get("Graduation Year")),
                        employment_status=_map_enum(
                            row.get("Current Employment Status"), _EMPLOYMENT_MAP
                        ),
                        job_role_designation=_safe_str(row.get("Job Role / Designation")),
                        company_name=_safe_str(row.get("Company / Organization")),
                        industry_domain=_safe_str(row.get("Industry Domain")),
                        work_mode=_map_enum(row.get("Mode of Work"), _WORKMODE_MAP),
                        job_responsibilities=_safe_str(row.get("Job Responsibilities")),
                        tools_software=_safe_str(
                            row.get("Tools/Software used in current role")
                        ),
                        skills_helped_land_job=_safe_str(
                            row.get("Skills that helped u land the job")
                        ),
                        course_relevance_rating=_safe_int(
                            row.get("Relevance of college courses to your job (1–5)")
                        ),
                        unused_subjects=_safe_str(
                            row.get("Subjects you never used in your job")
                        ),
                        skills_missing_from_curriculum=_safe_str(
                            row.get("Skills you wish were taught during college")
                        ),
                        has_changed_jobs=_safe_bool(
                            row.get("Have you changed jobs after graduation?")
                        ),
                        previous_designations=_safe_str(
                            row.get("Previous designations")
                        ),
                        skills_acquired_after_graduation=_safe_str(
                            row.get("Skills acquired after graduation")
                        ),
                        certifications_completed=_safe_str(
                            row.get("Certifications completed")
                        ),
                        career_growth_satisfaction=_safe_int(
                            row.get("Career growth satisfaction (1 to 5 )")
                        ),
                        placement_preparation=_safe_str(
                            row.get("How did you prepare for your job placement?")
                        ),
                        helpful_platforms=_safe_str(
                            row.get("Most helpful platforms or resources")
                        ),
                        placement_training_helped=_map_enum(
                            row.get("Did the college placement training programs help?"),
                            _PLACEMENT_MAP,
                        ),
                        job_search_difficulties=_safe_str(
                            row.get("Difficulties faced while searching for job")
                        ),
                        suggestions_for_improvement=_safe_str(
                            row.get("Suggestions to improve student job readiness")
                        ),
                    )

                    # Timestamp
                    ts = _parse_timestamp(row.get("Timestamp"))
                    if ts:
                        alumni.submitted_at = ts

                    db.add(alumni)
                    ok += 1

                    # Flush every 20 rows to avoid huge in-memory transactions
                    if ok % 20 == 0:
                        await db.flush()
                        print(f"   … {ok} inserted so far")

                except Exception as row_err:
                    errors += 1
                    print(f"   ⚠️  Row {index} ({full_name}): {row_err}")
                    continue

            await db.commit()
            print(
                f"\n✅ Seeding complete — "
                f"{ok} inserted | {skipped} skipped (duplicate) | {errors} errors"
            )

        except Exception as e:
            await db.rollback()
            print(f"\n❌ Fatal error, rolled back: {e}")
            raise


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(
        description="Seed alumni data from a CSV file into the database."
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=DEFAULT_CSV,
        help=f"Path to the CSV file (default: {DEFAULT_CSV})",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Delete all existing alumni/user records before seeding",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(seed_data(csv_path=args.csv, clear=args.clear))
