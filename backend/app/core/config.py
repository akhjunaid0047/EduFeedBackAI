from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres.rkvzgswmuimfysmbvsix:6jSQsKYPmwSgXiDI@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
    REDIS_URL: str = "redis://default:IFmUZ3O54idO3koDvIwOoAHn9W0Ro8T2@redis-18522.c74.us-east-1-4.ec2.cloud.redislabs.com:18522"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    UPLOAD_DIR: str = "./uploads"
    ANTHROPIC_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
