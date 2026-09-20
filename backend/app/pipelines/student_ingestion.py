"""Student resource ingestion in two phases (spec: "Student-file evidence
extraction", "Student evidence model").

Phase A, `match_student_resource`, runs on the request: hash, parse, chunk,
embed once, match chunks against the concepts this student can see, and
record exposure evidence. Nothing in this phase carries an outcome, so
understanding barely moves (pure exposure).

Phase B, `analyze_student_resource`, runs after the response: the model reads
every chunk (bounded concurrency), candidates resolve to course or personal
concepts, and assessment items with visible scores become graded evidence.
Only this phase can move understanding much. Concepts the student introduces that are
not in the course ontology become PERSONAL concepts, never canonical ones.

Handwritten images cannot be matched without the model, so they still take
the single-pass vision route inside phase A.
"""

import logging
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.domain.mastery.evidence import EvidenceEvent, EvidenceType
from app.domain.ontology.concepts import ConceptCandidate, ConceptScope
from app.domain.ontology.edges import StudentConceptEdgeType
from app.domain.ontology.source_types import ArtifactType, SourceOrigin
from app.domain.resources.matching import exposure_events_for_matches, match_chunks_to_concepts
from app.extractors.assessments import normalize_concept_links
from app.extractors.chunker import chunk_document
from app.extractors.concepts import extract_resource_structured, grounded
from app.extractors.parser import parse_resource
from app.extractors.student_work import extract_handwritten_work, extract_student_text_work
from app.pipelines.batching import gather_bounded
from app.pipelines.incremental_update import recompute_student_state
from app.providers.llm.base import LLMProvider
from app.repositories.assessments import (
    create_assessment_item,
    get_or_create_assessment,
    link_item_to_concept,
)
from app.repositories.concepts import (
    add_alias,
    create_concept,
    create_resource_link,
    get_alias_index,
    get_course_concepts,
    get_personal_concepts,
)
from app.repositories.edges import upsert_student_concept_edge
from app.repositories.resources import (
    compute_content_hash,
    create_resource,
    get_resource,
    get_resource_by_hash,
    get_resource_chunks,
    lock_course_ingestion,
    merge_resource_metadata,
    save_chunks,
    update_resource_status,
)
from app.repositories.student_states import create_evidence_event
from app.repositories.world import add_world_event
from app.resolution.merge import ResolutionAction, resolve_concept_candidate
from app.resolution.normalize import normalize_concept_name
from app.schemas.extraction import ConceptCandidateOut, ResourceExtractionResult

log = logging.getLogger(__name__)

_ASSESSMENT_ARTIFACT_TYPES = frozenset({ArtifactType.HOMEWORK, ArtifactType.QUIZ, ArtifactType.EXAM})
_IMAGE_EXTENSIONS = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}
# Typed or scanned work whose correctness the model can judge from the text itself.
_TEXT_WORK_ARTIFACT_TYPES = frozenset({ArtifactType.HANDWRITTEN_WORK, ArtifactType.WORKED_SOLUTION, ArtifactType.PHOTO})

_GRADED_EVIDENCE_TYPE_BY_ARTIFACT: dict[ArtifactType, EvidenceType] = {
    ArtifactType.EXAM: EvidenceType.GRADED_EXAM,
    ArtifactType.QUIZ: EvidenceType.GRADED_QUIZ,
    ArtifactType.HOMEWORK: EvidenceType.GRADED_HOMEWORK,
}
_EXPOSURE_EVIDENCE_TYPE_BY_ARTIFACT: dict[ArtifactType, EvidenceType] = {
    ArtifactType.STUDENT_NOTES: EvidenceType.STUDENT_NOTES,
    ArtifactType.CLASSMATE_NOTES: EvidenceType.RESOURCE_VIEW,
    ArtifactType.WORKED_SOLUTION: EvidenceType.WORKED_SOLUTION,
    ArtifactType.HANDWRITTEN_WORK: EvidenceType.WORKED_SOLUTION,
    ArtifactType.HOMEWORK: EvidenceType.WORKED_SOLUTION,
    ArtifactType.QUIZ: EvidenceType.WORKED_SOLUTION,
    ArtifactType.EXAM: EvidenceType.WORKED_SOLUTION,
    ArtifactType.PHOTO: EvidenceType.RESOURCE_VIEW,
    ArtifactType.OTHER: EvidenceType.RESOURCE_VIEW,
}


