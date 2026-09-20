"""Course resource ingestion pipeline (spec: "File parsing" through
"Prerequisite extraction" / "Assessment-to-concept mapping"): parse -> chunk
-> structured extraction -> canonicalize -> persist concepts/edges/links ->
clean up the prerequisite graph.
"""

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.domain.graph.prerequisite import classify_edge, score_prerequisite_confidence
from app.domain.graph.reduction import clean_prerequisite_edges
from app.domain.ontology.concepts import ConceptCandidate, ConceptScope
from app.domain.ontology.edges import ConceptEdgeType
from app.domain.ontology.source_types import ArtifactType, SourceOrigin, get_authority
from app.extractors.assessments import normalize_concept_links
from app.extractors.chunker import chunk_document
from app.extractors.concepts import extract_resource_structured
from app.extractors.parser import parse_resource
from app.extractors.prerequisites import map_evidence_level
from app.pipelines.apply_resolution import (
    ResolutionContext,
    ResolutionPolicy,
    apply_candidate,
    name_resolver,
)
from app.prompts import load_prompt
from app.providers.llm.base import LLMProvider
from app.repositories.assessments import (
    create_assessment_item,
    get_or_create_assessment,
    link_item_to_concept,
)
from app.repositories.concepts import (
    create_resource_link,
    get_alias_index,
    get_concept_embeddings,
    get_course_concepts,
)
from app.repositories.edges import (
    add_edge_evidence,
    downgrade_edge_to_related,
    get_course_edges,
    mark_edges_redundant,
    upsert_concept_edge,
)
from app.repositories.resources import (
    compute_content_hash,
    create_resource,
    get_resource_by_hash,
    lock_course_ingestion,
    save_chunks,
    update_resource_status,
)
from app.schemas.extraction import ConceptAdjudicationOut

_ASSESSMENT_ARTIFACT_TYPES = frozenset(
    {
        ArtifactType.HOMEWORK,
        ArtifactType.QUIZ,
        ArtifactType.EXAM,
        ArtifactType.SOLUTION_KEY,
    }
)
_MERGE_ADJUDICATION_PROMPT = load_prompt("merge_adjudication.txt")


@dataclass
class ResourceIngestOutcome:
    resource_id: UUID
    status: str
    concepts_created: int = 0
    concepts_merged: int = 0
    edges_created: int = 0
    assessment_items_created: int = 0


async def _adjudicate_concept_merge(
    provider: LLMProvider,
    candidate: ConceptCandidate,
    candidate_matches: list,
    concept_names_by_id: dict[UUID, str],
    concept_definitions_by_id: dict[UUID, str | None],
) -> ConceptAdjudicationOut:
    lines = [
        f"Candidate concept: {candidate.name}",
        f"Candidate definition: {candidate.definition}",
        "",
        "Existing similar concepts:",
    ]
    for i, match in enumerate(candidate_matches):
        name = concept_names_by_id.get(match.concept_id, "?")
        definition = (
            concept_definitions_by_id.get(match.concept_id) or "(no definition on file)"
        )
        lines.append(f"[{i}] {name} (similarity {match.similarity:.2f}): {definition}")
    prompt = "\n".join(lines)
    return await provider.structured_generate(
        system=_MERGE_ADJUDICATION_PROMPT, prompt=prompt, schema=ConceptAdjudicationOut
    )


