from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import courses, mastery, ontology, personal_graph, resources, study
from app.config import get_settings

app = FastAPI(
    title="StudyGotchi Knowledge Engine",
    description="Canonical course ontology, personal knowledge graph, and mastery engine backend.",
)

# In development the Next.js frontend runs on a separate origin (localhost:3000)
# and talks to this API via NEXT_PUBLIC_API_URL, so browser requests need CORS.
if get_settings().environment == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
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


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
