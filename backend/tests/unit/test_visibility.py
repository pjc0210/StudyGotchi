"""The one visibility rule: a student sees the course's concepts and their own personal ones."""

from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.domain.ontology.concepts import ConceptKind, ConceptScope, Granularity
from app.repositories.concepts import (
    add_alias,
    create_concept,
    get_alias_index,
    get_visible_concepts,
    get_visible_embeddings,
)
from app.repositories.courses import create_course


@pytest.mark.asyncio
async def test_visibility_matrix(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'v.db'}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    me, other = uuid4(), uuid4()

    async with factory() as session:
        course = await create_course(session, name="Visibility", code=None, term=None)

        async def concept(name, scope, owner=None):
            node = await create_concept(
                session,
                course_id=course.id,
                canonical_name=name,
                short_definition=None,
                concept_kind=ConceptKind.DEFINITION,
                granularity=Granularity.CORE,
                embedding=[1.0, 0.0],
                scope=scope,
                owner_student_id=owner,
            )
            await add_alias(session, concept_id=node.id, alias=f"{name} alias", source_resource_id=None)
            return node.id

        shared = await concept("Shared", ConceptScope.COURSE)
        mine = await concept("Mine", ConceptScope.PERSONAL, me)
        theirs = await concept("Theirs", ConceptScope.PERSONAL, other)
        await session.commit()

        visible = await get_visible_concepts(session, course.id, me)
        assert set(visible) == {shared, mine}
        assert set(await get_visible_embeddings(session, course.id, me)) == {shared, mine}
        assert set(get_alias_index and (await get_alias_index(session, course.id, me)).values()) == {shared, mine}

        anonymous = await get_visible_concepts(session, course.id, None)
        assert set(anonymous) == {shared}
        assert theirs not in await get_visible_concepts(session, course.id, me)
    await engine.dispose()
