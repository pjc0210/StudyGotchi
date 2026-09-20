"use client";

import { FileText, Route, TriangleAlert, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { FileList } from "@/components/files/FileList";
import { GapPanel } from "@/components/gaps/GapPanel";
import { GraphLenses } from "@/components/graph/GraphLenses";
import { KnowledgeWorkspace } from "@/components/graph/KnowledgeWorkspace";
import { StudyPlanPanel } from "@/components/study/StudyPlan";
import { UploadDialog } from "@/components/upload/UploadDropzone";
import { emit } from "@/lib/audio/events";
import type { Lens } from "@/lib/graphModel";
import { useIdentity } from "@/lib/identity";
import { useStore } from "@/lib/store";
import { ConstellationSearch } from "./ConstellationSearch";

type Dock = "files" | "gaps" | "route";

const DOCK_TITLE: Record<Dock, { title: string; lede: string }> = {
  files: { title: "Files", lede: "Everything the engine has read. Pick one to find it in the sky." },
  gaps: { title: "Gaps", lede: "Where the engine sees trouble, ranked for your target." },
  route: { title: "Route", lede: "The prerequisite path to your target, drawn across the sky." },
};

/**
 * Space: the whole filespace as one sky. Stars are ideas, chips are files,
 * clusters are topics. Files, gaps and the study route are lenses over the
 * same canvas, never a second scrolled page.
 */
export function ConstellationPage() {
  const { target } = useStore();
  const identity = useIdentity();
  const [lens, setLens] = useState<Lens>("all");
  const [dock, setDock] = useState<Dock | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const [focusIds, setFocusIds] = useState<string[]>([]);
  const [gapCount, setGapCount] = useState<number | undefined>(undefined);

  const openUpload = useCallback(() => {
    emit({ type: "ui", kind: "tap" });
    setUploadOpen(true);
  }, []);

  const handleGaps = useCallback((ids: string[]) => {
    // Gaps are a set to emphasise, not an ordered path.
    setFocusIds(ids);
    setRouteIds([]);
    setGapCount(ids.length);
  }, []);

  const handlePlan = useCallback((ids: string[]) => {
    setRouteIds(ids);
    setFocusIds([]);
  }, []);

  const toggleDock = (next: Dock) => {
    emit({ type: "ui", kind: "tap" });
    setDock((current) => {
      const opening = current !== next;
      // Closing the gaps or route dock also lifts its highlight off the sky.
      if (!opening || next === "files") {
        setRouteIds([]);
        setFocusIds([]);
      }
      return opening ? next : null;
    });
  };

  const course = identity.courses.find((c) => c.id === identity.courseId);

  return (
    <div className="sg-constellation">
      <KnowledgeWorkspace
        routeIds={routeIds}
        focusIds={focusIds}
        onUploadClick={openUpload}
        lens={lens}
        onLensChange={setLens}
      />

      <div className="sg-toolbar">
        <GraphLenses lens={lens} onChange={setLens} />
        <div className="sg-seg" role="group" aria-label="Overlays">
          <button type="button" className="sg-seg-item" aria-pressed={dock === "files"} onClick={() => toggleDock("files")}>
            <FileText size={12} aria-hidden style={{ marginRight: 6, verticalAlign: -1 }} />
            Files
          </button>
          <button type="button" className="sg-seg-item" aria-pressed={dock === "gaps"} onClick={() => toggleDock("gaps")}>
            <TriangleAlert size={12} aria-hidden style={{ marginRight: 6, verticalAlign: -1 }} />
            Gaps
            {gapCount ? <span className="sg-count">{gapCount}</span> : null}
          </button>
          <button type="button" className="sg-seg-item" aria-pressed={dock === "route"} onClick={() => toggleDock("route")}>
            <Route size={12} aria-hidden style={{ marginRight: 6, verticalAlign: -1 }} />
            Route
          </button>
        </div>
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
                {dock === "files" ? DOCK_TITLE.files.lede : target ? `${DOCK_TITLE[dock].lede.split(",")[0]}, aimed at ${target.label}.` : DOCK_TITLE[dock].lede}
              </span>
            </div>
            <button type="button" className="sg-btn sg-btn-text sg-btn-icon" aria-label="Close" onClick={() => toggleDock(dock)}>
              <X size={14} aria-hidden />
            </button>
          </header>
          <div className="sg-dock-body">
            {dock === "files" ? (
              <FileList onUploadClick={openUpload} />
            ) : dock === "gaps" ? (
              <GapPanel onGapsLoaded={handleGaps} />
            ) : (
              <StudyPlanPanel onPlanLoaded={handlePlan} />
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
