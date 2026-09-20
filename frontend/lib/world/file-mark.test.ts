import { describe, expect, it } from "vitest";
import { fileGroup, fileMarkKind, fileMarkLabel } from "./file-mark";

describe("galaxy file marks", () => {
  it("uses a pdf, tex, or doc mark from the filename", () => {
    expect(fileMarkKind("L1-notes.pdf")).toBe("pdf");
    expect(fileMarkKind("notes/week-2.tex")).toBe("tex");
    expect(fileMarkKind("office-hours.txt")).toBe("doc");
    expect(fileMarkLabel("pdf")).toBe("PDF");
    expect(fileMarkLabel("tex")).toBe("TEX");
    expect(fileMarkLabel("doc")).toBe("DOC");
  });

  it("groups the 8.223 dock into designed shelves", () => {
    expect(fileGroup("L3-notes.pdf", "lecture")).toBe("Lectures");
    expect(fileGroup("pset2.pdf", "homework")).toBe("Problem sets");
    expect(fileGroup("Pset 1 CM2.pdf", "handwritten_work")).toBe("Your work");
    expect(fileGroup("midterm_2025.pdf", "exam")).toBe("Exams");
    expect(fileGroup("Legendre Transforms for Dummies.pdf", "reading")).toBe("Readings");
  });
});
