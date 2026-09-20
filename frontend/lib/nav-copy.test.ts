import { describe, expect, it } from "vitest";
import { LENSES } from "./graphModel";
import { courseChipLabel, INFORMATION_UNDERSTANDING_MARKS, PRODUCT_NAV } from "./world/earth-nav";

describe("navigation copy", () => {
  it("keeps the top header as Courses · Information", () => {
    expect(PRODUCT_NAV.map((item) => item.label)).toEqual(["Courses", "Information"]);
  });

  it("keeps the Information toolbar as All · Knowledge · Weak Areas", () => {
    expect(LENSES.map((lens) => lens.label)).toEqual(["All", "Knowledge", "Weak Areas"]);
    expect(LENSES.some((lens) => lens.label === "My Knowledge")).toBe(false);
  });

  it("keeps Information understanding colors and drops idea/file labels", () => {
    expect(INFORMATION_UNDERSTANDING_MARKS.map((mark) => mark.label)).toEqual(["mastered", "needs work"]);
    expect(INFORMATION_UNDERSTANDING_MARKS.map((mark) => mark.id)).not.toContain("idea");
    expect(INFORMATION_UNDERSTANDING_MARKS.map((mark) => mark.id)).not.toContain("file");
  });

  it("prefers the course number on the Information chip", () => {
    expect(courseChipLabel({ code: "8.223", name: "Classical Mechanics II" })).toBe("8.223");
    expect(courseChipLabel({ code: null, name: "Classical Mechanics II" })).toBe("Classical Mechanics II");
  });
});
