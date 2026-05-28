import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, alumni, faculty, syllabus, revision, analytics, courses, reports
from app.api.v1 import settings as settings_router

app = FastAPI(
    title="EduFeedback AI API",
    version="1.0.0",
    description="AI-driven curriculum analytics platform",
    docs_url="/docs",
    redoc_url="/redoc",
)

_cors_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
_cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(alumni.router, prefix="/api/v1/alumni", tags=["Alumni"])
app.include_router(faculty.router, prefix="/api/v1/faculty", tags=["Faculty"])
app.include_router(syllabus.router, prefix="/api/v1/syllabus", tags=["Syllabus"])
app.include_router(revision.router, prefix="/api/v1/revision", tags=["Revision"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(courses.router, prefix="/api/v1/courses", tags=["Courses"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(settings_router.router, prefix="/api/v1/settings", tags=["Settings"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "EduFeedback AI"}
