"""OpenAI implementation of `LLMProvider`.

Structured extraction uses forced function-calling: the Pydantic schema is
compiled into a strict JSON Schema tool, `tool_choice` forces that tool,
and the function arguments are validated back into the Pydantic model
(with enum-case / unit-interval coercion) before anything touches the
domain layer.

Embeddings use `text-embedding-3-large` with `dimensions=1024` so vectors
fit `Vector(1024)` in `app.db.models.EMBEDDING_DIM` without a schema change.
"""

import base64
import json

from openai import AsyncOpenAI

from app.config import get_settings
from app.providers.llm.base import SchemaT
from app.providers.llm.structured import model_tool_schema, validate_structured

_STRUCTURED_OUTPUT_TOOL_NAME = "emit_structured_output"


class OpenAILLMProvider:
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not set")

        self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        self._model = settings.openai_model
        self._vision_model = settings.openai_vision_model
        self._embed_model = settings.openai_embed_model
        self._embed_dimensions = settings.openai_embed_dimensions

    async def structured_generate(
        self, *, system: str, prompt: str, schema: type[SchemaT]
    ) -> SchemaT:
        parameters = model_tool_schema(schema, strict=True)
        response = await self._client.chat.completions.create(
            model=self._model,
            max_tokens=4096,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            tools=[
                {
                    "type": "function",
                    "function": {
                        "name": _STRUCTURED_OUTPUT_TOOL_NAME,
                        "description": f"Emit the extraction result matching the {schema.__name__} schema.",
                        "parameters": parameters,
                        "strict": True,
                    },
                }
            ],
            tool_choice={"type": "function", "function": {"name": _STRUCTURED_OUTPUT_TOOL_NAME}},
        )
        message = response.choices[0].message
        for call in message.tool_calls or []:
            if call.function.name != _STRUCTURED_OUTPUT_TOOL_NAME:
                continue
            try:
                payload = json.loads(call.function.arguments)
            except json.JSONDecodeError as exc:
                raise RuntimeError("OpenAI tool arguments were not valid JSON.") from exc
            return validate_structured(schema, payload)
        raise RuntimeError("OpenAI response did not include the expected structured tool call.")

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        # OpenAI caps batch size; keep requests well under the documented 2048-input limit.
        batch_size = 128
        vectors: list[list[float]] = []
        for start in range(0, len(texts), batch_size):
            batch = texts[start : start + batch_size]
            result = await self._client.embeddings.create(
                model=self._embed_model,
                input=batch,
                dimensions=self._embed_dimensions,
            )
            by_index = sorted(result.data, key=lambda row: row.index)
            vectors.extend(row.embedding for row in by_index)
        return vectors

    async def analyze_image(
        self, image_bytes: bytes, prompt: str, *, media_type: str = "image/png"
    ) -> str:
        encoded = base64.standard_b64encode(image_bytes).decode("utf-8")
        data_url = f"data:{media_type};base64,{encoded}"
        response = await self._client.chat.completions.create(
            model=self._vision_model,
            max_tokens=2048,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
        )
        content = response.choices[0].message.content
        return content or ""
