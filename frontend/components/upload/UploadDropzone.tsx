"use client";

import { useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { ACCEPT_ATTRIBUTE, ACCEPT_COPY } from "@/lib/uploadIntake";
import type { ArtifactType, SourceOrigin } from "@/lib/types";
import { SourceClassifier, defaultArtifactFor } from "./SourceClassifier";
import { UploadQueue } from "./UploadQueue";

export function UploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addUploads } = useStore();
  const [origin, setOrigin] = useState<SourceOrigin>("instructor");
  const [artifactType, setArtifactType] = useState<ArtifactType>(defaultArtifactFor("instructor"));
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const accept = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    addUploads(Array.from(files), origin, artifactType);
  };

  return (
    <div
      className="sg-scrim"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-title"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="sg-dialog sg-sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sg-sheet-head" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <h2 id="upload-title" className="sg-title" style={{ margin: 0, fontSize: 20, lineHeight: "24px" }}>
            Add course files
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="sg-btn sg-btn-text sg-btn-icon">
            <X size={15} aria-hidden />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5">
          <button
            type="button"
            className="sg-drop"
            data-over={dragging}
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
          >
            <svg className="sg-drop-edge" aria-hidden>
              <rect x="0.5" y="0.5" rx="12" ry="12" />
            </svg>
            <UploadCloud size={22} strokeWidth={1.5} className="text-ink-faint" aria-hidden />
            <span className="sg-label">Drop files here</span>
            <span className="sg-muted">or click to browse. {ACCEPT_COPY}.</span>
          </button>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
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
