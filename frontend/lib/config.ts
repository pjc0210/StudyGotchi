/**
 * The site's runtime mode, read once. Everything else asks this module rather
 * than the environment, so the mode has one home (the middleware included).
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Mock mode: the site runs on fixtures with no backend and no account. */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";

/** Local sandbox: an API running with AUTH_MODE=dev trusts this id instead of Clerk. */
export const DEV_STUDENT_ID = process.env.NEXT_PUBLIC_DEV_STUDENT_ID ?? "";

/** Whether signed-in routes are gated by Clerk at all. */
export const SITE_GATED = !USE_MOCK && !DEV_STUDENT_ID;

/** Optional pinned course; otherwise the first one /api/me returns. */
export const DEMO_COURSE_ID = process.env.NEXT_PUBLIC_DEMO_COURSE_ID ?? "";
