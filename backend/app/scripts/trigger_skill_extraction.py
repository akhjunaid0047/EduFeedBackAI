"""
Dispatch Celery skill-extraction tasks for all alumni already in the database.

Usage (run from the /backend directory):
    uv run python -m app.scripts.trigger_skill_extraction
    uv run python -m app.scripts.trigger_skill_extraction --alumni-id <uuid>   # single alumni
    uv run python -m app.scripts.trigger_skill_extraction --dry-run            # list only, no dispatch
"""

import argparse
import asyncio
import sys
from pathlib import Path

# ── Make sure BOTH backend/ and the repo root are on the path ──────────────────
BACKEND_DIR  = Path(__file__).resolve().parents[2]   # .../backend
PROJECT_ROOT = BACKEND_DIR.parent                    # .../edufeedbackai (repo root)

for p in (str(BACKEND_DIR), str(PROJECT_ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

# ── App imports ────────────────────────────────────────────────────────────────
from app.core.database import AsyncSessionLocal      # noqa: E402
from sqlalchemy import text                          # noqa: E402


# ──────────────────────────────────────────────────────────────────────────────

async def get_alumni_ids(alumni_id: str | None) -> list[str]:
    """Fetch all alumni IDs from the DB (or just one if --alumni-id was given)."""
    async with AsyncSessionLocal() as db:
        if alumni_id:
            row = (await db.execute(
                text("SELECT id FROM alumni WHERE id = :id"),
                {"id": alumni_id},
            )).fetchone()
            if not row:
                print(f"❌ Alumni ID not found: {alumni_id}")
                sys.exit(1)
            return [str(row.id)]
        else:
            rows = (await db.execute(text("SELECT id FROM alumni ORDER BY id"))).fetchall()
            return [str(r.id) for r in rows]


def dispatch_tasks(alumni_ids: list[str], dry_run: bool) -> None:
    """Import Celery task and dispatch (or just print in dry-run mode)."""
    # Import here so the path fix above is already in effect
    from nlp_engine.tasks import extract_skills  # noqa: E402
    from app.core.celery_app import celery_app   # Initialize Celery config

    total = len(alumni_ids)
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Dispatching skill extraction for {total} alumni…\n")

    queued = 0
    for i, aid in enumerate(alumni_ids, 1):
        if dry_run:
            print(f"  [{i:>4}/{total}] would queue → {aid}")
        else:
            result = extract_skills.delay(aid)
            print(f"  [{i:>4}/{total}] queued → {aid}  (task_id: {result.id})")
            queued += 1

    if dry_run:
        print(f"\n✅ Dry run complete — {total} tasks would be dispatched.")
    else:
        print(f"\n✅ Done — {queued}/{total} tasks queued to the 'nlp' Celery queue.")
        print("   Make sure your Celery worker is running:")
        print("   uv run celery -A nlp_engine.celery_app worker --pool=solo -Q nlp --loglevel=info\n")


# ──────────────────────────────────────────────────────────────────────────────

def parse_args():
    parser = argparse.ArgumentParser(
        description="Dispatch Celery skill-extraction tasks for alumni in the database."
    )
    parser.add_argument(
        "--alumni-id",
        metavar="UUID",
        help="Process a single alumni by ID (default: all alumni)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be dispatched without actually queuing tasks",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    # Fetch IDs (async)
    alumni_ids = asyncio.run(get_alumni_ids(args.alumni_id))

    if not alumni_ids:
        print("⚠️  No alumni found in the database. Run seed_alumni.py first.")
        sys.exit(0)

    # Dispatch (sync — Celery .delay() is synchronous)
    dispatch_tasks(alumni_ids, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
