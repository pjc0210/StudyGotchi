from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from openai import APIError

from app.api.routes import (
    concepts,
    courses,
    debug,
    me,
    ontology,
    personal_graph,
    resources,
    study,
    understanding,
    world,
)
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title="StudyGotchi Knowledge Engine",
    description="Canonical course ontology, personal knowledge graph, and understanding-scoring backend.",
)

# The site runs on a different origin (Vercel) and uploads straight to this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["ETag"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)

app.include_router(me.router)
app.include_router(courses.router)
app.include_router(concepts.router)
app.include_router(resources.router)
app.include_router(ontology.router)
app.include_router(personal_graph.router)
app.include_router(understanding.router)
app.include_router(study.router)
app.include_router(world.router)
if not settings.is_production:
    app.include_router(debug.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.exception_handler(ValueError)
async def invalid_input(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Invalid document or request data",
            "error_type": type(exc).__name__,
        },
    )


@app.exception_handler(APIError)
async def provider_error(request: Request, exc: APIError):
    return JSONResponse(
        status_code=502,
        content={
            "detail": "OpenAI request failed; retry ingestion after checking provider configuration",
            "error_type": type(exc).__name__,
        },
    )
