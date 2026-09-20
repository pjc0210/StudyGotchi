export type FileMarkKind = "pdf" | "tex" | "doc";

export function fileMarkKind(title: string): FileMarkKind {
  const leaf = title.replace(/\\/g, "/").split("/").pop() ?? title;
  if (/\.pdf$/i.test(leaf)) return "pdf";
  if (/\.tex$/i.test(leaf)) return "tex";
  return "doc";
}

export function fileMarkLabel(kind: FileMarkKind): string {
  if (kind === "pdf") return "PDF";
  if (kind === "tex") return "TEX";
  return "DOC";
}

export function fileGroup(title: string, artifactType: string): string {
  if (/^L\d/i.test(title) || artifactType === "lecture") return "Lectures";
  if (/pset|homework/i.test(title) || artifactType === "homework" || artifactType === "handwritten_work") {
    return /CM2|handwritten|student/i.test(title) || artifactType === "handwritten_work"
      ? "Your work"
      : "Problem sets";
  }
  if (artifactType === "exam" || artifactType === "solution_key" || /midterm|final/i.test(title)) {
    return "Exams";
  }
  if (artifactType === "reading" || /dummies|reading/i.test(title)) return "Readings";
  return "Files";
}
