"""Deterministic, offline adapter for `LLMProvider`.

`embed()` is a real (if crude) implementation: a hashed bag-of-words
embedding, so cosine similarity tracks lexical overlap well enough to
exercise matching and canonicalization without a vendor key.

Structured extraction and image reading answer from canned fixtures: a list
of `(marker, payload)` pairs, where the first marker found in the prompt
selects its payload. With no fixture matching, the extraction is empty (the
engine then records the file with no concepts), never a made-up one.
"""

import hashlib
import math
import re
from collections.abc import Sequence
from typing import Any

from app.providers.llm.base import SchemaT

_EMBED_DIM = 1024
_TOKEN_RE = re.compile(r"[a-z0-9]+")

Fixture = tuple[str, dict[str, Any]]


def _hashed_bow_embedding(text: str, dim: int = _EMBED_DIM) -> list[float]:
    vector = [0.0] * dim
    for token in _TOKEN_RE.findall(text.lower()):
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % dim
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign
    norm = math.sqrt(sum(v * v for v in vector))
    if norm == 0.0:
        return vector
    return [v / norm for v in vector]


class FakeLLMProvider:
    def __init__(
        self,
        structured: Sequence[Fixture] = (),
        *,
        transcript: str = "",
        strict: bool = False,
    ) -> None:
        self._structured = list(structured)
        self._transcript = transcript
        # strict: raise instead of answering empty, for tests that must not reach the model.
        self._strict = strict

    async def structured_generate(self, *, system: str, prompt: str, schema: type[SchemaT]) -> SchemaT:
        for marker, payload in self._structured:
            if marker in prompt:
                return schema.model_validate(payload)
        if self._strict:
            raise NotImplementedError(
                "FakeLLMProvider has no fixture for this prompt. Pass structured=[(marker, payload)], "
                "or configure LLM_PROVIDER=openai with a real API key."
            )
        return schema.model_validate(_empty_payload(schema, prompt))

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [_hashed_bow_embedding(text) for text in texts]

    async def analyze_image(self, image_bytes: bytes, prompt: str, *, media_type: str = "image/png") -> str:
        if self._transcript:
            return self._transcript
        if self._strict:
            raise NotImplementedError("FakeLLMProvider has no transcript. Pass transcript=... or use a real provider.")
        return ""


def _empty_payload(schema: type[Any], prompt: str) -> dict[str, Any]:
    """The schema's required scalar fields filled from the prompt, lists left empty."""

    payload: dict[str, Any] = {}
    for name, field in schema.model_fields.items():
        if not field.is_required():
            continue
        if name == "document_type":
            match = re.search(r"Document type: (\S+)", prompt)
            payload[name] = match.group(1) if match else "other"
        elif field.annotation is str:
            payload[name] = ""
        elif field.annotation is bool:
            payload[name] = False
        elif field.annotation in (int, float):
            payload[name] = 0
    return payload
