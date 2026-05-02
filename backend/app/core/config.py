"""Application settings and configuration."""
from typing import Any
from pydantic import field_validator
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Configuration
    api_title: str = "TamangNetra API"
    api_version: str = "0.1.0"
    api_description: str = "Trilingual translation backend (English ↔ Nepali ↔ Tamang)"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = False
    environment: str = "development"
    
    # Database
    database_url: str = "postgresql://user:password@localhost:5432/tamangletra"
    async_database_url: str = "postgresql+asyncpg://user:password@localhost:5432/tamangletra"
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    encryption_key: str = "your-256-bit-hex-key-here"
    # Frontend origin(s) that are allowed to make requests
    cors_origins: list[str] | str = ["http://localhost:3000", "http://127.0.0.1:3000"]
    # Hosts that the API will respond to
    trusted_hosts: list[str] | str = ["localhost", "127.0.0.1", "0.0.0.0"]
    
    # Translation API
    tmt_api_token: str = "team_xxxxxxxxx"
    tmt_api_base_url: str = "https://tmt.ilprl.ku.edu.np/lang-translate"
    
    # File Upload
    max_file_size: int = 52428800  # 50MB
    upload_dir: str = "./uploads"
    
    # Cache & Queue
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

    @field_validator("cors_origins", "trusted_hosts", mode="before")
    @classmethod
    def parse_list(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            return [v.strip() for v in value.split(",") if v.strip()]
        return value


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
