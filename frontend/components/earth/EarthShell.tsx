"use client";

import { useCallback, useEffect, useMemo, useRef, useState, ViewTransition } from "react";
import { api, type WorldEvent, type WorldEventKind } from "@/lib/api";
import { emit } from "@/lib/audio/events";
import { selectCourse, useIdentity } from "@/lib/identity";
import { useStore } from "@/lib/store";
import type { WorldRegion, WorldResponse } from "@/lib/world/types";
import { CourseGlobe } from "@/components/world/globe/CourseGlobe";
import type { ScreenPoint } from "@/components/world/globe/globe-types";
import { WorldPage } from "@/components/world/WorldPage";
import { isOwnedCourse, toGlobeCourses } from "@/lib/world/globe-courses";
import { ConceptCard } from "./ConceptCard";
import { CourseNavigator } from "./CourseNavigator";
import { ProvenanceBubble } from "./ProvenanceBubble";
import { UploadBox } from "./UploadBox";
import { useCourseOverviewCache } from "./useCourseOverviewCache";
import "./earth-integration.css";

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
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [enteredCourseId, setEnteredCourseId] = useState<string | null>(null);
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [popup, setPopup] = useState<{
    courseId: string;
    anchor: ScreenPoint | null;
  } | null>(null);
  const [world, setWorld] = useState<WorldResponse | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [events, setEvents] = useState<WorldEvent[]>([]);

  const courses = identity.courses;
  const entered = enteredCourseId !== null;
  const current = courses.find((c) => c.id === enteredCourseId) ?? null;
  const overviewCache = useCourseOverviewCache(identity.studentId, courses);
  const globeCourses = useMemo(
    () =>
      toGlobeCourses(courses)
        .filter((course) => isOwnedCourse(course.id, courses))
        .map((course) => {
          const record = overviewCache.records.get(course.id);
          const stats = record?.status === "ready" ? record.data.stats : null;
          return {
            ...course,
            stats,
            progress: stats && stats.total > 0 ? stats.reached / stats.total : null,
          };
        }),
    [courses, overviewCache.records],
  );
  const popupCourse = popup
    ? courses.find((course) => course.id === popup.courseId) ?? null
    : null;

  // The globe is the world's front door: the director knows we are here, and music starts the
  // moment a gesture unlocks the context.
  useEffect(() => {
    emit({ type: "enter-world" });
    return () => emit({ type: "leave-world" });
  }, []);

  useEffect(() => {
    if (courses.length === 0) {
      setActiveCourseId(null);
      return;
    }
    setActiveCourseId((active) => {
      if (active && isOwnedCourse(active, courses)) return active;
      if (identity.courseId && isOwnedCourse(identity.courseId, courses)) {
        return identity.courseId;
      }
      return courses[0].id;
    });
  }, [courses, identity.courseId]);

  useEffect(() => {
    if (!entered && activeCourseId && identity.studentId) {
      void overviewCache.load(activeCourseId);
    }
  }, [activeCourseId, entered, identity.studentId, overviewCache.load]);

  const focusCourse = useCallback(
    (courseId: string) => {
      if (!isOwnedCourse(courseId, courses)) return;
      setActiveCourseId(courseId);
      setPopup((currentPopup) =>
        currentPopup?.courseId === courseId ? currentPopup : null,
      );
      setExpandedCourseIds((expanded) => {
        if (expanded.has(courseId)) return expanded;
        const next = new Set(expanded);
        next.add(courseId);
        return next;
      });
      void overviewCache.load(courseId);
    },
    [courses, overviewCache.load],
  );

  const toggleCourse = useCallback(
    (courseId: string) => {
      setExpandedCourseIds((expanded) => {
        const next = new Set(expanded);
        if (next.has(courseId)) {
          next.delete(courseId);
        } else {
          next.add(courseId);
          void overviewCache.load(courseId);
        }
        return next;
      });
    },
    [overviewCache.load],
  );

  const toggleTopic = useCallback((nodeId: string) => {
    setExpandedTopicIds((expanded) => {
      const next = new Set(expanded);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const land = useCallback(() => {
    if (!activeCourseId || !isOwnedCourse(activeCourseId, courses)) return;
    selectCourse(activeCourseId);
    select(null);
    setPopup(null);
    setEnteredCourseId(activeCourseId);
    // Inside the click, so this is the gesture that unlocks audio.
    emit({ type: "enter-island", biome: null });
  }, [activeCourseId, courses, select]);

  const leave = useCallback(() => {
    select(null);
    setEnteredCourseId(null);
    setWorld(null);
    setHovered(null);
    emit({ type: "leave-island" });
  }, [select]);

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

  // The concept card sliding in and out is the panel's own sound, whatever opened it.
  const cardOpen = !!selectedRegion;
  const cardWasOpen = useRef(false);
  useEffect(() => {
    if (cardOpen !== cardWasOpen.current) {
      cardWasOpen.current = cardOpen;
      emit({ type: "card", open: cardOpen });
    }
  }, [cardOpen]);

  // Every ingest that moved the student's state gets one slurp-and-ding; the island's own
  // sounds follow when the new payload lands.
  const lastIngest = useRef(ingestVersion);
  useEffect(() => {
    if (ingestVersion !== lastIngest.current) {
      lastIngest.current = ingestVersion;
      emit({ type: "evidence-ingested" });
      if (enteredCourseId) overviewCache.invalidate(enteredCourseId);
    }
  }, [enteredCourseId, ingestVersion, overviewCache.invalidate]);

  const reached = world ? world.regions.filter((r) => r.semantic_state !== "frontier").length : 0;
  const total = world ? world.regions.length + world.hidden_concept_count : 0;

  return (
    <div className="earth-page is-earth">
      <div className={`earth-stage${entered ? " beside-panel" : ""}`}>
        {entered ? (
          <div className="absolute inset-0" style={{ paddingTop: 0 }}>
            <WorldPage onWorld={setWorld} hoveredId={hovered} onHover={setHovered} />
          </div>
        ) : (
          <ViewTransition name="studygotchi-earth" share="earth-morph" default="none">
            <div className="course-globe-overview">
              <CourseGlobe
                courses={globeCourses}
                activeCourseId={activeCourseId}
                onActiveCourseChange={focusCourse}
                onCourseTownOpen={(courseId, anchor) => {
                  focusCourse(courseId);
                  setPopup({ courseId, anchor });
                }}
              />
            </div>
          </ViewTransition>
        )}
      </div>

      {!entered ? (
        <CourseNavigator
          courses={courses}
          activeCourseId={activeCourseId}
          records={overviewCache.records}
          expandedCourseIds={expandedCourseIds}
          expandedTopicIds={expandedTopicIds}
          onToggleCourse={toggleCourse}
          onToggleTopic={toggleTopic}
          onFocusCourse={focusCourse}
          onLand={land}
          onRetry={(courseId) => void overviewCache.load(courseId)}
        />
      ) : (
        <aside className="earth-panel" aria-label="Course">
          {selectedRegion ? (
            <ConceptCard region={selectedRegion} onClose={() => select(null)} />
          ) : (
          <>
            <button type="button" className="pill-link" onClick={leave}>
              The planet
            </button>
            <h1 style={{ marginTop: 10 }}>{current?.code ?? identity.courseName}</h1>
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
                        onClick={() => {
                          emit({ type: "ui", kind: "tap" });
                          if (e.concept_id) select(e.concept_id);
                        }}
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
      )}

      {!entered && popup && popupCourse ? (
        <ProvenanceBubble
          key={popup.courseId}
          course={popupCourse}
          record={overviewCache.records.get(popup.courseId)}
          anchor={popup.anchor}
          onDismiss={() => setPopup(null)}
        />
      ) : null}
    </div>
  );
}
