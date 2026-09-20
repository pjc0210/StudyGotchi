# Ship tonight

19 September 2026, late. Submission Sunday 8 AM. This is the order that turns the existing plan into one live site.

The product page is the island. The graph, files, gaps, and study plan stay, but they are tabs on that site, not the thing we show first.

## What is already done

- Knowledge engine on `main`: ingest, graph, mastery, gaps, study plan.
- API deploy pieces on `be/deploy-ready` (PR #4) and two-phase student ingest on `be/fast-ingest` (PR #5).
- Graph UI on `main` under `/knowledge`.
- Island look in `prototypes/world-lab/`. Nothing imports from there.

## The spine

```
landing  →  world (fixture, then live API)  →  upload updates the island  →  visit link
                ↘ knowledge / files / gaps / study (same records)
```

Work in this order. Each step leaves something a judge can click.

1. **The page.** Landing at `/`. World at `/world`, rendering a real `WorldOut` fixture. World is the first tab in the existing shell. Visit route `/w/[token]` is the same canvas, no upload. Site builds with mock data and no vendor keys.
2. **Accounts.** Clerk and Vercel first, so the page is on a URL. Then Neon, Railway, Anthropic, Voyage, so the API can leave mock mode. Checklist is in `docs/costs-and-accounts.md`.
3. **Identity.** Clerk JWT on the API, `students` table, `GET /api/me`. Student routes stop trusting the id in the path.
4. **World records.** Places from the concept graph, `GET .../world`, richer seed, fixture dump from the database. The canvas swaps fixture for the live payload when `NEXT_PUBLIC_USE_MOCK_DATA=false`.
5. **Share and visit.** Token routes. Public projection strips file names, scores, and mastery.
6. **Clean.** Merge PRs #4 and #5. One CI workflow. Freeze new routes after rehearsal.

## What the site needs from you (accounts)

Do these in this order. The page can go live after step 2. Ingest and sign-in become real after the rest.

| Order | Account | Where the values go | Needed for |
| --- | --- | --- | --- |
| 1 | Clerk (new application, email + one social) | Vercel: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. Railway: `CLERK_ISSUER`, `CLERK_AUTHORIZED_PARTIES` | Sign-in |
| 2 | Vercel (import this repo, root `frontend/`, branch `main`) | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_USE_MOCK_DATA=false` once the API is up. Until then `true` is fine. | The public URL |
| 3 | Neon (database `studygotchi`, pooled string) | Railway: `DATABASE_URL` as `postgresql+asyncpg://...?ssl=require` | Saved worlds |
| 4 | Railway (repo root `backend/`, Dockerfile) | Every API variable from the infra plan | Ingest and `/world` |
| 5 | Anthropic (key + a few dollars, $30 monthly cap) | Railway: `ANTHROPIC_API_KEY`, model ids | Reading files |
| 6 | Voyage (`voyage-3`) | Railway: `VOYAGE_API_KEY` | Matching files to topics |

Local `.env` on a laptop can stay `AUTH_MODE=dev` until Clerk keys exist. Never commit a `.env`.

## File homes

New product files live in `frontend/`. The lab stays a look test.

```
frontend/
  app/page.tsx                         landing
  app/world/page.tsx                   signed-in world (shell + canvas)
  app/knowledge/page.tsx               existing graph shell
  app/w/[token]/page.tsx               visit
  app/sign-in/[[...sign-in]]/          Clerk screen (works once keys exist)
  app/sign-up/[[...sign-up]]/
  components/world/                    WorldPage, WorldCanvas, Island, Blob, Character
  lib/world/types.ts                   WorldOut contract
  lib/world/fixture.json               dumped WorldOut so the island runs with the API off
  lib/world/layout.ts                  stable place and spot positions from ids
  lib/toon.ts  lib/seed.ts
backend/                               identity, places, projection, shares (tasks 2, 4, 5, 7)
```

`WorldCanvas` takes `{ world, readOnly, selectedId, onSelect }`. It does not score. Spot height, cracks, and character state come from the payload.

## Checks

- `/` is a landing page, not a redirect into the graph.
- `/world` draws the fixture at 60 frames per second on the dev laptop.
- Clicking a spot or resident calls `select` and the existing inspector can open.
- `npm run build` in `frontend/` succeeds with mock data and no Clerk keys.
- After keys: signed-out `/world` goes to sign-in; `/w/anything` stays public.
- After the API: `/api/me` returns a student id; A's token on B's path is 403.

## What we are not doing tonight

No new art pipeline. No second host. No worker service. No rewrite of the graph UI. No import from `prototypes/world-lab/` into the product bundle.
