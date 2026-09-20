"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { CourseSummary } from "@/lib/identity";
import type { ScreenPoint } from "@/components/world/globe/globe-types";
import type { CourseOverviewCacheRecord } from "./useCourseOverviewCache";

export interface ProvenanceBubbleProps {
  course: CourseSummary;
  record?: CourseOverviewCacheRecord;
  anchor?: ScreenPoint | null;
  onDismiss(): void;
}

export function ProvenanceBubble({
  course,
  record,
  anchor,
  onDismiss,
}: ProvenanceBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    bubbleRef.current?.querySelector<HTMLElement>("button")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!bubbleRef.current?.contains(event.target as Node)) onDismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      returnFocusRef.current?.focus();
    };
  }, [onDismiss]);

  const overview = record?.status === "ready" ? record.data : null;
  const style = anchor
    ? ({
        "--provenance-x": `${anchor.x}px`,
        "--provenance-y": `${anchor.y}px`,
      } as CSSProperties)
    : undefined;

  return (
    <div
      ref={bubbleRef}
      className="provenance-bubble"
      data-anchored={anchor ? "true" : undefined}
      style={style}
      role="dialog"
      aria-modal="false"
      aria-labelledby="provenance-title"
    >
      <span className="provenance-tab">Course</span>
      <button
        type="button"
        className="provenance-close"
        onClick={onDismiss}
        aria-label="Close course summary"
      >
        ×
      </button>
      <span className="sg-eyebrow">{course.code ?? "Course"}</span>
      <h2 id="provenance-title">{course.name}</h2>

      {overview ? (
        <>
          <p>
            {overview.stats.reached} of {overview.stats.total} concepts reached,{" "}
            {overview.stats.residents} residents, and {overview.stats.sources} supporting sources.
          </p>
          <span className="provenance-source">World {overview.worldVersion}</span>
        </>
      ) : record?.status === "error" ? (
        <p>{record.error}</p>
      ) : (
        <p>Loading this course summary…</p>
      )}
    </div>
  );
}
