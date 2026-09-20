import { describe, expect, it } from "vitest";
import { clearIdentity, getIdentity, receiveMe } from "./identity";
import { DEMO_COURSES, DEMO_STUDENT_ID } from "./world/demo-courses";

describe("demo identity", () => {
  it("keeps 8.223 and 6.1400 after a signed-out clear", () => {
    clearIdentity();
    const identity = getIdentity();
    expect(identity.courses.map((course) => course.code)).toEqual(["8.223", "6.1400"]);
    expect(identity.courses.map((course) => course.id)).toEqual(DEMO_COURSES.map((course) => course.id));
    expect(identity.ready).toBe(true);
    expect(identity.studentId).toBe(DEMO_STUDENT_ID);
  });

  it("keeps pipeline UUIDs when /api/me returns no courses", () => {
    receiveMe({ student_id: "clerk_sandbox", courses: [] });
    const identity = getIdentity();
    expect(identity.courses.map((course) => course.id)).toEqual(DEMO_COURSES.map((course) => course.id));
    expect(identity.studentId).toBe("clerk_sandbox");
    expect(identity.ready).toBe(true);
    expect(identity.courseId).toBe(DEMO_COURSES[0].id);
  });
});
