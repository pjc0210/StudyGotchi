"""Image parsing via multimodal transcription (spec: "File parsing" ->
Images). Never invents unreadable content; the transcription prompt
explicitly instructs the model to mark uncertainty instead of guessing.
"""

from app.extractors.parser import ParsedDocument, ParsedPage
from app.providers.llm.base import LLMProvider

_TRANSCRIPTION_PROMPT = (
    "Transcribe all readable text and mathematical notation from this image exactly as written. "
    "If any content is illegible, ambiguous, or cut off, say so explicitly (e.g. '[illegible]') "
    "rather than guessing what it might say. Do not invent content that is not actually visible."
)


async def parse_image(
    content_bytes: bytes, *, provider: LLMProvider, media_type: str = "image/png"
) -> ParsedDocument:
    transcription = await provider.analyze_image(
        content_bytes, _TRANSCRIPTION_PROMPT, media_type=media_type
    )
    return ParsedDocument(
        pages=[ParsedPage(page_number=None, text=transcription)], raw_text=transcription
    )
