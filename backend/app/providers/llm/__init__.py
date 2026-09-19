from functools import lru_cache

from app.config import get_settings
from app.providers.llm.base import LLMProvider


@lru_cache
def get_llm_provider() -> LLMProvider:
    settings = get_settings()
    if settings.llm_provider == "fake":
        from app.providers.llm.fake_provider import FakeLLMProvider

        return FakeLLMProvider()

    from app.providers.llm.anthropic_provider import AnthropicLLMProvider

    return AnthropicLLMProvider()
