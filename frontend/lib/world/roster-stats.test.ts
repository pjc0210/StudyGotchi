import { describe, expect, it } from "vitest";
import { SANDBOX_COURSES } from "./sandbox-roster";
import { buildRosterStats } from "./roster-stats";

describe("roster stats", () => {
  it("sums sandbox file counts and names the thickest and thinnest lands", () => {
    const stats = buildRosterStats(SANDBOX_COURSES, new Map());
    expect(stats.enrolled).toBe(7);
    expect(stats.files).toBe(24 + 23 + 158 + 140 + 90 + 131 + 41);
    expect(stats.thickest).toEqual({ code: "6.1210", files: 158 });
    expect(stats.thinnest).toEqual({ code: "6.1400", files: 23 });
    expect(stats.bars).toHaveLength(7);
    expect(stats.bars[0]).toEqual({ code: "8.223", files: 24 });
    expect(stats.lines.map((line) => line.label)).toEqual([
      "Enrolled",
      "Ingested",
      "Ideas",
      "Buddies",
      "Term",
      "Thickest land",
      "Thinnest syllabus",
    ]);
    expect(stats.lines.find((line) => line.label === "Ideas")?.value).toBe("Waiting on lands");
    expect(stats.lines.find((line) => line.label === "Buddies")?.value).toBe("0 buddies hatched");
  });

  it("reports mapped ideas without a bogus reached denominator", () => {
    const records = new Map([
      [
        SANDBOX_COURSES[0].id,
        {
          status: "ready" as const,
          data: {
            stats: { reached: 147, total: 7602, mastered: 2, residents: 9, sources: 24 },
          },
        },
      ],
    ]);
    const stats = buildRosterStats([SANDBOX_COURSES[0]], records as never);
    expect(stats.reached).toBe(147);
    expect(stats.lines.find((line) => line.label === "Ideas")?.value).toBe("147 mapped");
    expect(stats.lines.find((line) => line.label === "Ideas")?.value).not.toMatch(/\//);
    expect(stats.lines.find((line) => line.label === "Buddies")?.value).toBe("9 buddies hatched");
  });
});
