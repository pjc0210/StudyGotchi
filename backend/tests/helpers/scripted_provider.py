"""Deterministic LLM stand-in for pipeline integration tests.

`embed()` matches `FakeLLMProvider` so canonicalization still tracks lexical
overlap. `structured_generate` dispatches on schema (and document type in
the prompt) so ingest tests never call a live model.
"""

from pydantic import BaseModel

from app.providers.llm.base import SchemaT
from app.providers.llm.fake_provider import FakeLLMProvider
from app.schemas.extraction import ConceptAdjudicationOut, ResourceExtractionResult


class ScriptedLLMProvider:
    def __init__(
        self,
        *,
        by_document_type: dict[str, ResourceExtractionResult],
        adjudication: ConceptAdjudicationOut | None = None,
    ) -> None:
        self._by_document_type = by_document_type
        self._adjudication = adjudication or ConceptAdjudicationOut(
            same_concept=True,
            matched_candidate_index=0,
            reasoning="scripted: treat near-duplicates as the same concept",
        )
        self._embedder = FakeLLMProvider()
        self.structured_calls: list[type[BaseModel]] = []

    async def structured_generate(
        self, *, system: str, prompt: str, schema: type[SchemaT]
    ) -> SchemaT:
        self.structured_calls.append(schema)
        if schema is ConceptAdjudicationOut:
            return schema.model_validate(self._adjudication.model_dump())
        if schema is ResourceExtractionResult:
            document_type = "other"
            first_line = prompt.splitlines()[0] if prompt else ""
            if first_line.lower().startswith("document type:"):
                document_type = first_line.split(":", 1)[1].strip().lower()
            payload = self._by_document_type.get(document_type)
            if payload is None:
                payload = next(iter(self._by_document_type.values()))
            return schema.model_validate(payload.model_dump())
        raise AssertionError(f"No scripted payload for {schema.__name__}")

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return await self._embedder.embed(texts)

    async def analyze_image(
        self, image_bytes: bytes, prompt: str, *, media_type: str = "image/png"
    ) -> str:
        raise NotImplementedError("ScriptedLLMProvider does not analyze images.")
