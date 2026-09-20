# StudyGotchi

<<<<<<< HEAD
Clickable frontend mock: a pastel earth, the courses you study, and a login path.

```bash
cd web
=======
HackMIT 2026. A hosted study world: your knowledge is the map, topics are places, and small characters stay where your work met the course.

## Repo

- `frontend/`: Next.js site (graph UI is already here; the 3D world goes next)
- `backend/`: knowledge engine (ingest, personal graph, mastery)
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

Backend (from `backend/`): follow `.env.example`, then the usual uv/docker flow in that folder.

Frontend:

```bash
cd frontend
>>>>>>> origin/main
npm install
npm run dev
```

<<<<<<< HEAD
Open http://localhost:3000. Any email/password logs in. Email containing `2fa` plus code `123456` demos two-factor.

- `/` — main page
- `/earth` — courses beside the same earth
- `/login` — Start and Login land here; success goes to `/earth`

The UI is a **Next.js** App Router app (React 19).
=======
Set `NEXT_PUBLIC_API_URL` to the backend. Mock data is on by default until you point the client at a live API.

## Product rules

The world and the graph use the same records. Worlds start private. A visit link is read only and must not leak files or grades. Instructor solutions are not student evidence.

Frank owns the Vercel deploy.
>>>>>>> origin/main
