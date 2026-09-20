"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type WorldEvent, type WorldEventKind } from "@/lib/api";
import { selectCourse, useIdentity } from "@/lib/identity";
import { useStore } from "@/lib/store";
import type { WorldRegion, WorldResponse } from "@/lib/world/types";
import { EarthGlobe } from "@/components/site/EarthGlobe";
import { SiteHeader } from "@/components/site/SiteHeader";
import { WorldPage } from "@/components/world/WorldPage";
import { ConceptCard } from "./ConceptCard";
import { UploadBox } from "./UploadBox";

const EVENT_LABEL: Record<WorldEventKind, string> = {
  RESOURCE_ADDED: "New file",
  RESOURCE_ANALYZED: "Read closely",
  UNDERSTANDING_GAIN: "Grew",
  UNDERSTANDING_DROP: "Slipped",
  CONCEPT_MASTERED: "Mastered",
  CONCEPT_DISCOVERED: "New idea",
  FRONTIER_EXPANDED: "Frontier grew",
};

/**
 * The product page. Level 1: the globe with one pin per course. Level 2: the
 * course's island on the right and an interactive panel on the left. Hovering
 * the island shows a marker; clicking moves the concept into the panel.
 */
export function EarthShell() {
  const { selectedId, select, ingestVersion } = useStore();
  const identity = useIdentity();
  const [entered, setEntered] = useState(false);
  const [world, setWorld] = useState<WorldResponse | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [events, setEvents] = useState<WorldEvent[]>([]);

  const courses = identity.courses;
  const current = courses.find((c) => c.id === identity.courseId) ?? null;

  const enter = useCallback(
    (courseId: string) => {
      selectCourse(courseId);
      select(null);
      setEntered(true);
    },
    [select],
  );

  const leave = useCallback(() => {
    select(null);
    setEntered(false);
  }, [select]);

  // A student with one course goes straight to it.
  useEffect(() => {
    if (!entered && courses.length === 1 && identity.courseId) setEntered(true);
  }, [courses, entered, identity.courseId]);

  // What changed since the page opened, newest first. Polled after every ingest.
  useEffect(() => {
    if (!entered || !identity.ready) return;
    let cancelled = false;
    api
      .getWorldEvents(undefined, 12)
      .then((list) => {
        if (!cancelled) setEvents(list);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [entered, ingestVersion, identity.studentId, identity.courseId]);

  const regionById = useMemo(() => new Map((world?.regions ?? []).map((r) => [r.concept_id, r])), [world]);
  const selectedRegion: WorldRegion | null = selectedId ? (regionById.get(selectedId) ?? null) : null;

  const reached = world ? world.regions.filter((r) => r.semantic_state !== "frontier").length : 0;
  const total = world ? world.regions.length + world.hidden_concept_count : 0;

  return (
    <div className="earth-page is-earth">
      <SiteHeader />

      <div className={`earth-stage${entered ? " beside-panel" : ""}`}>
        {entered ? (
          <div className="absolute inset-0" style={{ paddingTop: 0 }}>
            <WorldPage onWorld={setWorld} hoveredId={hovered} onHover={setHovered} />
          </div>
        ) : (
          <EarthGlobe
            pins={courses.map((c) => ({ id: c.id, label: c.code ?? c.name, active: c.id === identity.courseId }))}
            onPin={enter}
          />
        )}
      </div>

      <aside className="earth-panel" aria-label={entered ? "Course" : "Your courses"}>
        {!entered ? (
          <>
            <h1>Your courses</h1>
            <p className="lede">Each course is an island. Pick one to land.</p>
            {courses.length === 0 ? (
              <p className="text-[14px] text-paper-soft">
                No courses yet. Sign in, and the engine will list what it knows.
              </p>
            ) : (
              <ul className="course-list">
                {courses.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => enter(c.id)}>
                      <span className="course-code">{c.code ?? "Course"}</span>
                      <span className="course-name">{c.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : selectedRegion ? (
          <ConceptCard region={selectedRegion} onClose={() => select(null)} />
        ) : (
          <>
            {courses.length > 1 ? (
              <button type="button" className="pill-link" onClick={leave}>
                All courses
              </button>
            ) : null}
            <h1 style={{ marginTop: courses.length > 1 ? 10 : 0 }}>{current?.code ?? identity.courseName}</h1>
            <p className="lede">
              {current?.name ?? identity.courseName}
              {world ? ` · ${reached} of ${total} ideas reached` : ""}
            </p>

            <UploadBox />

            {hovered && regionById.get(hovered) ? (
              <p className="mt-4 text-[13px] text-paper-soft">
                Click <strong className="text-paper-title">{regionById.get(hovered)?.name}</strong> to open it here.
              </p>
            ) : (
              <p className="mt-4 text-[13px] text-paper-soft">Hover the island to read a place; click to open it here.</p>
            )}

            {events.length > 0 ? (
              <>
                <h3 className="mb-1 mt-5 text-[12px] uppercase tracking-wider text-paper-soft">What changed</h3>
                <ul className="change-feed">
                  {events.slice(0, 8).map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        className="pill-link"
                        style={{ fontSize: 13, textAlign: "left" }}
                        onClick={() => e.concept_id && select(e.concept_id)}
                      >
                        <strong className="text-paper-title" style={{ fontWeight: 500 }}>
                          {EVENT_LABEL[e.event] ?? e.event}
                        </strong>{" "}
                        {e.explanation}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </aside>
    </div>
  );
}
