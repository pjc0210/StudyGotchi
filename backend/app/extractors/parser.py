"""File parsing dispatch (spec: "File parsing"). Preserves page numbers,
section headings, and source identity; never invents unreadable content.
"""

from dataclasses import dataclass, field

from app.providers.llm.base import LLMProvider


@dataclass
class ParsedPage:
    page_number: int | None
    text: str
    section_title: str | None = None


@dataclass
class ParsedDocument:
    pages: list[ParsedPage] = field(default_factory=list)
    raw_text: str = ""


_IMAGE_EXTENSIONS = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}
_TEXT_EXTENSIONS = {"md", "markdown", "txt"}


def _extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


async def parse_resource(
    filename: str, content_bytes: bytes, *, provider: LLMProvider
) -> ParsedDocument:
    ext = _extension(filename)

    if ext == "pdf":
        from app.extractors.pdf import parse_pdf

        return parse_pdf(content_bytes)

    if ext in _TEXT_EXTENSIONS:
        from app.extractors.text import parse_text

        return parse_text(content_bytes.decode("utf-8", errors="replace"))

    if ext == "docx":
        from app.extractors.text import parse_docx

        return parse_docx(content_bytes)

    if ext in _IMAGE_EXTENSIONS:
        from app.extractors.image import parse_image

        return await parse_image(content_bytes, provider=provider, media_type=_IMAGE_EXTENSIONS[ext])

    raise ValueError(f"Unsupported file type: .{ext or '(none)'}")
