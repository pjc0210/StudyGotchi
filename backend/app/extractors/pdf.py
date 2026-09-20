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


async def parse_pdf_with_vision(content_bytes: bytes, *, provider) -> ParsedDocument:
    """Transcribe scanned pages and image-heavy mixed pages; keep page provenance."""
    from app.extractors.image import _TRANSCRIPTION_PROMPT

    pages = []
    with pymupdf.open(stream=content_bytes, filetype="pdf") as document:
        if document.needs_pass:
            raise ValueError(
                "Password-protected PDFs must be unlocked before ingestion"
            )
        for index, page in enumerate(document, start=1):
            text = page.get_text() or ""
            image_area = sum(
                (pymupdf.Rect(info["bbox"]) & page.rect).get_area()
                for info in page.get_image_info()
            )
            # Scans can have a small selectable header or an incomplete OCR layer.
            words = text.split()
            fragmented = (
                len(words) > 30 and sum(len(w) <= 2 for w in words) / len(words) > 0.6
            )
            if (
                len(text.strip()) < 40
                or image_area > page.rect.get_area() * 0.5
                or fragmented
            ):
                pixmap = page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5), alpha=False)
                text = await provider.analyze_image(
                    pixmap.tobytes("png"), _TRANSCRIPTION_PROMPT
                )
            pages.append(ParsedPage(page_number=index, text=text))
    return ParsedDocument(pages=pages, raw_text="\n\n".join(p.text for p in pages))
