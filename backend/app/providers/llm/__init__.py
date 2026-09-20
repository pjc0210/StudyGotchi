from functools import lru_cache

from app.config import get_settings
from app.providers.llm.base import LLMProvider


@lru_cache
def get_llm_provider() -> LLMProvider:
    settings = get_settings()
    provider = settings.llm_provider.strip().lower()
    if provider == "fake":
        from app.providers.llm.fake_provider import FakeLLMProvider

        return FakeLLMProvider()
    if provider == "openai":
        from app.providers.llm.openai_provider import OpenAILLMProvider

        return OpenAILLMProvider()
    raise RuntimeError(f"Unknown LLM_PROVIDER={settings.llm_provider!r}. Expected one of: openai, fake.")
