import { describe, expect, it } from "vitest";
import {
  buildLandmarkFlagCopy,
  humanizeWorkedTitle,
  landmarkFlagPlacement,
} from "./landmark-flag";

describe("planetary landmark flag", () => {
  it("sits as page chrome at the bottom left of the planet view", () => {
    expect(landmarkFlagPlacement()).toBe("page-bottom-left");
  });

  it("writes a short human status for 8.223 and never a bogus reached fraction", () => {
    const copy = buildLandmarkFlagCopy({
      name: "Classical Mechanics II",
      biome: "ice",
      fileCount: 24,
      ideasMapped: 147,
      ideasTotal: 7602,
      lastWorkedTitle: "Pset 4 CM2.pdf",
    });
    expect(copy.worldLine).toBe("Your mechanics world · Ice research town");
    expect(copy.statusLine).toBe("24 course files · 147 ideas mapped");
    expect(copy.lastLine).toBe("Last worked: Pset 4");
    expect(`${copy.worldLine} ${copy.statusLine} ${copy.lastLine}`).not.toMatch(
      /\d+\s*\/\s*\d+\s*reached/i,
    );
    expect(copy.statusLine).not.toContain("7602");
  });

  it("humanizes pset filenames and drops a nonsense denominator", () => {
    expect(humanizeWorkedTitle("pset4.pdf")).toBe("Pset 4");
    const bare = buildLandmarkFlagCopy({
      name: "Linear Algebra",
      biome: "meadow",
      fileCount: 140,
      ideasMapped: 0,
      ideasTotal: 14,
    });
    expect(bare.worldLine).toBe("Your algebra world · Meadow kingdom");
    expect(bare.statusLine).toBe("140 course files · Mapping ideas");
    expect(bare.lastLine).toBeNull();
  });
});
