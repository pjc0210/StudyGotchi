import { fileMarkKind, fileMarkLabel, type FileMarkKind } from "@/lib/world/file-mark";

export function FileMark({ title, kind }: { title?: string; kind?: FileMarkKind }) {
  const mark = kind ?? fileMarkKind(title ?? "");
  return (
    <span className={`sg-file-mark is-${mark}`} aria-hidden>
      {fileMarkLabel(mark)}
    </span>
  );
}
