from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_BACKEND_DIR / ".env", extra="ignore")

    # SQLite for a laptop; production sets DATABASE_URL to a Postgres (asyncpg) URL.
    # Every match against embeddings happens in Python (app.resolution), so the
    # storage engine needs no vector extension either way.
    database_url: str = f"sqlite+aiosqlite:///{_BACKEND_DIR / 'studygotchi.db'}"

    # "openai" or "fake". Tests inject the fake provider.
    llm_provider: str = "openai"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1"
    openai_fast_model: str = "gpt-4.1-mini"
    openai_vision_model: str = "gpt-4.1-mini"
    openai_embed_model: str = "text-embedding-3-large"
    openai_embed_dimensions: int = 1024
    max_upload_bytes: int = 50 * 1024 * 1024

    environment: str = "development"

    # Comma-separated in the environment; see the *_list properties.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # "clerk" verifies bearer JWTs; "dev" trusts an X-Student-Id header (local only).
    auth_mode: str = "clerk"
    clerk_issuer: str | None = None
    clerk_authorized_parties: str = "http://localhost:3000"

    # Ingest: parallel model calls per file, and the absolute cosine floor for fast-phase
    # matches (a chunk whose best concept is below this is about nothing we know).
    ingest_concurrency: int = 4
    match_threshold: float = 0.35

    @property
    def cors_origins_list(self) -> list[str]:
        return _split_csv(self.cors_origins)

    @property
    def clerk_authorized_parties_list(self) -> list[str]:
        return _split_csv(self.clerk_authorized_parties)

    @property
    def is_production(self) -> bool:
        return self.environment.strip().lower() == "production"

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


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
