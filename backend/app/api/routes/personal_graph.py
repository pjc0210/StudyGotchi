"""`GET .../knowledge-graph` (spec: "Required backend endpoints"). The
primary semantic product endpoint — a separate frontend/world system
consumes this, never the raw canonical ontology.
"""

import hashlib
import json
from dataclasses import asdict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db, require_student
from app.domain.personal_graph.concept_state import classify_concept_state
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
    session: AsyncSession = Depends(get_db),
    _: UUID = Depends(require_student),
) -> PersonalGraphResponse:
    if await get_course(session, course_id) is None:
        raise HTTPException(status_code=404, detail="Course not found")

    graph = await build_student_personal_graph(
        session, course_id=course_id, student_id=student_id
    )

    version = hashlib.sha256(
        json.dumps(asdict(graph), default=str, sort_keys=True).encode()
    ).hexdigest()[:16]
    # Staleness needs the practice timestamp, which the graph builder does not carry.
    states = await get_student_concept_states(session, student_id=student_id, course_id=course_id)
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
                confidence=_confidence(states.get(n.concept_id)),
                readiness=_readiness(n.understanding, states.get(n.concept_id)),
                fragility=_fragility(states.get(n.concept_id)),
                state=classify_concept_state(
                    discovery_state=n.discovery_state,
                    mastery=n.understanding,
                    confidence=_confidence(states.get(n.concept_id)),
                    fragility=_fragility(states.get(n.concept_id)),
                    last_practiced_at=(
                        states[n.concept_id].last_practiced_at if n.concept_id in states else None
                    ),
                ),
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


def _evidence_total(state: object | None) -> float:
    if state is None:
        return 0.0
    return float(state.positive_evidence) + float(state.negative_evidence)


def _confidence(state: object | None) -> float:
    total = _evidence_total(state)
    return total / (total + 1.0) if total else 0.0


def _fragility(state: object | None) -> float:
    total = _evidence_total(state)
    return float(state.negative_evidence) / total if state is not None and total else 0.0


def _readiness(mastery: float | None, state: object | None) -> float:
    return (mastery or 0.0) * (1.0 - _fragility(state))
