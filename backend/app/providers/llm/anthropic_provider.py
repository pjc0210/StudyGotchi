"""Anthropic (Claude) + Voyage AI implementation of `LLMProvider`.

Structured extraction uses forced tool-use: the Pydantic schema's JSON
Schema becomes a single tool's `input_schema`, `tool_choice` forces the
model to call it, and the tool call's input is validated back into the
Pydantic model before anything touches the domain layer.
"""

import base64

from anthropic import AsyncAnthropic

from app.config import get_settings
from app.providers.llm.base import SchemaT

_STRUCTURED_OUTPUT_TOOL_NAME = "emit_structured_output"


class AnthropicLLMProvider:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set")

        self._client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self._model = settings.anthropic_model
        self._vision_model = settings.anthropic_vision_model

        self._voyage_model = settings.voyage_embed_model
        self._voyage = None
        if settings.voyage_api_key:
            import voyageai

            self._voyage = voyageai.AsyncClient(api_key=settings.voyage_api_key)

    async def structured_generate(
        self, *, system: str, prompt: str, schema: type[SchemaT]
    ) -> SchemaT:
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=4096,
            system=system,
            messages=[{"role": "user", "content": prompt}],
            tools=[
                {
                    "name": _STRUCTURED_OUTPUT_TOOL_NAME,
                    "description": f"Emit the extraction result matching the {schema.__name__} schema.",
                    "input_schema": schema.model_json_schema(),
                }
            ],
            tool_choice={"type": "tool", "name": _STRUCTURED_OUTPUT_TOOL_NAME},
        )
        for block in response.content:
            if block.type == "tool_use" and block.name == _STRUCTURED_OUTPUT_TOOL_NAME:
                return schema.model_validate(block.input)
        raise RuntimeError(
            "Anthropic response did not include the expected structured tool_use block."
        )

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if self._voyage is None:
            raise RuntimeError("VOYAGE_API_KEY is not set; embeddings are unavailable.")
        result = await self._voyage.embed(
            texts, model=self._voyage_model, input_type="document"
        )
        return result.embeddings

    async def analyze_image(
        self, image_bytes: bytes, prompt: str, *, media_type: str = "image/png"
    ) -> str:
        encoded = base64.standard_b64encode(image_bytes).decode("utf-8")
        response = await self._client.messages.create(
            model=self._vision_model,
            max_tokens=2048,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": encoded,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )
        return "\n".join(
            block.text for block in response.content if block.type == "text"
        )
