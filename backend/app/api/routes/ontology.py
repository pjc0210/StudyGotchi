"""`GET .../ontology` (spec: "Required backend endpoints"). Primarily a
debug/admin view of the canonical course graph — the world/frontend
equivalent consumes `.../knowledge-graph` instead, never this directly.
"""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.repositories.concepts import get_course_concepts
from app.repositories.courses import get_course
from app.repositories.edges import get_course_edges
from app.schemas.ontology import ConceptEdgeOut, ConceptOut, OntologyResponse

router = APIRouter(prefix="/api/courses/{course_id}", tags=["ontology"])


@router.get("/ontology", response_model=OntologyResponse)
async def get_ontology_endpoint(
    course_id: UUID,
    view: Literal["canonical", "reduced"] = "canonical",
    session: AsyncSession = Depends(get_db),
) -> OntologyResponse:
    if await get_course(session, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    concepts = await get_course_concepts(session, course_id)
    edges = await get_course_edges(session, course_id)

    return OntologyResponse(
        course_id=course_id,
        concepts=[
            ConceptOut(
                id=c.id,
                canonical_name=c.canonical_name,
                short_definition=c.short_definition,
                concept_kind=c.concept_kind,
                granularity=c.granularity,
                importance=c.importance,
                scope=c.scope,
            )
            for c in concepts.values()
        ],
        edges=[
            ConceptEdgeOut(
                id=e.id,
                source_concept_id=e.source_concept_id,
                target_concept_id=e.target_concept_id,
                edge_type=e.edge_type,
                confidence=e.confidence,
                authority_weight=e.authority_weight,
                status=e.status,
                is_redundant_in_display_graph=bool(
                    e.metadata.get("is_redundant_in_display_graph", False)
                ),
            )
            for e in edges
            if view == "canonical"
            or (
                e.status == "active"
                and not e.metadata.get("is_redundant_in_display_graph")
            )
        ],
    )
