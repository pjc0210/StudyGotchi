"""Print graph quality and canonical concept names without source text or secrets."""

import argparse
import asyncio
import json
from uuid import UUID

from app.api.routes.debug import metrics
from app.db.session import async_session_factory, engine
from app.repositories.concepts import get_course_concepts


async def run(course_id):
    async with async_session_factory() as session:
        print(json.dumps(await metrics(course_id, session), indent=2))
        print(
            json.dumps(
                [
                    c.canonical_name
                    for c in (await get_course_concepts(session, course_id)).values()
                ],
                indent=2,
            )
        )
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("course_id", type=UUID)
    asyncio.run(run(parser.parse_args().course_id))
