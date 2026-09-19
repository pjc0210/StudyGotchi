"""PDF parsing: text extraction by page (spec: "File parsing" -> PDF)."""

from io import BytesIO

from pypdf import PdfReader

from app.extractors.parser import ParsedDocument, ParsedPage


def parse_pdf(content_bytes: bytes) -> ParsedDocument:
    reader = PdfReader(BytesIO(content_bytes))
    pages: list[ParsedPage] = []
    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append(ParsedPage(page_number=index, text=text))
    raw_text = "\n\n".join(page.text for page in pages)
    return ParsedDocument(pages=pages, raw_text=raw_text)
