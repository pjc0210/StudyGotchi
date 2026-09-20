"""Make sure a Clerk user has a student row, and print its id.

Run: python -m scripts.ensure_student user_xxx [--name "Display Name"]
Uses DATABASE_URL like every other script, so point it at the database you mean.
"""

import argparse
import asyncio

from app.db.session import async_session_factory, engine
from app.repositories.students import get_or_create_student


async def run(args):
    async with async_session_factory() as session:
        student_id = await get_or_create_student(session, clerk_user_id=args.clerk_user_id, display_name=args.name)
    await engine.dispose()
    print(student_id)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("clerk_user_id")
    parser.add_argument("--name", default=None)
    asyncio.run(run(parser.parse_args()))
