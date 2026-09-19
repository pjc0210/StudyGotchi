"""PDF parsing: text extraction by page (spec: "File parsing" -> PDF).

Uses PyMuPDF rather than pypdf: real MIT course PDFs (LaTeX-generated
problem sets/recitations with ligatures and non-standard ToUnicode CMaps)
tested with pypdf's `extract_text()` reconstruct word spacing incorrectly
("18.03RECITATIONSHEET6"), which would badly degrade concept extraction.
PyMuPDF reconstructs spacing correctly on the same files.
"""

import pymupdf

from app.extractors.parser import ParsedDocument, ParsedPage


def parse_pdf(content_bytes: bytes) -> ParsedDocument:
    pages: list[ParsedPage] = []
    with pymupdf.open(stream=content_bytes, filetype="pdf") as document:
        for index, page in enumerate(document, start=1):
            text = page.get_text() or ""
            pages.append(ParsedPage(page_number=index, text=text))
    raw_text = "\n\n".join(page.text for page in pages)
    return ParsedDocument(pages=pages, raw_text=raw_text)
