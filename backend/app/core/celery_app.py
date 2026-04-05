import sys
import os
from celery import Celery
from app.core.config import settings

# Add the project root to sys.path so celery can import nlp_engine tasks
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
celery_app = Celery(
    "edufeedback",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["nlp_engine.tasks"],
)

celery_app.conf.task_routes = {
    "nlp_engine.tasks.extract_skills": {"queue": "nlp"},
    "nlp_engine.tasks.run_full_analytics": {"queue": "nlp"},
    "nlp_engine.tasks.run_syllabus_revision": {"queue": "revision"},
    "nlp_engine.tasks.parse_syllabus": {"queue": "nlp"},
}
celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]
celery_app.conf.timezone = "UTC"
celery_app.conf.task_track_started = True
