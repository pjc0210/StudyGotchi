from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_BACKEND_DIR / ".env", extra="ignore")

    # Committed to the repo (spec: demo-scale deployment, not a shared server).
    # A handful of demo courses fit comfortably in SQLite, and every match
    # against embeddings already happens in Python (app.resolution), so
    # there is no pgvector/Postgres feature this project actually needs.
    database_url: str = f"sqlite+aiosqlite:///{_BACKEND_DIR / 'studygotchi.db'}"

    llm_provider: str = "openai"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"
    openai_vision_model: str = "gpt-4.1-mini"
    openai_embed_model: str = "text-embedding-3-small"
    max_upload_bytes: int = 50 * 1024 * 1024
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-5"
    anthropic_vision_model: str = "claude-sonnet-5"

    voyage_api_key: str | None = None
    voyage_embed_model: str = "voyage-3"

    environment: str = "development"

    # Understanding-score priors (spec: "Understanding scoring")
    understanding_alpha_prior: float = 1.5
    understanding_beta_prior: float = 1.5

    # Concept canonicalization thresholds (spec: "Concept canonicalization")
    concept_merge_threshold: float = 0.94
    concept_adjudicate_threshold: float = 0.82

    # Prerequisite edge thresholds (spec: "Prerequisite extraction")
    prereq_active_threshold: float = 0.75
    prereq_weak_threshold: float = 0.55

    # Gap engine (spec: "Knowledge-gap engine")
    gap_relevance_alpha: float = 0.75
    gap_understood_threshold: float = 0.75
    staleness_days: float = 45.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
