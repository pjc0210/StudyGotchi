# Costs, credits, and accounts

What the weekend build costs, what we already have, and which accounts the team lead creates before coding starts. Prices marked verified were read from the vendor pricing pages on 19 September 2026. Anything marked check was not read today and should be confirmed at sign-up.

## What costs money

| Item | Expected spend this weekend | Basis |
| --- | --- | --- |
| Anthropic, course preload (8.223, about 24 PDFs) | $4 to $6, budget $15 for retries | Sonnet-class at $2 per million input tokens and $10 per million output (verified). Roughly 300 chunks, 0.6M input, 0.3M output. |
| Anthropic, student files during build and demo | under $1 | Haiku-class at $1 in and $5 out per million (verified). A six-page pset is about four cents. |
| Voyage embeddings | under $1 | About 0.3M tokens for the course plus candidates. Pricing not read today (check). Voyage has offered a free token allowance to new accounts (check). |
| Neon Postgres | $0 | Free plan covers a small database with autosuspend (check exact limits at sign-up). |
| Railway | $0 to $5 | New accounts get a trial credit; the Hobby plan is $5 per month if the trial runs out (check). One small always-on service. |
| Vercel Hobby | $0 | Verified. Non-commercial use, 4.5 MB request body cap, one deploy owner. |
| Clerk | $0 | Verified. Hobby tier: 50,000 monthly retained users, prebuilt UI, 3 dashboard seats, "Secured by Clerk" badge. |
| GitHub Actions | $0 | Free minutes cover two short jobs per push. |
| Cloudflare quick tunnel (fallback only) | $0 | `cloudflared tunnel --url` needs no account. |
| Domain | $0 | Not needed. The Vercel URL is the product URL. |
| 3D asset generation (Tripo, Rodin) | $0 tonight | Characters are procedural blobs. The other budget estimate for generated meshes was about $30 and is not in scope for Saturday. |

Total: under $25, almost all of it Anthropic. Everything else fits a free tier.

## Credits we can claim

From the HackMIT sponsor credits document (read 19 September 2026):

| Sponsor | Credit | Useful for us | Condition |
| --- | --- | --- | --- |
| OpenAI | $50 API and $50 Codex per person | Would cover all model spend if we swapped the provider | Only for teams submitting to the OpenAI track |
| Meta | $50 model API credits | Same, OpenAI-SDK compatible | Sign up at dev.meta.ai plus intake form |
| Google | Gemini free tier | Free extraction, native PDF input | Rate limited; prompts used for product improvement |
| Deepgram | $200 per hacker | Creature voices later, not tonight | No card |
| Cognition | $1,000 Devin credits per team | Not needed | Form |
| Runpod | $15 | Not needed | Booth |
| Cursor | 1 month Pro | Already in use | Booth code |
| Warp | 1 month Build | Optional | Checkout code |

No Anthropic credit is on the list. The backend is wired to Anthropic and Voyage, and rewiring the provider tonight would cost more time than the $15 it saves. Pay the Anthropic bill. If the OpenAI track fits the submission, the credits pay for a Sunday provider swap, not a Saturday one.

## What we already have

- Backend knowledge engine on `main`: ingest, canonicalization, prerequisite graph, mastery, personal graph, gaps, study plan, unit tests. This is most of the product.
- Frontend on `main`: graph view, inspector, upload queue, gaps and study panels, Tailwind theme.
- `prototypes/world-lab/`: island terrain, biomes, procedural blob creature, props, toon shading, camera snap. The world canvas is a lift, not a rewrite.
- `assets/creatures/cc0/`: rigged CC0 animal models from Kenney, Gobkit and Poly Pizza with a license ledger, in case we want a second creature body later.
- `docs/research/game-art/`: style rules (bold held poses, no outlines, flat toon shading, colour-coded state bubbles) and the reasoning behind island over planet.
- `course-materials/`: seven course archives, including the demo student's own worked copies and graded exams.
- Sponsor credits above.

## Accounts to create (team lead)

Create these in this order. Each line says what to copy and where it goes.

1. Anthropic console. Create an API key. Copy to Railway as `ANTHROPIC_API_KEY`. Pick the two model ids from the models page: the strong one goes in `ANTHROPIC_MODEL` and `ANTHROPIC_VISION_MODEL`, the fast one in `ANTHROPIC_FAST_MODEL`. Add a few dollars of credit and set a monthly limit of $30. Note the rate limit tier; concurrency 6 is safe at any tier.
2. Voyage AI. Create an API key. Copy to Railway as `VOYAGE_API_KEY`. Keep `VOYAGE_EMBED_MODEL=voyage-3` because the schema is 1024 dimensions.
3. Neon. New project, region closest to Railway's, database `studygotchi`. Copy the pooled connection string and rewrite the scheme to `postgresql+asyncpg://` with `?ssl=require` at the end. Goes to Railway as `DATABASE_URL`. Run `alembic upgrade head` from a laptop once to confirm the `vector` extension is allowed on the plan.
4. Railway. New project from the GitHub repo, root directory `backend`, Dockerfile build. Set every API variable from the plan. Railway injects `PORT`; the Dockerfile reads it. Copy the public URL to Vercel as `NEXT_PUBLIC_API_URL` and add it to `CLERK_AUTHORIZED_PARTIES` and `CORS_ORIGINS` on the API side.
5. Clerk. New application. Enable email and one social provider. On the Vercel `.vercel.app` domain use the development instance keys; a production instance requires a custom domain with DNS records, which we do not have tonight. Copy the publishable key and secret key to Vercel. Copy the issuer URL (the `https://...clerk.accounts.dev` value shown on the API keys or JWT templates page) to Railway as `CLERK_ISSUER`. Add `http://localhost:3000` and the Vercel URL to allowed origins.
6. Vercel. Import the GitHub repo, root directory `frontend`, framework Next.js, production branch `main`. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_USE_MOCK_DATA=false`. Only the deploy owner's account is connected.
7. GitHub. Branch protection on `main`: require the two CI checks, block force pushes. Add `ANTHROPIC_API_KEY` and `VOYAGE_API_KEY` as repository secrets only if a workflow ever needs them; the CI jobs in the plan do not.

Local `.env` files for teammates use `AUTH_MODE=dev` against the Docker Postgres, with the same two vendor keys. Never commit a `.env`.

## Things that look free and are not

- Vercel Hobby is for non-commercial projects and a personal account. Teammates push through GitHub; they do not get Vercel seats.
- Clerk's free tier shows a badge on the sign-in screen. Fine for judging.
- Neon autosuspends idle compute. The first request after a pause takes a second longer. Warm it before the demo with one request.
- Railway trial credit runs on wall-clock time for an always-on service. If the trial ends mid-weekend the service stops; the Hobby plan fixes that for $5.
- Anthropic rate limits, not price, are the ceiling on preload speed. If the console shows a low tier, drop `INGEST_CONCURRENCY` to 3.
