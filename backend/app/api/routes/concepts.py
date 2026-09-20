"""Source-backed concept details, explanations, and representative resources."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.db.models import (
    Assessment,
    AssessmentItem,
    AssessmentItemConcept,
    Concept,
    ConceptAlias,
    ConceptEdge,
    ConceptResourceLink,
    EdgeEvidence,
    Resource,
    ResourceChunk,
    StudentEvidenceEvent,
)
from app.domain.ontology.source_types import ArtifactType, SourceOrigin, get_authority
from app.domain.resources.ranking import (
    ResourceCandidate,
    select_representative_resources,
)
from app.domain.resources.redundancy import detect_near_duplicate_clusters

router = APIRouter(prefix="/api/courses/{course_id}", tags=["concepts"])


async def concept_details(session, course_id, concept_id, student_id=None):
    concept = await session.get(Concept, concept_id)
    if (
        concept is None
        or concept.course_id != course_id
        or (concept.scope == "personal" and concept.owner_student_id != student_id)
    ):
        raise HTTPException(404, "Concept not found")
    visible = or_(
        Resource.owner_user_id.is_(None), Resource.owner_user_id == student_id
    )
    links = (
        await session.execute(
            select(ConceptResourceLink, Resource, ResourceChunk)
            .join(Resource, Resource.id == ConceptResourceLink.resource_id)
            .outerjoin(ResourceChunk, ResourceChunk.id == ConceptResourceLink.chunk_id)
            .where(ConceptResourceLink.concept_id == concept_id, visible)
        )
    ).all()
    candidates, sources = {}, {}
    for link, resource, chunk in links:
        authority = get_authority(
            SourceOrigin(resource.origin), ArtifactType(resource.artifact_type)
        )
        candidate = ResourceCandidate(
            resource.id,
            float(link.confidence),
            authority.curriculum_authority,
            float(link.depth_score),
            list(chunk.embedding)
            if chunk is not None and chunk.embedding is not None
            else None,
        )
        if (
            resource.id not in candidates
            or candidate.depth_score > candidates[resource.id].depth_score
        ):
            candidates[resource.id] = candidate
        sources.setdefault(
            resource.id,
            {
                "resource_id": resource.id,
                "title": resource.title,
                "origin": resource.origin,
                "artifact_type": resource.artifact_type,
                "citations": [],
            },
        )["citations"].append(
            {
                "chunk_id": link.chunk_id,
                "page_number": chunk.page_number if chunk else None,
                "snippet": chunk.text[:800] if chunk else None,
                "link_type": link.link_type,
            }
        )
    clusters = detect_near_duplicate_clusters(
        {cid: c.embedding for cid, c in candidates.items() if c.embedding is not None}
    )
    suppressed = set()
    for cluster in clusters:
        representative = max(
            cluster,
            key=lambda cid: (
                candidates[cid].authority + candidates[cid].depth_score,
                str(cid),
            ),
        )
        suppressed |= cluster - {representative}
    ranked = select_representative_resources(
        [c for cid, c in candidates.items() if cid not in suppressed]
    )
    resources = [
        {**sources[r.resource_id], "rank_score": r.score, "novelty": r.marginal_novelty}
        for r in ranked
    ]
    aliases = (
        (
            await session.execute(
                select(ConceptAlias.alias).where(ConceptAlias.concept_id == concept_id)
            )
        )
        .scalars()
        .all()
    )
    edge_rows = (
        await session.execute(
            select(ConceptEdge, EdgeEvidence, Resource)
            .join(EdgeEvidence, EdgeEvidence.edge_id == ConceptEdge.id)
            .join(Resource, Resource.id == EdgeEvidence.resource_id)
            .where(
                ConceptEdge.course_id == course_id,
                or_(
                    ConceptEdge.source_concept_id == concept_id,
                    ConceptEdge.target_concept_id == concept_id,
                ),
                visible,
            )
        )
    ).all()
    relationships = [
        {
            "source": e.source_concept_id,
            "target": e.target_concept_id,
            "edge_type": e.edge_type,
            "status": e.status,
            "confidence": float(e.confidence),
            "resource_id": r.id,
            "page_number": evidence.page_number,
            "snippet": evidence.snippet,
        }
        for e, evidence, r in edge_rows
    ]
    assessment_rows = (
        await session.execute(
            select(AssessmentItem, Assessment)
            .join(
                AssessmentItemConcept,
                AssessmentItemConcept.assessment_item_id == AssessmentItem.id,
            )
            .join(Assessment, Assessment.id == AssessmentItem.assessment_id)
            .join(Resource, Resource.id == Assessment.resource_id)
            .where(AssessmentItemConcept.concept_id == concept_id, visible)
        )
    ).all()
    evidence = []
    if student_id is not None:
        rows = (
            await session.execute(
                select(StudentEvidenceEvent).where(
                    StudentEvidenceEvent.student_id == student_id,
                    StudentEvidenceEvent.course_id == course_id,
                    StudentEvidenceEvent.concept_id == concept_id,
                )
            )
        ).scalars()
        evidence = [
            {
                "id": e.id,
                "type": e.evidence_type,
                "outcome": float(e.outcome) if e.outcome is not None else None,
                "certainty": float(e.certainty),
                "strength": float(e.strength),
                "resource_id": e.resource_id,
                "assessment_item_id": e.assessment_item_id,
                "occurred_at": e.occurred_at,
            }
            for e in rows
        ]
    return {
        "concept_id": concept.id,
        "name": concept.canonical_name,
        "definition": concept.short_definition,
        "scope": concept.scope,
        "aliases": aliases,
        "resources": resources,
        "relationships": relationships,
        "assessments": [
            {"assessment_id": a.id, "item_id": i.id, "title": a.title, "label": i.label}
            for i, a in assessment_rows
        ],
        "evidence": evidence,
        "suppressed_resource_count": len(suppressed),
    }


@router.get("/concepts/{concept_id}")
@router.get("/concepts/{concept_id}/why")
async def course_concept(
    course_id: UUID, concept_id: UUID, session: AsyncSession = Depends(get_db)
):
    return await concept_details(session, course_id, concept_id)


@router.get("/students/{student_id}/concepts/{concept_id}")
@router.get("/students/{student_id}/concepts/{concept_id}/why")
async def student_concept(
    course_id: UUID,
    student_id: UUID,
    concept_id: UUID,
    session: AsyncSession = Depends(get_db),
):
    return await concept_details(session, course_id, concept_id, student_id)
