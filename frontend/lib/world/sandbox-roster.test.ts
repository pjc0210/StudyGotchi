import { describe, expect, it } from "vitest";
import { DEMO_COURSES } from "./demo-courses";
import { ingestionFileTitles, mergeVisibleFiles } from "./sandbox-roster";

describe("8.223 course file names", () => {
  it("lists all 24 ingested titles, not mock stems", () => {
    const titles = ingestionFileTitles(DEMO_COURSES[0].id);
    expect(titles).toHaveLength(24);
    expect(titles).toContain("L1-notes.pdf");
    expect(titles).toContain("pset1.pdf");
    expect(titles).toContain("midterm_2025.pdf");
    expect(titles).toContain("Legendre Transforms for Dummies.pdf");
    expect(titles).toContain("Pset 1 CM2.pdf");
    expect(titles.some((title) => title === "Lecture 05 - Vector Spaces")).toBe(false);
  });

  it("keeps catalog names when the live list is empty or mock", () => {
    const merged = mergeVisibleFiles(DEMO_COURSES[0].id, [
      {
        id: "lec5",
        title: "Lecture 05 - Vector Spaces",
        origin: "instructor",
        artifact_type: "lecture",
        concept_count: 0,
        concept_ids: [],
        status: "complete",
        uploaded_at: "",
      },
    ]);
    expect(merged.map((file) => file.title)).toContain("L1-notes.pdf");
    expect(merged.map((file) => file.title)).toContain("Lecture 05 - Vector Spaces");
    expect(merged.filter((file) => file.title.endsWith(".pdf")).length).toBe(24);
  });
});
