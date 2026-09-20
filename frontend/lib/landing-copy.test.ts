import { describe, expect, it } from "vitest";
import {
  LANDING_BODY,
  LANDING_STATES,
  landingCourseStamp,
  landingCta,
  landingHeaderNav,
  landingStateMark,
} from "./landing-copy";

describe("landing copy", () => {
  it("prefers 8.223 and CLASSICAL MECHANICS on the course stamp", () => {
    expect(landingCourseStamp({ code: "8.223", name: "Classical Mechanics II" })).toBe(
      "8.223 · CLASSICAL MECHANICS",
    );
    expect(landingCourseStamp({ code: null, name: "Classical Mechanics II" })).toBe(
      "CLASSICAL MECHANICS",
    );
  });

  it("keeps the three states as Touched / Demonstrated / Mastered with short notes", () => {
    expect(LANDING_STATES.map((state) => state.label)).toEqual([
      "Touched",
      "Demonstrated",
      "Mastered",
    ]);
    expect(LANDING_STATES.map((state) => landingStateMark(state))).toEqual([
      "1 TOUCHED",
      "2 DEMONSTRATED",
      "3 MASTERED",
    ]);
    expect(LANDING_STATES.map((state) => state.note)).toEqual([
      "Lecture opened. A sprout.",
      "Problem solved. A landmark.",
      "Confirmed. The light stays on.",
    ]);
    expect(LANDING_STATES.map((state) => state.note).join(" ")).not.toBe(
      LANDING_STATES[0]?.note,
    );
  });

  it("labels the one primary CTA Start your world or Enter your world", () => {
    expect(landingCta({ gated: true, signedIn: false })).toEqual({
      label: "Start your world",
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
  });

  it("does not keep Look at the sky", () => {
    const surface = [
      LANDING_BODY,
      ...LANDING_STATES.map((state) => `${state.label} ${state.note}`),
      landingCta({ gated: true, signedIn: false }).label,
      landingCta({ gated: false, signedIn: true }).label,
    ].join(" ");
    expect(surface).not.toMatch(/Look at the sky/i);
  });

  it("keeps Courses and Information off the landing header", () => {
    expect(landingHeaderNav().map((item) => item.label)).toEqual([]);
    expect(landingHeaderNav().some((item) => item.label === "Courses")).toBe(false);
    expect(landingHeaderNav().some((item) => item.label === "Information")).toBe(false);
  });
});
