import { afterEach, describe, expect, it } from "vitest";
import { ApiError, isSandboxWorldError } from "../api";
import { DEMO_COURSES } from "./demo-courses";
import {
  canDemoIngest,
  clearDemoUploads,
  demoIngestFallback,
  demoUploadsForCourse,
  visibleCourseFileTitles,
} from "./demo-ingest";

afterEach(() => {
  clearDemoUploads();
});

describe("demo ingest fallback", () => {
  it("treats Railway 403 Not your world as a sandbox identity miss", () => {
    expect(isSandboxWorldError(new ApiError("Not your world", 403))).toBe(true);
    expect(isSandboxWorldError(new ApiError("forbidden", 403))).toBe(true);
    expect(isSandboxWorldError(new ApiError("Not your world"))).toBe(true);
    expect(isSandboxWorldError(new ApiError("Could not reach the knowledge engine.", 502))).toBe(false);
    expect(canDemoIngest(DEMO_COURSES[0].id)).toBe(true);
    expect(canDemoIngest("unknown-course")).toBe(false);
  });

  it("completes a dropped pset and appends it after the 24 8.223 names", () => {
    const result = demoIngestFallback(DEMO_COURSES[0].id, { name: "ice-upload-note.txt" }, "student_self", "homework");
    expect(result.status).toBe("complete");
    expect(result.analysis_pending).toBe(false);
    expect(result.resource_id).toContain("ice-upload-note.txt");
    expect(result.concepts_touched).toHaveLength(1);

    const titles = visibleCourseFileTitles(DEMO_COURSES[0].id);
    expect(titles).toHaveLength(25);
    expect(titles.slice(0, 24)).toContain("L1-notes.pdf");
    expect(titles.at(-1)).toBe("ice-upload-note.txt");
    expect(demoUploadsForCourse(DEMO_COURSES[0].id).map((file) => file.title)).toEqual(["ice-upload-note.txt"]);
  });
});