@dataclass
class StudentResourceIngestOutcome:
    resource_id: UUID
    # unchanged | empty | matched | processed
    status: str
    evidence_events_created: int = 0
    concepts_touched: set[UUID] = field(default_factory=set)
    personal_concepts_created: int = 0
    # True when phase B still has to run for this resource
    needs_analysis: bool = False


def _ms(start: float) -> int:
    return int((time.perf_counter() - start) * 1000)


async def _visible_concept_embeddings(session: AsyncSession, *, course_id: UUID, student_id: UUID) -> dict[UUID, list[float]]:
    """Course concepts plus this student's own personal ones. Other students' personal concepts stay invisible."""

    visible: dict[UUID, list[float]] = {}
    for node in (await get_course_concepts(session, course_id)).values():
        if node.embedding:
            visible[node.id] = node.embedding
    for node in (await get_personal_concepts(session, course_id, student_id)).values():
        if node.embedding:
            visible[node.id] = node.embedding
    return visible


async def _write_events(
    session: AsyncSession, *, course_id: UUID, student_id: UUID, events: list[EvidenceEvent], touched: set[UUID]
) -> None:
    for event in events:
        await create_evidence_event(session, course_id=course_id, event=event)
    await recompute_student_state(session, course_id=course_id, student_id=student_id, touched_concept_ids=touched)


# ---------------------------------------------------------------------------
# Phase A


async def match_student_resource(
    session: AsyncSession,
    provider: LLMProvider,
    *,
    course_id: UUID,
    student_id: UUID,
    origin: SourceOrigin,
    artifact_type: ArtifactType,
    filename: str,
    content_bytes: bytes,
) -> StudentResourceIngestOutcome:
    started = time.perf_counter()
    await lock_course_ingestion(session, course_id)
    content_hash = compute_content_hash(content_bytes)

    existing = await get_resource_by_hash(
        session,
        course_id,
        content_hash,
        owner_user_id=student_id,
        origin=origin.value,
        artifact_type=artifact_type.value,
    )
    if existing is not None:
        return StudentResourceIngestOutcome(resource_id=existing.id, status="unchanged")

    resource = await create_resource(
        session,
        course_id=course_id,
        origin=origin.value,
        artifact_type=artifact_type.value,
        title=filename,
        content_hash=content_hash,
        owner_user_id=student_id,
        status="parsing",
    )
    outcome = StudentResourceIngestOutcome(resource_id=resource.id, status="matched")

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if artifact_type in (ArtifactType.HANDWRITTEN_WORK, ArtifactType.PHOTO) and ext in _IMAGE_EXTENSIONS:
        return await _ingest_handwritten(
            session,
            provider,
            outcome=outcome,
            course_id=course_id,
            student_id=student_id,
            content_bytes=content_bytes,
            media_type=_IMAGE_EXTENSIONS[ext],
            started=started,
        )

    document = await parse_resource(filename, content_bytes, provider=provider)
    resource.raw_text = document.raw_text
    chunks = chunk_document(document, is_assessment=artifact_type in _ASSESSMENT_ARTIFACT_TYPES)
    if not chunks:
        await update_resource_status(session, resource.id, "empty")
        outcome.status = "empty"
        return outcome

    chunk_embeddings = await provider.embed([c.text for c in chunks])
    await save_chunks(session, resource_id=resource.id, course_id=course_id, chunks=chunks, embeddings=chunk_embeddings)

    settings = get_settings()
    visible = await _visible_concept_embeddings(session, course_id=course_id, student_id=student_id)
    matches = match_chunks_to_concepts(chunk_embeddings, visible, threshold=settings.match_threshold)
    events = exposure_events_for_matches(
        matches,
        student_id=student_id,
        resource_id=resource.id,
        evidence_type=_EXPOSURE_EVIDENCE_TYPE_BY_ARTIFACT.get(artifact_type, EvidenceType.RESOURCE_VIEW),
        occurred_at=datetime.now(UTC),
    )
    touched = {e.concept_id for e in events}
    if origin != SourceOrigin.STUDENT_SELF:
        # Shared material shows what the course covers, not what this student did.
        events = []
    await _write_events(session, course_id=course_id, student_id=student_id, events=events, touched=touched)

    await add_world_event(
        session,
        student_id=student_id,
        course_id=course_id,
        resource_id=resource.id,
        event="RESOURCE_ADDED",
        explanation=f"Added {artifact_type.value} from {origin.value}; it touches {len(touched)} concepts.",
    )
    await merge_resource_metadata(session, resource.id, phase_a_ms=_ms(started), chunks=len(chunks))
    await update_resource_status(session, resource.id, "matched")
    log.info("phase_a resource=%s chunks=%d matched_concepts=%d ms=%d", resource.id, len(chunks), len(touched), _ms(started))

    outcome.evidence_events_created = len(events)
    outcome.concepts_touched = touched
    outcome.needs_analysis = True
    return outcome