async def ingest_course_resource(
    session: AsyncSession,
    provider: LLMProvider,
    *,
    course_id: UUID,
    origin: SourceOrigin,
    artifact_type: ArtifactType,
    filename: str,
    content_bytes: bytes,
    owner_user_id: UUID | None = None,
) -> ResourceIngestOutcome:
    if origin == SourceOrigin.STUDENT_SELF:
        raise ValueError("Student work must use the student ingestion endpoint")
    settings = get_settings()
    await lock_course_ingestion(session, course_id)
    content_hash = compute_content_hash(content_bytes)

    existing = await get_resource_by_hash(
        session,
        course_id,
        content_hash,
        owner_user_id=owner_user_id,
        origin=origin.value,
        artifact_type=artifact_type.value,
    )
    if existing is not None:
        return ResourceIngestOutcome(resource_id=existing.id, status="unchanged")

    document = await parse_resource(filename, content_bytes, provider=provider)
    resource = await create_resource(
        session,
        course_id=course_id,
        origin=origin.value,
        artifact_type=artifact_type.value,
        title=filename,
        content_hash=content_hash,
        owner_user_id=owner_user_id,
        raw_text=document.raw_text,
        status="parsing",
    )

    is_assessment = artifact_type in _ASSESSMENT_ARTIFACT_TYPES
    chunks = chunk_document(document, is_assessment=is_assessment)
    if not chunks:
        await update_resource_status(session, resource.id, "empty")
        return ResourceIngestOutcome(resource_id=resource.id, status="empty")

    chunk_embeddings = await provider.embed([c.text for c in chunks])
    chunk_rows = await save_chunks(
        session,
        resource_id=resource.id,
        course_id=course_id,
        chunks=chunks,
        embeddings=chunk_embeddings,
    )

    authority = get_authority(origin, artifact_type)
    outcome = ResourceIngestOutcome(resource_id=resource.id, status="processed")

    existing_concepts = await get_course_concepts(session, course_id)
    context = ResolutionContext(
        alias_index=await get_alias_index(session, course_id),
        embeddings=await get_concept_embeddings(session, course_id),
        names_by_id={cid: c.canonical_name for cid, c in existing_concepts.items()},
        definitions_by_id={cid: c.short_definition for cid, c in existing_concepts.items()},
    )

    async def adjudicate(candidate: ConceptCandidate, matches: list) -> UUID | None:
        adjudication = await _adjudicate_concept_merge(
            provider, candidate, matches, context.names_by_id, context.definitions_by_id
        )
        if adjudication.same_concept and adjudication.matched_candidate_index is not None:
            idx = adjudication.matched_candidate_index
            if 0 <= idx < len(matches):
                return matches[idx].concept_id
        return None

    policy = ResolutionPolicy(
        scope=ConceptScope.COURSE if origin in (SourceOrigin.INSTRUCTOR, SourceOrigin.TA) else ConceptScope.SHARED_EXTENSION,
        owner_student_id=None,
        link_type="APPEARS_IN",
        adjudicate=adjudicate,
    )
    # Names resolved to concept IDs *within this ingestion call*, so a
    # relationship/assessment link can reference a concept extracted from an
    # earlier chunk of the same resource.
    name_to_concept_id: dict[str, UUID] = {}
    resolve_name = name_resolver(name_to_concept_id, context)

    seen_item_labels: set[str] = set()
    for chunk, chunk_row in zip(chunks, chunk_rows, strict=True):
        extraction = await extract_resource_structured(
            provider, document_type=artifact_type.value, chunk_text=chunk.text
        )

        chunk_row.chunk_metadata = {"extraction": extraction.model_dump(mode="json")}

        # One embedding call per chunk instead of one per candidate.
        candidate_embeddings = (
            await provider.embed([f"{c.name}: {c.definition}" for c in extraction.concept_candidates])
            if extraction.concept_candidates
            else []
        )
        for candidate_out, candidate_embedding in zip(extraction.concept_candidates, candidate_embeddings, strict=True):
            applied = await apply_candidate(
                session,
                course_id=course_id,
                resource_id=resource.id,
                chunk_id=chunk_row.id,
                candidate_out=candidate_out,
                embedding=candidate_embedding,
                context=context,
                policy=policy,
                name_map=name_to_concept_id,
            )
            if applied.created:
                outcome.concepts_created += 1
            else:
                outcome.concepts_merged += 1

        for link_out in extraction.resource_concept_links:
            concept_id = resolve_name(link_out.concept_name)
            if concept_id is None:
                continue
            await create_resource_link(
                session,
                concept_id=concept_id,
                resource_id=resource.id,
                chunk_id=chunk_row.id,
                link_type=link_out.link_type,
                depth_score=link_out.depth_score,
                confidence=link_out.confidence,
            )

        for rel in extraction.concept_relationships:
            source_id = resolve_name(rel.source_concept_name)
            target_id = resolve_name(rel.target_concept_name)
            if source_id is None or target_id is None or source_id == target_id:
                continue

            edge_type = rel.edge_type
            if edge_type == ConceptEdgeType.PREREQUISITE_FOR:
                level = map_evidence_level(rel.prerequisite_evidence_level)
                confidence = score_prerequisite_confidence(
                    level, authority.prerequisite_authority
                )
                classification = classify_edge(
                    confidence,
                    settings.prereq_active_threshold,
                    settings.prereq_weak_threshold,
                )
                if classification != "active":
                    edge_type = ConceptEdgeType.RELATED_TO
                authority_weight = authority.prerequisite_authority
            else:
                confidence = min(
                    1.0, 0.6 * (0.6 + 0.4 * authority.curriculum_authority)
                )
                authority_weight = authority.curriculum_authority

            edge = await upsert_concept_edge(
                session,
                course_id=course_id,
                source_concept_id=source_id,
                target_concept_id=target_id,
                edge_type=edge_type,
                confidence=confidence,
                authority_weight=authority_weight,
            )
            outcome.edges_created += 1
            await add_edge_evidence(
                session,
                edge_id=edge.id,
                resource_id=resource.id,
                chunk_id=chunk_row.id,
                page_number=chunk.page_number,
                evidence_kind=rel.prerequisite_evidence_level or "relationship",
                confidence=confidence,
                snippet=rel.evidence_snippet,
            )

        if extraction.assessment_items:
            assessment = await get_or_create_assessment(
                session,
                course_id=course_id,
                resource_id=resource.id,
                title=resource.title,
                assessment_type=artifact_type.value,
            )
            for item_out in extraction.assessment_items:
                if item_out.label in seen_item_labels:
                    continue
                seen_item_labels.add(item_out.label)
                item = await create_assessment_item(
                    session,
                    assessment_id=assessment.id,
                    label=item_out.label,
                    prompt=item_out.prompt,
                    max_score=item_out.max_score,
                    difficulty=item_out.difficulty,
                )
                outcome.assessment_items_created += 1
                for link in normalize_concept_links(item_out.concept_links):
                    concept_id = resolve_name(link.concept_name)
                    if concept_id is None:
                        continue
                    await link_item_to_concept(
                        session,
                        assessment_item_id=item.id,
                        concept_id=concept_id,
                        relevance_weight=link.relevance_weight,
                    )

    await _clean_up_prerequisite_graph(session, course_id)
    await update_resource_status(session, resource.id, "processed")
    return outcome


async def _clean_up_prerequisite_graph(session: AsyncSession, course_id: UUID) -> None:
    """Post-processing (spec: cycle detection/removal + transitive
    reduction), run over the *whole course graph* after each ingestion —
    a new resource's edges can create a cycle with existing edges.
    """

    all_edges = await get_course_edges(session, course_id)
    from app.db.models import ConceptEdge

    for edge in all_edges:
        row = await session.get(ConceptEdge, edge.id)
        row.edge_metadata = {
            **row.edge_metadata,
            "is_redundant_in_display_graph": False,
        }
    cleanup = clean_prerequisite_edges(all_edges)
    for edge_id in cleanup.cycle_broken_edge_ids:
        await downgrade_edge_to_related(session, edge_id)
    if cleanup.redundant_edge_ids:
        await mark_edges_redundant(session, cleanup.redundant_edge_ids)
