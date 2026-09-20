from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.routes import (
    concept_detail,
    courses,
    mastery,
    ontology,
    personal_graph,
    resources,
    study,
)

app = FastAPI(
    title="StudyGotchi Knowledge Engine",
    description="Canonical course ontology, personal knowledge graph, and mastery engine backend.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(courses.router)
app.include_router(resources.router)
app.include_router(ontology.router)
app.include_router(personal_graph.router)
app.include_router(mastery.router)
app.include_router(study.router)
app.include_router(concept_detail.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
