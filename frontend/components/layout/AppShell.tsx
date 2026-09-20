"use client";

import { useCallback, useState } from "react";
import { KnowledgeWorkspace } from "@/components/graph/KnowledgeWorkspace";
import { FileList } from "@/components/files/FileList";
import { GapPanel } from "@/components/gaps/GapPanel";
import { StudyPlanPanel } from "@/components/study/StudyPlan";
import { UploadDialog } from "@/components/upload/UploadDropzone";
import { useStore } from "@/lib/store";
import { Sidebar, type Section } from "./Sidebar";
import { TopBar } from "./TopBar";

const TITLES: Record<Section, string> = {
  knowledge: "Knowledge",
  files: "Files",
  gaps: "Knowledge Gaps",
  study: "Study Plan",
};

export function AppShell({ initial = "knowledge" }: { initial?: Section }) {
  const { target } = useStore();
  const [section, setSection] = useState<Section>(initial);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [routeIds, setRouteIds] = useState<string[]>([]);
  const [focusIds, setFocusIds] = useState<string[]>([]);
  const [gapCount, setGapCount] = useState<number | undefined>(undefined);

  const openUpload = useCallback(() => setUploadOpen(true), []);

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

  const selectSection = useCallback((next: Section) => {
    setSection(next);
    // Highlighting only makes sense while a gap or plan view is driving it.
    if (next === "knowledge" || next === "files") {
      setRouteIds([]);
      setFocusIds([]);
    }
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas text-ink">
        <Sidebar active={section} onSelect={selectSection} gapCount={gapCount} />

        {section !== "knowledge" ? (
          <section
            aria-label={TITLES[section]}
            className="flex w-[300px] shrink-0 flex-col overflow-hidden border-r border-line bg-surface 2xl:w-[368px]"
          >
            <header className="flex h-[46px] shrink-0 items-center justify-between border-b border-line px-4">
              <h1 className="text-[13px] font-semibold tracking-tight">
                {TITLES[section]}
              </h1>
              {section !== "files" ? (
                <span className="truncate text-[11px] text-ink-faint">{target?.label ?? "No target"}</span>
              ) : null}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {section === "files" ? (
                <FileList onUploadClick={openUpload} />
              ) : section === "gaps" ? (
                <GapPanel onGapsLoaded={handleGaps} />
              ) : (
                <StudyPlanPanel onPlanLoaded={handlePlan} />
              )}
            </div>
          </section>
        ) : null}

        {/* The graph owns the full remaining canvas; inspectors overlay it so
            selecting something never resizes or re-fits the view. */}
        <main className="relative min-w-0 flex-1">
          {section === "knowledge" ? <TopBar onUploadClick={openUpload} /> : null}
          <KnowledgeWorkspace
            routeIds={routeIds}
            focusIds={focusIds}
            onUploadClick={openUpload}
          />
        </main>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
