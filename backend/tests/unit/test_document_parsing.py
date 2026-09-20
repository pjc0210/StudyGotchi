from io import BytesIO
from unittest.mock import AsyncMock

import pymupdf
import pytest
from PIL import Image

from app.extractors.chunker import chunk_document
from app.extractors.parser import ParsedDocument, ParsedPage, parse_resource


@pytest.mark.asyncio
async def test_scanned_pdf_uses_vision_and_preserves_page():
    image = Image.new("RGB", (100, 100), "white")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    pdf = pymupdf.open()
    page = pdf.new_page()
    page.insert_image(page.rect, stream=buffer.getvalue())
    provider = AsyncMock()
    provider.analyze_image.return_value = "A matrix maps a vector to another vector."
    result = await parse_resource("scan.pdf", pdf.tobytes(), provider=provider)
    assert result.pages[0].page_number == 1
    assert "matrix" in result.raw_text
    provider.analyze_image.assert_awaited_once()


@pytest.mark.asyncio
async def test_digital_pdf_keeps_text_without_vision():
    pdf = pymupdf.open()
    page = pdf.new_page()
    page.insert_text(
        (40, 40),
        "An inner product maps two vectors to a scalar and defines orthogonality.",
    )
    provider = AsyncMock()
    result = await parse_resource("lecture.pdf", pdf.tobytes(), provider=provider)
    assert "orthogonality" in result.raw_text
    provider.analyze_image.assert_not_awaited()


def test_long_paragraph_is_bounded_and_page_provenance_survives():
    text = "positive semidefinite matrix " * 900
    chunks = chunk_document(ParsedDocument(pages=[ParsedPage(7, text)], raw_text=text))
    assert len(chunks) > 1
    assert all(len(chunk.text) <= 3600 and chunk.page_number == 7 for chunk in chunks)


def test_assessment_header_and_page_numbers_survive():
    pages = [
        ParsedPage(1, "Exam instructions\nQuestion 1: Define a matrix."),
        ParsedPage(2, "Question 2: Compute a determinant."),
    ]
    chunks = chunk_document(
        ParsedDocument(pages, "\n\n".join(p.text for p in pages)), is_assessment=True
    )
    assert "Exam instructions" in chunks[0].text
    assert chunks[-1].page_number == 2
