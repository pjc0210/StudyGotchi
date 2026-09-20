"""Deep analysis runs after the HTTP response, in the API process, with its own session.

The request session is closed by the time this runs, so every step opens a fresh one. A
failure lands on the resource row (status `failed`, `metadata.error`) and leaves the fast
phase results in place; the client can retry the same file.
"""

import logging
from uuid import UUID

from app.db.session import async_session_factory
from app.pipelines.student_ingestion import analyze_student_resource
from app.providers.llm import get_llm_provider
from app.repositories.resources import merge_resource_metadata, update_resource_status

log = logging.getLogger(__name__)


async def run_student_analysis(resource_id: UUID) -> None:
    try:
        provider = get_llm_provider()
        # Student files go to the cheaper model when the provider offers one.
        provider = getattr(provider, "fast", lambda: provider)()
        async with async_session_factory() as session:
            await update_resource_status(session, resource_id, "analyzing")
            await session.commit()
            await analyze_student_resource(session, provider, resource_id=resource_id)
            await session.commit()
    except Exception as exc:
        log.exception("student analysis failed resource_id=%s", resource_id)
        async with async_session_factory() as session:
            await merge_resource_metadata(session, resource_id, error=str(exc)[:500])
            await update_resource_status(session, resource_id, "failed")
            await session.commit()
