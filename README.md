# StudyGotchi

HackMIT 2026. A hosted study world: your knowledge is the map, topics are places, and small characters stay where your work met the course.

## Repo

- `frontend/`: the site. Next.js on Vercel: landing, Clerk sign-in, `/earth` (the world), `/knowledge` (the graph)
- `backend/`: the knowledge engine on Railway. FastAPI: ingest, personal graph, understanding, world projection
- `development/web/`: PJ's landing, earth, and login mock. The site's look comes from here; it is not deployed
- `build_spec.md`: what we are building and where files live
- `docs/prd.md`: product requirements and the demo arc
- `docs/architecture.md`: system, ingest, data model and state diagrams
- `docs/learning-model.md`: evidence to numbers to island, user stories
- `docs/costs-and-accounts.md`: what costs money, credits, accounts to create
- `docs/plans/infra-and-build-plan.md`: hosting, contracts between people, tasks and timeline
- `backend/graph_engine/backend_build_spec.md`: scoring and API detail
- `course-materials/`: local course archives. Do not serve these as a public folder.
- `prototypes/world-lab/`: optional look test, not the product

## Run

Backend (from `backend/`):

```bash
cp .env.example .env   # add OPENAI_API_KEY; AUTH_MODE=dev for local work
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

Frontend (from `frontend/`):

```bash
cp .env.example .env.local   # Clerk keys; NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev
```

Open http://localhost:3000. `NEXT_PUBLIC_USE_MOCK_DATA=true` runs the site without a backend or keys.

## Checks

```bash
cd backend && uv run ruff check app tests scripts && LLM_PROVIDER=fake AUTH_MODE=dev uv run pytest -q
cd frontend && npx tsc --noEmit && npm run build
```

## Product rules

The world and the graph use the same records. Worlds start private. A visit link is read only and must not leak files or grades. Instructor solutions are not student evidence.
