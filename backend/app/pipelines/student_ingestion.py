"""Student resource ingestion pipeline (spec: "Student-file evidence
extraction", "Student evidence model"). Every concept touch becomes an
`EvidenceEvent`; mastery only moves on events with an `outcome`, which is
only ever set when correctness is actually verifiable. Concepts the student
introduces that aren't in the course ontology become PERSONAL concepts,
never canonical ones.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.domain.mastery.evidence import EvidenceEvent, EvidenceType
from app.domain.ontology.concepts import ConceptCandidate, ConceptScope
from app.domain.ontology.edges import StudentConceptEdgeType
from app.domain.ontology.source_types import ArtifactType, SourceOrigin
from app.extractors.assessments import normalize_concept_links
from app.extractors.chunker import chunk_document
from app.extractors.concepts import extract_resource_structured
from app.extractors.parser import parse_resource
from app.extractors.student_work import extract_handwritten_work
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
    get_alias_index,
    get_concept_embeddings,
    get_personal_concepts,
)
from app.repositories.edges import upsert_student_concept_edge
from app.repositories.resources import (
    compute_content_hash,
    create_resource,
    save_chunks,
    update_resource_status,
)
from app.repositories.student_states import create_evidence_event
from app.resolution.merge import ResolutionAction, resolve_concept_candidate
from app.resolution.normalize import normalize_concept_name

_ASSESSMENT_ARTIFACT_TYPES = frozenset({ArtifactType.HOMEWORK, ArtifactType.QUIZ, ArtifactType.EXAM})
_IMAGE_EXTENSIONS = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}

_GRADED_EVIDENCE_TYPE_BY_ARTIFACT: dict[ArtifactType, EvidenceType] = {
    ArtifactType.EXAM: EvidenceType.GRADED_EXAM,
    ArtifactType.QUIZ: EvidenceType.GRADED_QUIZ,
    ArtifactType.HOMEWORK: EvidenceType.GRADED_HOMEWORK,
}
_EXPOSURE_EVIDENCE_TYPE_BY_ARTIFACT: dict[ArtifactType, EvidenceType] = {
    ArtifactType.STUDENT_NOTES: EvidenceType.STUDENT_NOTES,
    ArtifactType.WORKED_SOLUTION: EvidenceType.WORKED_SOLUTION,
    ArtifactType.HANDWRITTEN_WORK: EvidenceType.WORKED_SOLUTION,
    ArtifactType.PHOTO: EvidenceType.RESOURCE_VIEW,
    ArtifactType.OTHER: EvidenceType.RESOURCE_VIEW,
}


@dataclass
class StudentResourceIngestOutcome:
    resource_id: UUID
    status: str
    evidence_events_created: int = 0
    concepts_touched: set[UUID] = field(default_factory=set)
    personal_concepts_created: int = 0


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
    content_hash = compute_content_hash(content_bytes)
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

    events: list[EvidenceEvent] = []
    concepts_touched: set[UUID] = set()
    outcome = StudentResourceIngestOutcome(resource_id=resource.id, status="processed")

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    now = datetime.now(timezone.utc)

    if artifact_type in (ArtifactType.HANDWRITTEN_WORK, ArtifactType.PHOTO) and ext in _IMAGE_EXTENSIONS:
        work = await extract_handwritten_work(provider, content_bytes, media_type=_IMAGE_EXTENSIONS[ext])
        alias_index = await get_alias_index(session, course_id)

        resolved_concepts = [
            (name, alias_index[normalize_concept_name(name)])
            for name in work.concepts_used
            if normalize_concept_name(name) in alias_index
        ]
        relevance = 1.0 / len(resolved_concepts) if len(resolved_concepts) > 1 else 1.0

        for _, concept_id in resolved_concepts:
            concepts_touched.add(concept_id)
            if work.correctness is not None:
                events.append(
                    EvidenceEvent(
                        concept_id=concept_id,
                        student_id=student_id,
                        evidence_type=EvidenceType.VERIFIED_PRACTICE,
                        outcome=work.correctness,
                        certainty=0.75 if len(resolved_concepts) > 1 else 0.9,
                        occurred_at=now,
                        resource_id=resource.id,
                        concept_relevance=relevance,
                    )
                )
            else:
                events.append(
                    EvidenceEvent(
                        concept_id=concept_id,
                        student_id=student_id,
                        evidence_type=EvidenceType.WORKED_SOLUTION,
                        outcome=None,
                        certainty=0.6,
                        occurred_at=now,
                        resource_id=resource.id,
                        concept_relevance=relevance,
                    )
                )
    else:
        document = await parse_resource(filename, content_bytes, provider=provider)
        is_assessment = artifact_type in _ASSESSMENT_ARTIFACT_TYPES
        chunks = chunk_document(document, is_assessment=is_assessment)

        if chunks:
            chunk_embeddings = await provider.embed([c.text for c in chunks])
            chunk_rows = await save_chunks(
                session, resource_id=resource.id, course_id=course_id, chunks=chunks, embeddings=chunk_embeddings
            )

            assessment = None
            if is_assessment:
                assessment = await get_or_create_assessment(
                    session, course_id=course_id, resource_id=resource.id, title=filename, assessment_type=artifact_type.value
                )

            for chunk, _chunk_row in zip(chunks, chunk_rows, strict=True):
                extraction = await extract_resource_structured(
                    provider, document_type=artifact_type.value, chunk_text=chunk.text
                )

                alias_index = await get_alias_index(session, course_id)
                existing_embeddings = await get_concept_embeddings(session, course_id)
                personal_concepts = await get_personal_concepts(session, course_id, student_id)
                for pid, node in personal_concepts.items():
                    if node.embedding:
                        existing_embeddings[pid] = node.embedding

                name_to_concept_id: dict[str, UUID] = {}

                for candidate_out in extraction.concept_candidates:
                    candidate = ConceptCandidate(
                        name=candidate_out.name,
                        normalized_name=normalize_concept_name(candidate_out.name),
                        definition=candidate_out.definition,
                        concept_kind=candidate_out.concept_kind,
                        granularity=candidate_out.granularity,
                        importance_in_resource=candidate_out.importance_in_resource,
                        aliases=candidate_out.aliases,
                    )
                    candidate_embedding = (await provider.embed([f"{candidate.name}: {candidate.definition}"]))[0]

                    settings = get_settings()
                    resolution = resolve_concept_candidate(
                        candidate,
                        alias_index=alias_index,
                        existing_concept_embeddings=existing_embeddings,
                        candidate_embedding=candidate_embedding,
                        merge_threshold=settings.concept_merge_threshold,
                        adjudicate_threshold=settings.concept_adjudicate_threshold,
                    )

                    # Student ingestion never creates or adjudicates into
                    # CANONICAL concepts. High-confidence matches merge;
                    # anything else (including the ambiguous adjudicate
                    # band, to avoid an LLM call per note-concept) becomes a
                    # new PERSONAL concept owned by this student.
                    if resolution.action == ResolutionAction.MERGE_EXACT_ALIAS or (
                        resolution.action == ResolutionAction.MERGE_HIGH_SIMILARITY
                    ):
                        concept_id = resolution.matched_concept_id
                        assert concept_id is not None
                    else:
                        concept_node = await create_concept(
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
                            created_from_resource_id=resource.id,
                        )
                        concept_id = concept_node.id
                        outcome.personal_concepts_created += 1
                        existing_embeddings[concept_id] = candidate_embedding

                    for alias in candidate.aliases:
                        await add_alias(session, concept_id=concept_id, alias=alias, source_resource_id=resource.id)

                    name_to_concept_id[candidate_out.name] = concept_id
                    name_to_concept_id[normalize_concept_name(candidate_out.name)] = concept_id
                    concepts_touched.add(concept_id)

                    exposure_type = _EXPOSURE_EVIDENCE_TYPE_BY_ARTIFACT.get(artifact_type, EvidenceType.RESOURCE_VIEW)
                    if not is_assessment:
                        events.append(
                            EvidenceEvent(
                                concept_id=concept_id,
                                student_id=student_id,
                                evidence_type=exposure_type,
                                outcome=None,
                                certainty=0.8,
                                occurred_at=now,
                                resource_id=resource.id,
                            )
                        )

                def resolve_name(
                    name: str, *, _n2c: dict[str, UUID] = name_to_concept_id, _aliases: dict[str, UUID] = alias_index
                ) -> UUID | None:
                    normalized = normalize_concept_name(name)
                    return _n2c.get(name) or _n2c.get(normalized) or _aliases.get(normalized)

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
                        origin_resource_id=resource.id,
                    )

                if is_assessment and extraction.assessment_items and assessment is not None:
                    graded_evidence_type = _GRADED_EVIDENCE_TYPE_BY_ARTIFACT.get(artifact_type, EvidenceType.GRADED_HOMEWORK)
                    for item_out in extraction.assessment_items:
                        item = await create_assessment_item(
                            session,
                            assessment_id=assessment.id,
                            label=item_out.label,
                            prompt=item_out.prompt,
                            max_score=item_out.max_score,
                            difficulty=item_out.difficulty,
                        )
                        links = normalize_concept_links(item_out.concept_links)
                        resolved_links: list[tuple[UUID, float]] = []
                        for link in links:
                            concept_id = resolve_name(link.concept_name)
                            if concept_id is None:
                                continue
                            await link_item_to_concept(
                                session, assessment_item_id=item.id, concept_id=concept_id, relevance_weight=link.relevance_weight
                            )
                            resolved_links.append((concept_id, link.relevance_weight))

                        if item_out.score_achieved is not None and item_out.max_score:
                            outcome_value = max(0.0, min(1.0, item_out.score_achieved / item_out.max_score))
                            certainty = 0.9 if len(resolved_links) <= 1 else 0.6
                            for concept_id, relevance in resolved_links:
                                events.append(
                                    EvidenceEvent(
                                        concept_id=concept_id,
                                        student_id=student_id,
                                        evidence_type=graded_evidence_type,
                                        outcome=outcome_value,
                                        certainty=certainty,
                                        occurred_at=now,
                                        resource_id=resource.id,
                                        assessment_item_id=item.id,
                                        concept_relevance=relevance,
                                    )
                                )
                                concepts_touched.add(concept_id)
                        else:
                            for concept_id, relevance in resolved_links:
                                events.append(
                                    EvidenceEvent(
                                        concept_id=concept_id,
                                        student_id=student_id,
                                        evidence_type=EvidenceType.SELF_EXPLANATION,
                                        outcome=None,
                                        certainty=0.5,
                                        occurred_at=now,
                                        resource_id=resource.id,
                                        assessment_item_id=item.id,
                                        concept_relevance=relevance,
                                    )
                                )
                                concepts_touched.add(concept_id)

    for event in events:
        await create_evidence_event(session, course_id=course_id, event=event)

    await update_resource_status(session, resource.id, "processed")
    await recompute_student_state(session, course_id=course_id, student_id=student_id, touched_concept_ids=concepts_touched)

    outcome.evidence_events_created = len(events)
    outcome.concepts_touched = concepts_touched
    return outcome
