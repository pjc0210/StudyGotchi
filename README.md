# StudyGotchi

Clickable frontend mock: a pastel earth, the courses you study, and a login path.

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000. Any email/password logs in. Email containing `2fa` plus code `123456` demos two-factor.

- `/` — main page
- `/earth` — courses beside the same earth
- `/login` — Start and Login land here; success goes to `/earth`

The UI is a **Next.js** App Router app (React 19).
