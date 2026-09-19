from fastapi import FastAPI

from app.api.routes import courses, mastery, ontology, personal_graph, resources, study

app = FastAPI(
    title="StudyGotchi Knowledge Engine",
    description="Canonical course ontology, personal knowledge graph, and mastery engine backend.",
)

app.include_router(courses.router)
app.include_router(resources.router)
app.include_router(ontology.router)
app.include_router(personal_graph.router)
app.include_router(mastery.router)
app.include_router(study.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