async def _ingest_handwritten(
    session: AsyncSession,
    provider: LLMProvider,
    *,
    outcome: StudentResourceIngestOutcome,
    course_id: UUID,
    student_id: UUID,
    content_bytes: bytes,
    media_type: str,
    started: float,
) -> StudentResourceIngestOutcome:
    work = await extract_handwritten_work(provider, content_bytes, media_type=media_type)
    alias_index = await get_alias_index(session, course_id)
    normalized = [normalize_concept_name(name) for name in work.concepts_used]
    resolved = [alias_index[name] for name in normalized if name in alias_index]
    relevance = 1.0 / len(resolved) if len(resolved) > 1 else 1.0
    now = datetime.now(UTC)

    events = [
        EvidenceEvent(
            concept_id=concept_id,
            student_id=student_id,
            evidence_type=EvidenceType.VERIFIED_PRACTICE if work.correctness is not None else EvidenceType.WORKED_SOLUTION,
            outcome=work.correctness,
            certainty=(0.75 if len(resolved) > 1 else 0.9) if work.correctness is not None else 0.6,
            occurred_at=now,
            resource_id=outcome.resource_id,
            concept_relevance=relevance,
        )
        for concept_id in resolved
    ]
    touched = set(resolved)
    await _write_events(session, course_id=course_id, student_id=student_id, events=events, touched=touched)
    await merge_resource_metadata(session, outcome.resource_id, phase_a_ms=_ms(started))
    await update_resource_status(session, outcome.resource_id, "processed")

    outcome.status = "processed"
    outcome.evidence_events_created = len(events)
    outcome.concepts_touched = touched
    return outcome


# ---------------------------------------------------------------------------
# Phase B


