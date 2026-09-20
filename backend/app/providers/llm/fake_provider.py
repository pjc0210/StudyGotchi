"""Deterministic, offline stand-in for `LLMProvider`.

`embed()` is a real (if crude) implementation — a hashed bag-of-words
embedding, so cosine similarity tracks lexical overlap well enough to
exercise canonicalization/redundancy logic in tests without a Voyage API
key. `structured_generate` / `analyze_image` cannot meaningfully fake an
extraction, so they raise clearly: extraction-dependent tests should use
fixtures (`tests/fixtures`) or the demo seed script instead of this
provider, per the spec's "use deterministic fixtures first if necessary"
guidance.
"""

import hashlib
import math
import re

from app.providers.llm.base import SchemaT

_EMBED_DIM = 1024
_TOKEN_RE = re.compile(r"[a-z0-9]+")


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
    async def structured_generate(
        self, *, system: str, prompt: str, schema: type[SchemaT]
    ) -> SchemaT:
        raise NotImplementedError(
            "FakeLLMProvider cannot synthesize structured extraction output. "
            "Use tests/fixtures or scripts/seed_demo_course.py for a deterministic path, "
            "or configure LLM_PROVIDER=openai (or anthropic) with a real API key."
        )

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [_hashed_bow_embedding(text) for text in texts]

    async def analyze_image(
        self, image_bytes: bytes, prompt: str, *, media_type: str = "image/png"
    ) -> str:
        raise NotImplementedError(
            "FakeLLMProvider cannot analyze images. Configure LLM_PROVIDER=openai (or anthropic) with a real API key."
        )
