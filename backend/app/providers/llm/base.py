"""AI provider abstraction (spec: "Provider abstraction" boundary rule).

Domain code, extractors, and pipelines depend on this Protocol, never on a
vendor SDK directly, so the model/embedding provider can be swapped without
touching extraction logic.
"""

from typing import Protocol, TypeVar

from pydantic import BaseModel

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class LLMProvider(Protocol):
    async def structured_generate(
        self,
        *,
        system: str,
        prompt: str,
        schema: type[SchemaT],
    ) -> SchemaT: ...

    async def embed(self, texts: list[str]) -> list[list[float]]: ...

    async def analyze_image(
        self,
        image_bytes: bytes,
        prompt: str,
        *,
        media_type: str = "image/png",
    ) -> str: ...
