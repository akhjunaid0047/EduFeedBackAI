from pathlib import Path
from pydantic_settings import BaseSettings

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres.rkvzgswmuimfysmbvsix:6jSQsKYPmwSgXiDI@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
    REDIS_URL: str = "redis://default:mEJk34ZV1551djUXLPkdBWCSXvyvMstW@tray-voice-blush-76363.db.redis.io:14583"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    UPLOAD_DIR: str = "./uploads"
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    LLM_PROVIDER: str = "openai"  # "openai" (active) or "anthropic" (fallback)
    LLM_OPENAI_MODEL: str = "gpt-4o-mini"
    LLM_ANTHROPIC_MODEL: str = "claude-haiku-4-5-20251001"

    class Config:
        env_file = str(PROJECT_ROOT / ".env")
        extra = "ignore"


settings = Settings()
