"""Re-embed every active concept with the configured embedding model.

Vectors from different embedding models are not comparable even at the same
dimension, so after switching models (or restoring a snapshot made with another
one) run this once. Student-file matching and candidate resolution both compare
against `Concept.embedding`.

Run: python -m scripts.reembed_concepts [--course COURSE_ID] [--dry-run]
"""

import argparse
import asyncio
import json
from uuid import UUID

from sqlalchemy import select

from app.config import get_settings
from app.db.models import Concept
from app.db.session import async_session_factory, engine
from app.providers.llm import get_llm_provider


async def run(args):
    provider = get_llm_provider()
    settings = get_settings()
    async with async_session_factory() as session:
        stmt = select(Concept).where(Concept.status == "active")
        if args.course:
            stmt = stmt.where(Concept.course_id == UUID(args.course))
        rows = list((await session.execute(stmt)).scalars().all())
        print(json.dumps({"concepts": len(rows), "model": settings.openai_embed_model, "dims": settings.openai_embed_dimensions}))
        if args.dry_run or not rows:
            return
        texts = [f"{c.canonical_name}: {c.short_definition}" if c.short_definition else c.canonical_name for c in rows]
        vectors = await provider.embed(texts)
        for row, vector in zip(rows, vectors, strict=True):
            row.embedding = vector
            row.concept_metadata = {**(row.concept_metadata or {}), "embedding_model": settings.openai_embed_model}
        await session.commit()
        print(json.dumps({"reembedded": len(rows)}))
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--course", default=None, help="Only this course id")
    parser.add_argument("--dry-run", action="store_true")
    asyncio.run(run(parser.parse_args()))
