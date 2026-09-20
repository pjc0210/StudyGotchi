/**
 * Landing copy for the product, not for one course. Plain, active, sentence
 * case. Pixel labels (eyebrows, footer) render at 11px only; the caller sets
 * the case in CSS, so every string here stays sentence case.
 */

export const LANDING_EYEBROW = "For students with too many tabs";

export const LANDING_HEADLINE = "Course progression, reimagined.";

export const LANDING_BODY =
  "StudyGotchi connects to the tools your classes already use and turns what you have actually done into a picture you can read.";

export const LANDING_SECTIONS = {
  how: "how",
  connects: "connects",
  shows: "shows",
} as const;

export const LANDING_INTEGRATIONS = [
  {
    id: "canvas",
    name: "Canvas",
    detail: "assignments, grades, announcements, due dates",
  },
  {
    id: "gradescope",
    name: "Gradescope",
    detail: "submissions and rubric feedback, problem by problem",
  },
  {
    id: "ocw",
    name: "OCW",
    detail: "the course map we start from",
  },
  {
    id: "files",
    name: "Your files",
    detail: "notes and PDFs you drop in",
  },
] as const;

export type LandingIntegration = (typeof LANDING_INTEGRATIONS)[number];

export const LANDING_CONNECTS_LEAD =
  "Automation and MCP connectors read from the accounts you already have. Nothing is retyped; StudyGotchi pulls what you have turned in, what came back, and when it was due.";

export const LANDING_ONTOLOGY_NOTE =
  "We start from OCW's map of the course. MIT OpenCourseWare gives each course a baseline of topics, prerequisites, and lecture order. Then we match what you turn in against that map, so progress is measured against the course, not against a blank page.";

export const LANDING_PROMISES = [
  {
    id: "far",
    title: "How far you've gotten",
    note: "Per course and per topic. What you have opened, what you have turned in, what has been graded.",
  },
  {
    id: "weak",
    title: "Where you're weak",
    note: "Gaps in the map, and the exact pages behind them: the problem, the rubric line, the lecture it leans on.",
  },
  {
    id: "learn",
    title: "How you learn",
    note: "Patterns over time. What you revisit, what sticks after a week, and when you cram.",
  },
] as const;

export type LandingPromise = (typeof LANDING_PROMISES)[number];

export const LANDING_FOOTER = "StudyGotchi · 2026";

export function landingCta(input: { gated: boolean; signedIn: boolean }): {
  label: "Sign in" | "Enter your world";
  href: "/login" | "/earth";
} {
  if (input.gated && !input.signedIn) {
    return { label: "Sign in", href: "/login" };
  }
  return { label: "Enter your world", href: "/earth" };
}

export function landingSecondaryCta(): { label: "See how it works"; href: `#${string}` } {
  return { label: "See how it works", href: `#${LANDING_SECTIONS.how}` };
}

export function landingHeaderNav(): readonly { label: string; href: string }[] {
  return [];
}

/** Every string the landing renders, joined, so tests can sweep it in one pass. */
export function landingSurface(): string {
  return [
    LANDING_EYEBROW,
    LANDING_HEADLINE,
    LANDING_BODY,
    LANDING_CONNECTS_LEAD,
    LANDING_ONTOLOGY_NOTE,
    ...LANDING_INTEGRATIONS.map((item) => `${item.name} ${item.detail}`),
    ...LANDING_PROMISES.map((item) => `${item.title} ${item.note}`),
    landingCta({ gated: true, signedIn: false }).label,
    landingCta({ gated: false, signedIn: true }).label,
    landingSecondaryCta().label,
    LANDING_FOOTER,
  ].join(" ");
}
