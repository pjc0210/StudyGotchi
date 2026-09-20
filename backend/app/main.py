from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import courses, mastery, me, ontology, personal_graph, resources, study
from app.config import get_settings

app = FastAPI(
    title="StudyGotchi Knowledge Engine",
    description="Canonical course ontology, personal knowledge graph, and mastery engine backend.",
)

# The site runs on a different origin (Vercel) and uploads straight to this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(me.router)
app.include_router(courses.router)
app.include_router(resources.router)
app.include_router(ontology.router)
app.include_router(personal_graph.router)
app.include_router(mastery.router)
app.include_router(study.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
