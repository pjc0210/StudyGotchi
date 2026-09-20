"""`GET .../knowledge-graph` (spec: "Required backend endpoints"). The
primary semantic product endpoint — a separate frontend/world system
consumes this, never the raw canonical ontology.
"""

import hashlib
import json
from dataclasses import asdict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, require_student
from app.api.etag import etag_matches, not_modified, set_etag
from app.config import get_settings
from app.domain.personal_graph.projection import project_graph
from app.pipelines.personal_graph_query import build_student_personal_graph
from app.repositories.courses import get_course
from app.repositories.student_states import get_student_concept_states
from app.schemas.personal_graph import (
    PersonalGraphEdgeOut,
    PersonalGraphNodeOut,
    PersonalGraphResponse,
)

router = APIRouter(
    prefix="/api/courses/{course_id}/students/{student_id}", tags=["personal-graph"]
)


@router.get("/knowledge-graph", response_model=PersonalGraphResponse)
async def get_knowledge_graph_endpoint(
    course_id: UUID,
    student_id: UUID,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db),
    _: UUID = Depends(require_student),
):
    if await get_course(session, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    graph = await build_student_personal_graph(
        session, course_id=course_id, student_id=student_id
    )

    version = hashlib.sha256(
        json.dumps(asdict(graph), default=str, sort_keys=True).encode()
    ).hexdigest()[:16]
    if etag_matches(request, version):
        return not_modified(version)
    set_etag(response, version)
    states = await get_student_concept_states(session, student_id=student_id, course_id=course_id)
    metrics = project_graph(graph, states, staleness_days=get_settings().staleness_days)
    return PersonalGraphResponse(
        graph_version=version,
        student_id=student_id,
        course_id=course_id,
        nodes=[
            PersonalGraphNodeOut(
                concept_id=n.concept_id,
                name=n.name,
                scope=n.scope,
                discovery_state=n.discovery_state,
                importance=n.importance,
                personal_relevance=n.personal_relevance,
                understanding=n.understanding,
                cluster_id=n.cluster_id,
                cluster=n.cluster,
                mastery=n.understanding,
                familiarity=n.personal_relevance,
                confidence=metrics[n.concept_id].confidence,
                readiness=metrics[n.concept_id].readiness,
                fragility=metrics[n.concept_id].fragility,
                state=metrics[n.concept_id].state,
            )
            for n in graph.nodes
        ],
        edges=[
            PersonalGraphEdgeOut(
                source=e.source,
                target=e.target,
                edge_type=e.edge_type,
                origin=e.origin,
                confidence=e.confidence,
            )
            for e in graph.edges
        ],
        hidden_concept_count=graph.hidden_concept_count,
    )
