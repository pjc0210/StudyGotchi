"""Export persisted personal graph and world through the actual API contracts."""

import argparse
import asyncio
import json
from pathlib import Path
from uuid import UUID

from app.api.routes.personal_graph import get_knowledge_graph_endpoint
from app.api.routes.world import get_world
from app.db.session import async_session_factory, engine


async def run(args):
    async with async_session_factory() as session:
        graph = await get_knowledge_graph_endpoint(
            args.course_id, args.student_id, session
        )
        world = await get_world(args.course_id, args.student_id, session)
        output = {
            "knowledge_graph": graph.model_dump(mode="json"),
            "world": world.model_dump(mode="json"),
        }
        Path(args.output).write_text(json.dumps(output, indent=2) + "\n")
        print(
            f"Exported {len(graph.nodes)} personal concepts and {len(world.regions)} world regions to {args.output}"
        )
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("course_id", type=UUID)
    parser.add_argument("student_id", type=UUID)
    parser.add_argument("output")
    asyncio.run(run(parser.parse_args()))
