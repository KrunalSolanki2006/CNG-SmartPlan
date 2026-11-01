"""Centralized configuration and path resolution for CNG SmartPlan backend."""

from pathlib import Path
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


SERVER_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SERVER_DIR.parent
DEFAULT_DATA_DIR = PROJECT_ROOT / "CNG_SmartPlan_Data"


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    model_config = SettingsConfigDict(
        env_file=SERVER_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = Field(default="development", description="App environment")
    host: str = Field(default="127.0.0.1", description="Server bind host")
    port: int = Field(default=8000, description="Server bind port")
    data_dir: Path = Field(
        default=DEFAULT_DATA_DIR,
        description="Path to read-only CNG_SmartPlan_Data directory",
    )
    cors_origins: Union[List[str], str] = Field(
        default=["http://localhost:5173"],
        description="List of allowed CORS origins",
    )

    @field_validator("data_dir", mode="before")
    @classmethod
    def resolve_data_dir(cls, v: Union[str, Path]) -> Path:
        """Resolve data directory path against project root or current working dir."""
        if isinstance(v, str):
            p = Path(v)
            if not p.is_absolute():
                # Try relative to SERVER_DIR first, then PROJECT_ROOT
                if (SERVER_DIR / p).exists():
                    p = SERVER_DIR / p
                elif (PROJECT_ROOT / p).exists():
                    p = PROJECT_ROOT / p
                else:
                    p = p.resolve()
            return p.resolve()
        return Path(v).resolve()

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[List[str], str]) -> List[str]:
        """Support comma-separated string or list for CORS origins."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()

