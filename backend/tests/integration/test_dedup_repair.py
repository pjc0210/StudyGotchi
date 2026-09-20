"""Repair must preserve a usable DAG when merging vertices closes a cycle."""

from itertools import pairwise
from uuid import UUID, uuid4

import networkx as nx
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.domain.graph.algorithms import build_digraph
from app.domain.ontology.concepts import ConceptKind, Granularity
from app.domain.ontology.edges import ConceptEdgeType
from app.repositories.concepts import add_alias, create_concept, get_course_concepts
from app.repositories.courses import create_course
from app.repositories.edges import get_course_edges, upsert_concept_edge
from scripts.repair_duplicate_concepts import repair_course


@pytest.mark.asyncio
async def test_reviewed_repair_cleans_new_cycles_and_is_idempotent(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'repair.db'}")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        course = await create_course(
            session, name="Repair regression", code=None, term=None
        )
        nodes = []
        for name in ["Regular Language", "Bridge", "Regular Languages"]:
            nodes.append(
                await create_concept(
                    session,
                    course_id=course.id,
                    canonical_name=name,
                    short_definition=name,
                    concept_kind=ConceptKind.DEFINITION,
                    granularity=Granularity.CORE,
                )
            )
        for source, target in pairwise(nodes):
            await upsert_concept_edge(
                session,
                course_id=course.id,
                source_concept_id=source.id,
                target_concept_id=target.id,
                edge_type=ConceptEdgeType.PREREQUISITE_FOR,
                confidence=0.9,
                authority_weight=1.0,
            )
        await add_alias(session, concept_id=nodes[2].id, alias="Regular Language")
        await session.commit()
        skipped = await repair_course(
            session, course.id, dry_run=False, approved_survivors={uuid4()}
        )
        assert skipped["clusters_merged"] == 0
        preview = await repair_course(session, course.id, dry_run=True)
        survivor = UUID(preview["clusters"][0]["survivor"])
        result = await repair_course(
            session, course.id, dry_run=False, approved_survivors={survivor}
        )
        assert result["clusters_merged"] == 1
        assert len(await get_course_concepts(session, course.id)) == 2
        graph = build_digraph(
            await get_course_edges(session, course.id),
            {ConceptEdgeType.PREREQUISITE_FOR},
        )
        assert nx.is_directed_acyclic_graph(graph)
        again = await repair_course(session, course.id, dry_run=False)
        assert again["clusters_merged"] == 0
    await engine.dispose()