async def analyze_student_resource(
    session: AsyncSession, provider: LLMProvider, *, resource_id: UUID
) -> StudentResourceIngestOutcome:
    started = time.perf_counter()
    resource = await get_resource(session, resource_id)
    if resource is None or resource.owner_user_id is None:
        raise ValueError(f"Resource {resource_id} is not a student resource")

    course_id = resource.course_id
    student_id = resource.owner_user_id
    origin = SourceOrigin(resource.origin)
    await lock_course_ingestion(session, course_id)
    artifact_type = ArtifactType(resource.artifact_type)
    is_assessment = artifact_type in _ASSESSMENT_ARTIFACT_TYPES
    outcome = StudentResourceIngestOutcome(resource_id=resource_id, status="processed")

    chunk_rows = await get_resource_chunks(session, resource_id)
    if not chunk_rows:
        await update_resource_status(session, resource_id, "processed")
        return outcome

    settings = get_settings()
    # Student files create personal concepts, so a candidate the passage never
    # mentions (a model's guess from a title or score line) must not get in.
    async def read_chunk(text: str) -> ResourceExtractionResult:
        extraction = await extract_resource_structured(provider, document_type=artifact_type.value, chunk_text=text)
        return grounded(extraction, text)

    extractions: list[ResourceExtractionResult] = await gather_bounded(
        (read_chunk(row.text) for row in chunk_rows),
        limit=settings.ingest_concurrency,
    )

    for row, extraction in zip(chunk_rows, extractions, strict=True):
        row.chunk_metadata = {"extraction": extraction.model_dump(mode="json")}

    # Every lookup the per-chunk loop used to repeat is loaded once and kept current in memory.
    alias_index = await get_alias_index(session, course_id, student_id)
    existing_embeddings = await _visible_concept_embeddings(session, course_id=course_id, student_id=student_id)

    candidates: list[tuple[int, ConceptCandidateOut]] = [
        (chunk_index, candidate)
        for chunk_index, extraction in enumerate(extractions)
        for candidate in extraction.concept_candidates
    ]
    candidate_embeddings = await provider.embed([f"{c.name}: {c.definition}" for _, c in candidates]) if candidates else []

    now = datetime.now(UTC)
    events: list[EvidenceEvent] = []
    touched: set[UUID] = set()
    exposure_type = _EXPOSURE_EVIDENCE_TYPE_BY_ARTIFACT.get(artifact_type, EvidenceType.RESOURCE_VIEW)
    names_by_chunk: dict[int, dict[str, UUID]] = {i: {} for i in range(len(chunk_rows))}

    for (chunk_index, candidate_out), candidate_embedding in zip(candidates, candidate_embeddings, strict=True):
        candidate = ConceptCandidate(
            name=candidate_out.name,
            normalized_name=normalize_concept_name(candidate_out.name),
            definition=candidate_out.definition,
            concept_kind=candidate_out.concept_kind,
            granularity=candidate_out.granularity,
            importance_in_resource=candidate_out.importance_in_resource,
            aliases=candidate_out.aliases,
        )
        resolution = resolve_concept_candidate(
            candidate,
            alias_index=alias_index,
            existing_concept_embeddings=existing_embeddings,
            candidate_embedding=candidate_embedding,
            merge_threshold=settings.concept_merge_threshold,
            adjudicate_threshold=settings.concept_adjudicate_threshold,
        )

        # Student files never create or adjudicate into CANONICAL concepts. Sure matches merge;
        # everything else (including the ambiguous band) becomes a PERSONAL concept.
        if resolution.action in (ResolutionAction.MERGE_EXACT_ALIAS, ResolutionAction.MERGE_HIGH_SIMILARITY):
            concept_id = resolution.matched_concept_id
            assert concept_id is not None
        else:
            node = await create_concept(
                session,
                course_id=course_id,
                canonical_name=candidate.name,
                short_definition=candidate.definition,
                concept_kind=candidate.concept_kind,
                granularity=candidate.granularity,
                importance=candidate.importance_in_resource,
                embedding=candidate_embedding,
                scope=ConceptScope.PERSONAL,
                owner_student_id=student_id,
                created_from_resource_id=resource_id,
            )
            concept_id = node.id
            outcome.personal_concepts_created += 1
            existing_embeddings[concept_id] = candidate_embedding
            alias_index[candidate.normalized_name] = concept_id

        for alias in candidate.aliases:
            await add_alias(session, concept_id=concept_id, alias=alias, source_resource_id=resource_id)
            alias_index[normalize_concept_name(alias)] = concept_id

        await create_resource_link(
            session,
            concept_id=concept_id,
            resource_id=resource_id,
            chunk_id=chunk_rows[chunk_index].id,
            link_type="ASSESSED_IN" if is_assessment else "APPEARS_IN",
            depth_score=candidate.importance_in_resource,
            confidence=0.7,
        )

        names_by_chunk[chunk_index][candidate_out.name] = concept_id
        names_by_chunk[chunk_index][candidate.normalized_name] = concept_id
        touched.add(concept_id)

        if not is_assessment:
            events.append(
                EvidenceEvent(
                    concept_id=concept_id,
                    student_id=student_id,
                    evidence_type=exposure_type,
                    outcome=None,
                    certainty=0.8,
                    occurred_at=now,
                    resource_id=resource_id,
                )
            )

    assessment = None
    if is_assessment:
        assessment = await get_or_create_assessment(
            session, course_id=course_id, resource_id=resource_id, title=resource.title, assessment_type=artifact_type.value
        )
    graded_type = _GRADED_EVIDENCE_TYPE_BY_ARTIFACT.get(artifact_type, EvidenceType.GRADED_HOMEWORK)

    for chunk_index, extraction in enumerate(extractions):
        names = names_by_chunk[chunk_index]

        def resolve_name(name: str, *, _names: dict[str, UUID] = names) -> UUID | None:
            return _names.get(name) or _names.get(normalize_concept_name(name)) or alias_index.get(normalize_concept_name(name))

        for rel in extraction.concept_relationships:
            source_id = resolve_name(rel.source_concept_name)
            target_id = resolve_name(rel.target_concept_name)
            if source_id is None or target_id is None or source_id == target_id:
                continue
            await upsert_student_concept_edge(
                session,
                student_id=student_id,
                course_id=course_id,
                source_concept_id=source_id,
                target_concept_id=target_id,
                edge_type=StudentConceptEdgeType.ASSOCIATES_WITH,
                confidence=0.6,
                origin_resource_id=resource_id,
            )

        if origin == SourceOrigin.STUDENT_SELF and artifact_type in _TEXT_WORK_ARTIFACT_TYPES:
            work = await extract_student_text_work(provider, chunk_rows[chunk_index].text)
            resolved = {resolve_name(name) for name in work.concepts_used} - {None}
            if work.correctness is not None and resolved:
                for concept_id in resolved:
                    events.append(
                        EvidenceEvent(
                            concept_id=concept_id,
                            student_id=student_id,
                            evidence_type=EvidenceType.VERIFIED_PRACTICE,
                            outcome=work.correctness,
                            certainty=0.6,
                            occurred_at=now,
                            resource_id=resource_id,
                            concept_relevance=1.0 / len(resolved),
                        )
                    )
                    touched.add(concept_id)

        if assessment is None:
            continue
        for item_out in extraction.assessment_items:
            item = await create_assessment_item(
                session,
                assessment_id=assessment.id,
                label=item_out.label,
                prompt=item_out.prompt,
                max_score=item_out.max_score,
                difficulty=item_out.difficulty,
            )
            links: list[tuple[UUID, float]] = []
            for link in normalize_concept_links(item_out.concept_links):
                concept_id = resolve_name(link.concept_name)
                if concept_id is None:
                    continue
                await link_item_to_concept(
                    session, assessment_item_id=item.id, concept_id=concept_id, relevance_weight=link.relevance_weight
                )
                links.append((concept_id, link.relevance_weight))

            graded = origin == SourceOrigin.STUDENT_SELF and item_out.score_achieved is not None and bool(item_out.max_score)
            outcome_value = max(0.0, min(1.0, item_out.score_achieved / item_out.max_score)) if graded else None
            for concept_id, relevance in links:
                events.append(
                    EvidenceEvent(
                        concept_id=concept_id,
                        student_id=student_id,
                        evidence_type=graded_type if graded else EvidenceType.SELF_EXPLANATION,
                        outcome=outcome_value,
                        certainty=(0.9 if len(links) <= 1 else 0.6) if graded else 0.5,
                        occurred_at=now,
                        resource_id=resource_id,
                        assessment_item_id=item.id,
                        concept_relevance=relevance,
                    )
                )
                touched.add(concept_id)

    if origin != SourceOrigin.STUDENT_SELF:
        # Someone else's material shows what the course covers, not what this student can do.
        events = []
    await _write_events(session, course_id=course_id, student_id=student_id, events=events, touched=touched)
    graded_events = sum(1 for e in events if e.outcome is not None)
    await add_world_event(
        session,
        student_id=student_id,
        course_id=course_id,
        resource_id=resource_id,
        event="RESOURCE_ANALYZED",
        explanation=(
            f"Read {resource.title}: {len(events)} evidence events, {graded_events} graded, "
            f"{outcome.personal_concepts_created} new personal concepts."
        ),
    )
    await merge_resource_metadata(session, resource_id, phase_b_ms=_ms(started), graded_events=graded_events)
    await update_resource_status(session, resource_id, "processed")
    log.info(
        "phase_b resource=%s chunks=%d events=%d graded=%d personal=%d ms=%d",
        resource_id,
        len(chunk_rows),
        len(events),
        graded_events,
        outcome.personal_concepts_created,
        _ms(started),
    )

    outcome.evidence_events_created = len(events)
    outcome.concepts_touched = touched
    return outcome


# ---------------------------------------------------------------------------
# Both phases in one call, for scripts and tests that want the finished result


async def ingest_student_resource(
    session: AsyncSession,
    provider: LLMProvider,
    *,
    course_id: UUID,
    student_id: UUID,
    origin: SourceOrigin,
    artifact_type: ArtifactType,
    filename: str,
    content_bytes: bytes,
) -> StudentResourceIngestOutcome:
    first = await match_student_resource(
        session,
        provider,
        course_id=course_id,
        student_id=student_id,
        origin=origin,
        artifact_type=artifact_type,
        filename=filename,
        content_bytes=content_bytes,
    )
    if not first.needs_analysis:
        return first

    second = await analyze_student_resource(session, provider, resource_id=first.resource_id)
    return StudentResourceIngestOutcome(
        resource_id=first.resource_id,
        status=second.status,
        evidence_events_created=first.evidence_events_created + second.evidence_events_created,
        concepts_touched=first.concepts_touched | second.concepts_touched,
        personal_concepts_created=second.personal_concepts_created,
    )
