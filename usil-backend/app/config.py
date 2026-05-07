# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:12345@localhost:5432/usil_db"
    
    # API Keys
    ANTHROPIC_API_KEY: Optional[str] = None
    
    # Application
    APP_NAME: str = "Usil AI Backend"
    DEBUG: bool = False
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]
    
    class Config:
        env_file = ".env"

settings = Settings()