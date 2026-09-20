"""Development-only graph quality and ingestion diagnostics."""

from uuid import UUID

import networkx as nx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db
from app.config import get_settings
from app.db.models import Concept, ConceptResourceLink, Resource, ResourceChunk
from app.domain.graph.algorithms import build_digraph
from app.domain.ontology.edges import ConceptEdgeType
from app.repositories.courses import get_course
from app.repositories.edges import get_course_edges

router = APIRouter(prefix="/api/courses/{course_id}/debug", tags=["debug"])


async def require_debug(course_id, session):
    if (
        get_settings().environment != "development"
        or await get_course(session, course_id) is None
    ):
        raise HTTPException(404, "Not found")


@router.get("/metrics")
async def metrics(course_id: UUID, session: AsyncSession = Depends(get_db)):
    await require_debug(course_id, session)
    edges = await get_course_edges(session, course_id)
    graph = build_digraph(edges, edge_types={ConceptEdgeType.PREREQUISITE_FOR})
    concepts = await session.scalar(
        select(func.count()).select_from(Concept).where(Concept.course_id == course_id)
    )
    without_sources = await session.scalar(
        select(func.count())
        .select_from(Concept)
        .where(
            Concept.course_id == course_id,
            ~select(ConceptResourceLink.id)
            .where(ConceptResourceLink.concept_id == Concept.id)
            .exists(),
        )
    )
    return {
        "concept_count": concepts,
        "prerequisite_edge_count": graph.number_of_edges(),
        "related_edge_count": sum(
            e.edge_type == ConceptEdgeType.RELATED_TO for e in edges
        ),
        "cycle_count_after_cleanup": len(list(nx.simple_cycles(graph))),
        "concepts_without_sources": without_sources,
        "display_redundant_edge_count": sum(
            bool(e.metadata.get("is_redundant_in_display_graph")) for e in edges
        ),
    }


@router.get("/resources/{resource_id}")
async def resource_debug(
    course_id: UUID, resource_id: UUID, session: AsyncSession = Depends(get_db)
):
    await require_debug(course_id, session)
    resource = await session.get(Resource, resource_id)
    if resource is None or resource.course_id != course_id:
        raise HTTPException(404, "Resource not found")
    chunks = (
        await session.execute(
            select(ResourceChunk)
            .where(ResourceChunk.resource_id == resource_id)
            .order_by(ResourceChunk.chunk_index)
        )
    ).scalars()
    return {
        "resource_id": resource.id,
        "status": resource.status,
        "title": resource.title,
        "origin": resource.origin,
        "artifact_type": resource.artifact_type,
        "chunks": [
            {
                "id": c.id,
                "page_number": c.page_number,
                "text": c.text,
                "extraction": c.chunk_metadata.get("extraction"),
            }
            for c in chunks
        ],
    }
