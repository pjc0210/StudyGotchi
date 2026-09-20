"use client";

import { useCallback, useState } from "react";
import { KnowledgeGraph } from "@/components/graph/KnowledgeGraph";
import { ConceptPanel } from "@/components/concepts/ConceptPanel";
import { FileList } from "@/components/files/FileList";
import { GapPanel } from "@/components/gaps/GapPanel";
import { StudyPlanPanel } from "@/components/study/StudyPlan";
import { UploadDialog } from "@/components/upload/UploadDropzone";
import { WorldPage } from "@/components/world/WorldPage";
import { useStore } from "@/lib/store";
import { Sidebar, type Section } from "./Sidebar";
import { TopBar } from "./TopBar";

const TITLES: Record<Section, string> = {
  world: "World",
  knowledge: "Knowledge",
  files: "Files",
  gaps: "Knowledge Gaps",
  study: "Study Plan",
};

export function AppShell({ initial = "world" }: { initial?: Section }) {
  const { target } = useStore();
  const [section, setSection] = useState<Section>(initial);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const [gapCount, setGapCount] = useState<number | undefined>(undefined);

  const openUpload = useCallback(() => setUploadOpen(true), []);

  const handleGaps = useCallback((ids: string[]) => {
    setHighlightIds(ids);
    setGapCount(ids.length);
  }, []);

  const handlePlan = useCallback((ids: string[]) => setHighlightIds(ids), []);

  const selectSection = useCallback((next: Section) => {
    setSection(next);
    // Highlighting only makes sense while a gap or plan view is driving it.
    if (next === "knowledge" || next === "files" || next === "world") setHighlightIds([]);
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
      <TopBar onUploadClick={openUpload} />

      <div className="flex min-h-0 flex-1">
        <Sidebar active={section} onSelect={selectSection} gapCount={gapCount} />

        {section !== "knowledge" && section !== "world" ? (
          <section
            aria-label={TITLES[section]}
            className="flex w-[368px] shrink-0 flex-col overflow-hidden border-r border-line bg-surface"
          >
            <header className="flex h-[46px] shrink-0 items-center justify-between border-b border-line px-4">
              <h1 className="text-[13px] font-semibold tracking-tight">
                {TITLES[section]}
              </h1>
              {section !== "files" ? (
                <span className="truncate text-[11px] text-ink-faint">{target}</span>
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

        {/* The graph owns the full remaining canvas; the inspector overlays it
            so selecting a concept never resizes or re-fits the viewport. */}
        <main className="relative min-w-0 flex-1">
          {section === "world" ? (
            <WorldPage />
          ) : (
            <KnowledgeGraph highlightIds={highlightIds} />
          )}
          <ConceptPanel />
        </main>
      </div>

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
