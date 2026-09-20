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


_IMAGE_EXTENSIONS = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
}
_TEXT_EXTENSIONS = {"md", "markdown", "txt", "py", "csv", "ipynb"}


def _extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _clean(text: str) -> str:
    """Drop NUL bytes: PDF text layers carry them and Postgres text columns refuse them."""

    return text.replace("\x00", "")


def _cleaned(document: ParsedDocument) -> ParsedDocument:
    document.raw_text = _clean(document.raw_text)
    for page in document.pages:
        page.text = _clean(page.text)
        if page.section_title:
            page.section_title = _clean(page.section_title)
    return document


async def parse_resource(
    filename: str, content_bytes: bytes, *, provider: LLMProvider
) -> ParsedDocument:
    return _cleaned(await _parse(filename, content_bytes, provider=provider))


async def _parse(filename: str, content_bytes: bytes, *, provider: LLMProvider) -> ParsedDocument:
    ext = _extension(filename)

    if ext == "pdf":
        from app.extractors.pdf import parse_pdf_with_vision

        return await parse_pdf_with_vision(content_bytes, provider=provider)

    if ext in _TEXT_EXTENSIONS:
        from app.extractors.text import parse_text

        return parse_text(content_bytes.decode("utf-8", errors="replace"))

    if ext == "docx":
        from app.extractors.text import parse_docx

        return parse_docx(content_bytes)

    if ext in _IMAGE_EXTENSIONS:
        from app.extractors.image import parse_image

        return await parse_image(
            content_bytes, provider=provider, media_type=_IMAGE_EXTENSIONS[ext]
        )

    raise ValueError(f"Unsupported file type: .{ext or '(none)'}")
