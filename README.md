# StudyGotchi

HackMIT 2026. A hosted study world: your knowledge is the map, topics are places, and small characters stay where your work met the course.

## Repo

- `frontend/`: Next.js site (graph UI is already here; the 3D world goes next)
- `backend/`: knowledge engine (ingest, personal graph, mastery)
- `build_spec.md`: what we are building and where files live
- `backend/graph_engine/backend_build_spec.md`: scoring and API detail
- `course-materials/`: local course archives. Do not serve these as a public folder.
- `prototypes/world-lab/`: optional look test, not the product

## Run

Backend (from `backend/`): follow `.env.example`, then the usual uv/docker flow in that folder.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` to the backend. Mock data is on by default until you point the client at a live API.

## Product rules

The world and the graph use the same records. Worlds start private. A visit link is read only and must not leak files or grades. Instructor solutions are not student evidence.

One teammate owns the Vercel deploy.
