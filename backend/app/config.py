from typing import Annotated, Any, List

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

PLACEHOLDER_PREFIX = "change-this"
MIN_SECRET_LENGTH = 32


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )

    DATABASE_URL: str = "postgresql://localhost/cybersec_game"
    DB_POOL_MIN_SIZE: int = 10
    DB_POOL_MAX_SIZE: int = 20

    # No default on purpose: the app refuses to start without a real secret key
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    ENV: str = "development"
    DEBUG: bool = False
    # NoDecode lets the comma-separated value from .env reach the validator below
    ALLOWED_ORIGINS: Annotated[List[str], NoDecode] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    @field_validator("SECRET_KEY")
    @classmethod
    def check_secret_key(cls, v: str) -> str:
        if v.strip().lower().startswith(PLACEHOLDER_PREFIX):
            raise ValueError(
                "SECRET_KEY is still the example placeholder. Generate one with: "
                'python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )
        if len(v) < MIN_SECRET_LENGTH:
            raise ValueError(f"SECRET_KEY must be at least {MIN_SECRET_LENGTH} characters")
        return v

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()
