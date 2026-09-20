"use client";

import { useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { useStore } from "@/lib/kg/store";
import type { ArtifactType, SourceOrigin } from "@/lib/kg/types";
import { SourceClassifier, defaultArtifactFor } from "./SourceClassifier";
import { UploadQueue } from "./UploadQueue";

export function UploadDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addUploads } = useStore();
  const [origin, setOrigin] = useState<SourceOrigin>("instructor");
  const [artifactType, setArtifactType] = useState<ArtifactType>(
    defaultArtifactFor("instructor"),
  );
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const accept = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    addUploads(Array.from(files), origin, artifactType);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[8vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="sg-enter max-h-[84vh] w-full max-w-[520px] overflow-y-auto rounded-xl border border-line-strong bg-surface shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 id="upload-title" className="text-[14px] font-semibold tracking-tight">
            Upload course materials
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upload dialog"
            className="rounded p-1 text-ink-faint transition-colors hover:bg-raised hover:text-ink"
          >
            <X size={15} aria-hidden />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              accept(e.dataTransfer.files);
            }}
            className={`flex w-full flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-9 text-center transition-colors ${
              dragging
                ? "border-brand bg-brand/5"
                : "border-line-strong hover:border-ink-faint hover:bg-raised/40"
            }`}
          >
            <UploadCloud size={22} strokeWidth={1.5} className="text-ink-faint" aria-hidden />
            <span className="text-[13px] font-medium text-ink">
              Drop your course materials here
            </span>
            <span className="text-[12px] text-ink-dim">
              or click to browse — PDF and ZIP
            </span>
          </button>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.zip,application/pdf,application/zip"
            className="sr-only"
            onChange={(e) => {
              accept(e.target.files);
              e.target.value = "";
            }}
          />

          <SourceClassifier
            origin={origin}
            artifactType={artifactType}
            onOriginChange={setOrigin}
            onArtifactChange={setArtifactType}
          />

          <UploadQueue />
        </div>
      </div>
    </div>
  );
}
