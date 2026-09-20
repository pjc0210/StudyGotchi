"""Small live credential/extraction/embedding check without printing secrets."""

import asyncio

from pydantic import BaseModel

from app.providers.llm import get_llm_provider


class CheckResult(BaseModel):
    concept: str


async def main():
    try:
        provider = get_llm_provider()
        result = await provider.structured_generate(
            system="Extract the named concept.",
            prompt="An inner product maps two vectors to a scalar.",
            schema=CheckResult,
        )
        vectors = await provider.embed([result.concept])
        print(
            f"OpenAI structured extraction OK; embedding dimensions={len(vectors[0])}"
        )
    except Exception as exc:  # noqa: BLE001 — report type only; never log credentials or request bodies
        print(
            f"Provider check failed: {type(exc).__name__}; "
            f"status={getattr(exc, 'status_code', None)}; code={getattr(exc, 'code', None)}"
        )
        raise SystemExit(1) from None


if __name__ == "__main__":
    asyncio.run(main())
