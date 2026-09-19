from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://studygotchi:studygotchi@localhost:5432/studygotchi"

    llm_provider: str = "anthropic"
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-5"
    anthropic_vision_model: str = "claude-sonnet-5"

    voyage_api_key: str | None = None
    voyage_embed_model: str = "voyage-3"

    environment: str = "development"

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


@lru_cache
def get_settings() -> Settings:
    return Settings()
