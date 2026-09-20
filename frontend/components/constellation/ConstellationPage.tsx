"use client";

import { FileText, Upload, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { FileList } from "@/components/files/FileList";
import { GapPanel } from "@/components/gaps/GapPanel";
import { GraphLenses } from "@/components/graph/GraphLenses";
import { KnowledgeWorkspace } from "@/components/graph/KnowledgeWorkspace";
import { UploadDialog } from "@/components/upload/UploadDropzone";
import { emit } from "@/lib/audio/events";
import type { Lens } from "@/lib/graphModel";
import { useIdentity } from "@/lib/identity";
import { ConstellationSearch } from "./ConstellationSearch";

type Dock = "files" | "weak";

const DOCK_TITLE: Record<Dock, { title: string; lede: string }> = {
  files: { title: "Files", lede: "Everything the engine has read. Pick one to find it in the sky." },
  weak: { title: "Weak Areas", lede: "Short chains of concepts that need work. Click one to fly there." },
};

/**
 * Space: the whole filespace as one sky. Stars are ideas, chips are files,
 * clusters are topics. Weak Areas and Files are lenses over the same canvas.
 */
export function ConstellationPage() {
  const identity = useIdentity();
  const [lens, setLens] = useState<Lens>("all");
  const [dock, setDock] = useState<Dock | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [focusIds, setFocusIds] = useState<string[]>([]);

  const openUpload = useCallback(() => {
    emit({ type: "ui", kind: "tap" });
    setUploadOpen(true);
  }, []);

  const handleLens = (next: Lens) => {
    setLens(next);
    if (next === "weak") {
      setDock("weak");
    } else if (dock === "weak") {
      setDock(null);
      setFocusIds([]);
    }
  };

  const toggleFiles = () => {
    emit({ type: "ui", kind: "tap" });
    setDock((current) => {
      const opening = current !== "files";
      if (opening) {
        if (lens === "weak") setLens("all");
        setFocusIds([]);
        return "files";
      }
      return null;
    });
  };

  useEffect(() => {
    if (dock !== "weak") return;
    const id = setTimeout(() => setFocusIds([]), 1600);
    return () => clearTimeout(id);
  }, [dock]);

  const course = identity.courses.find((c) => c.id === identity.courseId);

  return (
    <div className="sg-constellation">
      <KnowledgeWorkspace
        focusIds={focusIds}
        onUploadClick={openUpload}
        lens={lens}
        onLensChange={handleLens}
      />

      <div className="sg-toolbar">
        <GraphLenses
          lens={lens}
          onChange={handleLens}
          extra={
            <button type="button" className="sg-seg-item" aria-pressed={dock === "files"} aria-label="Files" onClick={toggleFiles}>
              <FileText size={12} aria-hidden />
              Files
            </button>
          }
        />
        <div className="sg-toolbar-trail">
          <ConstellationSearch />
          <button type="button" className="sg-btn" onClick={openUpload}>
            <Upload size={13} strokeWidth={2.25} aria-hidden />
            Add a file
          </button>
        </div>
      </div>

      {dock ? (
        <aside className="sg-dock sg-dock-left sg-sheet" aria-label={DOCK_TITLE[dock].title}>
          <header className="sg-sheet-head">
            <div className="sg-dock-title">
              <h2>{DOCK_TITLE[dock].title}</h2>
              <span className="sg-muted" style={{ whiteSpace: "normal" }}>
                {DOCK_TITLE[dock].lede}
              </span>
            </div>
            <button
              type="button"
              className="sg-btn sg-btn-text sg-btn-icon"
              aria-label="Close"
              onClick={() => {
                if (dock === "weak") handleLens("all");
                else setDock(null);
              }}
            >
              <X size={14} aria-hidden />
            </button>
          </header>
          <div className="sg-dock-body">
            {dock === "files" ? (
              <FileList onUploadClick={openUpload} />
            ) : (
              <GapPanel
                onFocusTrack={(ids) => {
                  setFocusIds(ids);
                }}
              />
            )}
          </div>
        </aside>
      ) : null}

      <div className="sg-legend" aria-hidden>
        <span>
          <i /> idea
        </span>
        <span>
          <i className="is-file" /> file
        </span>
        <span>
          <i style={{ ["--mark" as string]: "var(--a-lamp)" }} /> mastered
        </span>
        <span>
          <i style={{ ["--mark" as string]: "var(--a-live)" }} /> needs work
        </span>
        {course ? <span>{course.code ?? course.name}</span> : null}
      </div>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
