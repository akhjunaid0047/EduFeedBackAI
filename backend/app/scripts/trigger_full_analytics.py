"""
Dispatch the full analytics Celery task for the EduFeedback AI pipeline.

Usage (run from the /backend directory):
    uv run python -m app.scripts.trigger_full_analytics
"""

import sys
import asyncio
from pathlib import Path

# ── Make sure BOTH backend/ and the repo root are on the path ──────────────────
BACKEND_DIR = Path(__file__).resolve().parents[2]   # .../backend
PROJECT_ROOT = BACKEND_DIR.parent                   # .../edufeedbackai (repo root)

for p in (str(BACKEND_DIR), str(PROJECT_ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

# Import DB and service
from app.core.database import AsyncSessionLocal
from app.services.analytics_service import trigger_analytics_run

async def main():
    print("\nInitializing database connection...")
    async with AsyncSessionLocal() as db:
        print("Dispatching run_full_analytics task...")
        # Since this is a CLI trigger, user_id is None
        run = await trigger_analytics_run(db, user_id=None)
        
        print(f"\n✅ Analytics run triggered successfully!")
        print(f"   ► Run ID: {run.id}")
        print(f"   ► Status: {run.status.value}")
        print("\n   Make sure your Celery worker is running to process this task:")
        print("   uv run celery -A app.core.celery_app worker --pool=solo -Q nlp --loglevel=info\n")

if __name__ == "__main__":
    asyncio.run(main())
