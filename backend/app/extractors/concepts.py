"""Combined structured extraction per chunk (spec: "Structured extraction",
"Concept extraction contract"): concepts, their relationships, assessment
items, and resource-concept links all come back in one validated
`ResourceExtractionResult` per chunk.
"""

from app.prompts import load_prompt
from app.providers.llm.base import LLMProvider
from app.schemas.extraction import ResourceExtractionResult

_SYSTEM_PROMPT = load_prompt("concept_extraction.txt")


async def extract_resource_structured(
    provider: LLMProvider,
    *,
    document_type: str,
    chunk_text: str,
) -> ResourceExtractionResult:
    prompt = f"Document type: {document_type}\n\n---\n\n{chunk_text}"
    return await provider.structured_generate(
        system=_SYSTEM_PROMPT, prompt=prompt, schema=ResourceExtractionResult
    )
