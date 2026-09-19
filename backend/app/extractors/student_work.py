"""Student-file evidence extraction (spec: "Student-file evidence
extraction"). Handwritten work only yields positive mastery evidence when
correctness can actually be verified; otherwise it's recorded as
familiarity/practice evidence only.
"""

from app.prompts import load_prompt
from app.providers.llm.base import LLMProvider
from app.schemas.extraction import StudentWorkExtractionOut

_SYSTEM_PROMPT = load_prompt("student_work_analysis.txt")

_TRANSCRIPTION_PROMPT = (
    "Transcribe and describe this handwritten work in detail: the problem being attempted, the "
    "steps shown, and the final answer, exactly as written. Note anything illegible or ambiguous."
)


async def extract_handwritten_work(
    provider: LLMProvider, image_bytes: bytes, *, media_type: str = "image/png"
) -> StudentWorkExtractionOut:
    transcription = await provider.analyze_image(image_bytes, _TRANSCRIPTION_PROMPT, media_type=media_type)
    return await provider.structured_generate(
        system=_SYSTEM_PROMPT, prompt=transcription, schema=StudentWorkExtractionOut
    )


async def extract_student_text_work(provider: LLMProvider, text: str) -> StudentWorkExtractionOut:
    """Same extraction contract for typed/OCR'd student work (not just
    photos), e.g. a pasted-in worked solution.
    """

    return await provider.structured_generate(system=_SYSTEM_PROMPT, prompt=text, schema=StudentWorkExtractionOut)
