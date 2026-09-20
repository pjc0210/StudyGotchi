from functools import lru_cache

from app.config import get_settings
from app.providers.llm.base import LLMProvider


@lru_cache
def get_llm_provider() -> LLMProvider:
    settings = get_settings()
    if settings.llm_provider == "fake":
        from app.providers.llm.fake_provider import FakeLLMProvider

        return FakeLLMProvider()

    if settings.llm_provider == "openai":
        from app.providers.llm.openai_provider import OpenAILLMProvider

        return OpenAILLMProvider()
    if settings.llm_provider != "anthropic":
        raise ValueError(f"Unknown LLM provider: {settings.llm_provider}")

    from app.providers.llm.anthropic_provider import AnthropicLLMProvider

    return AnthropicLLMProvider()
