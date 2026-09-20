/** Landing paper copy: stamps, states, and the one CTA. Pixel labels stay 11/22. */

export const LANDING_HEADLINE = "Turn in a problem set. Someone moves in.";

export const LANDING_BODY =
  "Your lecture PDFs, problem sets, and exam feedback become a small world. Ideas you touch sprout, ideas you demonstrate become landmarks, and every resident can tell you which page it came from.";

export const LANDING_STATES = [
  { id: "touched", n: 1, label: "Touched", mark: "hollow", note: "Lecture opened. A sprout." },
  { id: "demonstrated", n: 2, label: "Demonstrated", mark: "filled", note: "Problem solved. A landmark." },
  { id: "mastered", n: 3, label: "Mastered", mark: "lamp", note: "Confirmed. The light stays on." },
] as const;

export type LandingState = (typeof LANDING_STATES)[number];

export const LANDING_WINDOW_STATS = [
  { label: "Windows", value: "3" },
  { label: "Residents", value: "3" },
] as const;

export const LANDING_PROVENANCE = {
  tab: "Course",
  code: "8.223",
  speaker: "Pip",
  line: "Has reorganized the same three notes twice.",
  source: "P.14 · PSET 2",
} as const;

export function landingCourseStamp(
  course: { code?: string | null; name?: string | null } | null | undefined,
): string {
  const code = course?.code?.trim();
  const title = stampTitle(course?.name);
  if (code && title) return `${code} · ${title}`;
  return code || title;
}

function stampTitle(name?: string | null): string {
  const raw = name?.trim();
  if (!raw) return "";
  return raw.replace(/\s+(II|III|IV|I)\s*$/i, "").trim().toUpperCase();
}

export function landingStateMark(state: Pick<LandingState, "n" | "label">): string {
  return `${state.n} ${state.label.toUpperCase()}`;
}

export function landingCta(input: { gated: boolean; signedIn: boolean }): {
  label: "Start your world" | "Enter your world";
  href: "/login" | "/earth";
} {
  if (input.gated && !input.signedIn) {
    return { label: "Start your world", href: "/login" };
  }
  return { label: "Enter your world", href: "/earth" };
}

export function landingHeaderNav(): readonly { label: string; href: string }[] {
  return [];
}
