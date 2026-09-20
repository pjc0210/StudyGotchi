import { describe, expect, it } from "vitest";
import {
  LANDING_BODY,
  LANDING_EYEBROW,
  LANDING_FOOTER,
  LANDING_HEADLINE,
  LANDING_INTEGRATIONS,
  LANDING_ONTOLOGY_NOTE,
  LANDING_PROMISES,
  LANDING_SECTIONS,
  landingCta,
  landingHeaderNav,
  landingSecondaryCta,
  landingSurface,
} from "./landing-copy";

describe("landing copy", () => {
  it("leads with the product headline in sentence case", () => {
    expect(LANDING_HEADLINE).toBe("Course progression, reimagined.");
    expect(LANDING_EYEBROW).toBe("For students with too many tabs");
  });

  it("names the four things it connects to, each with one plain line", () => {
    expect(LANDING_INTEGRATIONS.map((item) => item.name)).toEqual([
      "Canvas",
      "Gradescope",
      "OCW",
      "Your files",
    ]);
    expect(LANDING_INTEGRATIONS.map((item) => item.detail)).toEqual([
      "assignments, grades, announcements, due dates",
      "submissions and rubric feedback, problem by problem",
      "the course map we start from",
      "notes and PDFs you drop in",
    ]);
    expect(LANDING_ONTOLOGY_NOTE).toMatch(/OCW/);
    expect(LANDING_ONTOLOGY_NOTE).toMatch(/match/i);
  });

  it("makes three promises: how far, where weak, how you learn", () => {
    expect(LANDING_PROMISES).toHaveLength(3);
    expect(LANDING_PROMISES.map((item) => item.title)).toEqual([
      "How far you've gotten",
      "Where you're weak",
      "How you learn",
    ]);
    for (const item of LANDING_PROMISES) {
      expect(item.note.length).toBeGreaterThan(0);
      expect(item.note.length).toBeLessThan(140);
    }
  });

  it("labels the two buttons Sign in / Enter your world and See how it works", () => {
    expect(landingCta({ gated: true, signedIn: false })).toEqual({
      label: "Sign in",
      href: "/login",
    });
    expect(landingCta({ gated: true, signedIn: true })).toEqual({
      label: "Enter your world",
      href: "/earth",
    });
    expect(landingCta({ gated: false, signedIn: false })).toEqual({
      label: "Enter your world",
      href: "/earth",
    });
    expect(landingSecondaryCta()).toEqual({
      label: "See how it works",
      href: `#${LANDING_SECTIONS.how}`,
    });
  });

  it("carries no course stamp or single-course demo copy", () => {
    const surface = landingSurface();
    expect(surface).not.toMatch(/8\.223/);
    expect(surface).not.toMatch(/classical mechanics/i);
    expect(surface).not.toMatch(/\b\d\.\d{3}\b/);
    expect(surface).not.toMatch(/Pip/);
    expect(surface).not.toMatch(/PSET/);
  });

  it("does not keep Look at the sky or Start your world", () => {
    const surface = landingSurface();
    expect(surface).not.toMatch(/Look at the sky/i);
    expect(surface).not.toMatch(/Start your world/i);
  });

  it("stays plain: no exclamation marks, no marketing verbs", () => {
    const surface = landingSurface();
    expect(surface).not.toMatch(/!/);
    expect(surface).not.toMatch(/unlock|supercharge|seamless|effortless|revolution/i);
    expect(LANDING_BODY.length).toBeLessThan(200);
    expect(LANDING_FOOTER).toMatch(/StudyGotchi/i);
  });

  it("keeps Courses and Information off the landing header", () => {
    expect(landingHeaderNav().map((item) => item.label)).toEqual([]);
    expect(landingHeaderNav().some((item) => item.label === "Courses")).toBe(false);
    expect(landingHeaderNav().some((item) => item.label === "Information")).toBe(false);
  });
});
