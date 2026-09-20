from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://studygotchi:studygotchi@localhost:5432/studygotchi"

    llm_provider: str = "anthropic"
    anthropic_api_key: str | None = None
    # Strong model reads course material once; the fast model reads every student file.
    anthropic_model: str = "claude-sonnet-5"
    anthropic_fast_model: str = "claude-haiku-4-5"
    anthropic_vision_model: str = "claude-sonnet-5"

    voyage_api_key: str | None = None
    voyage_embed_model: str = "voyage-3"

    environment: str = "development"

    # Comma-separated in the environment; see the *_list properties.
    cors_origins: str = "http://localhost:3000"

    # "clerk" verifies bearer JWTs; "dev" trusts an X-Student-Id header (local only).
    auth_mode: str = "clerk"
    clerk_issuer: str | None = None
    clerk_authorized_parties: str = "http://localhost:3000"

    # Ingest: parallel model calls per file, and the absolute cosine floor for fast-phase
    # matches (a chunk whose best concept is below this is about nothing we know).
    ingest_concurrency: int = 6
    match_threshold: float = 0.35

    @property
    def cors_origins_list(self) -> list[str]:
        return _split_csv(self.cors_origins)

    @property
    def clerk_authorized_parties_list(self) -> list[str]:
        return _split_csv(self.clerk_authorized_parties)

    # Mastery model priors (spec: "Mastery scoring")
    mastery_alpha_prior: float = 1.5
    mastery_beta_prior: float = 1.5
    mastery_confidence_k: float = 0.5

    # Concept canonicalization thresholds (spec: "Concept canonicalization")
    concept_merge_threshold: float = 0.94
    concept_adjudicate_threshold: float = 0.82

    # Prerequisite edge thresholds (spec: "Prerequisite extraction")
    prereq_active_threshold: float = 0.75
    prereq_weak_threshold: float = 0.55

    # Gap engine (spec: "Knowledge-gap engine")
    gap_relevance_alpha: float = 0.75
    gap_mastered_threshold: float = 0.75
    staleness_days: float = 45.0


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
