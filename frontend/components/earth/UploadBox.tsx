"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import type { ArtifactType, UploadStatus } from "@/lib/types";

const KINDS: { id: ArtifactType; label: string }[] = [
  { id: "homework", label: "Problem set" },
  { id: "quiz", label: "Quiz" },
  { id: "exam", label: "Exam" },
  { id: "student_notes", label: "My notes" },
  { id: "handwritten_work", label: "Handwritten work (photo)" },
  { id: "worked_solution", label: "Worked solution" },
];

const STATUS_LABEL: Record<UploadStatus, string> = {
  queued: "Queued",
  uploading: "Uploading",
  processing: "Reading",
  complete: "Done",
  failed: "Failed",
};

/** Drop zone for the student's own work. Files go straight to the engine. */
export function UploadBox() {
  const { addUploads, uploads, clearFinishedUploads } = useStore();
  const [kind, setKind] = useState<ArtifactType>("homework");
  const [active, setActive] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const take = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    addUploads(Array.from(files), "student_self", kind);
  };

  return (
    <section aria-label="Upload your work">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-[12px] uppercase tracking-wider text-paper-soft">Add your work</h3>
        <select
          className="paper-select"
          style={{ width: "auto", padding: "4px 8px", fontSize: 13 }}
          value={kind}
          onChange={(e) => setKind(e.target.value as ArtifactType)}
          aria-label="What kind of file"
        >
          {KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <div
        className={`drop-zone${active ? " active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setActive(true);
        }}
        onDragLeave={() => setActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setActive(false);
          take(e.dataTransfer.files);
        }}
      >
        Drop a PDF or photo here, or{" "}
        <label>
          choose a file
          <input
            ref={input}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.md,.txt,.docx,.zip"
            className="sr-only"
            onChange={(e) => {
              take(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        . The island reacts in seconds; the close read finishes in the background.
      </div>
      {uploads.length > 0 ? (
        <>
          <ul className="queue">
            {uploads.slice(0, 6).map((u) => (
              <li key={u.id} className={u.status}>
                <span className="truncate">{u.filename}</span>
                <span className="status">{u.error ?? STATUS_LABEL[u.status]}</span>
              </li>
            ))}
          </ul>
          {uploads.some((u) => u.status === "complete" || u.status === "failed") ? (
            <button type="button" className="pill-link mt-2" onClick={clearFinishedUploads}>
              Clear finished
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
