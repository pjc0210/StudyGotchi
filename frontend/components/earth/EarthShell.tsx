"use client";

import { useCallback, useEffect, useMemo, useRef, useState, ViewTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, type WorldEvent } from "@/lib/api";
import { emit } from "@/lib/audio/events";
import { selectCourse, useIdentity } from "@/lib/identity";
import { useStore } from "@/lib/store";
import { useShellNav } from "@/components/shell/shell-nav";
import type { WorldRegion, WorldResponse } from "@/lib/world/types";
import { CourseGlobe } from "@/components/world/globe/CourseGlobe";
import { diveDurationMs } from "@/components/world/globe/globe-dive";
import type { ScreenPoint } from "@/components/world/globe/globe-types";
import { biomeForGlobeCourse, isOwnedCourse, rosterBiome, toGlobeCourses, withEarthCourses } from "@/lib/world/globe-courses";
import { DEMO_HERO_CODE } from "@/lib/world/demo-courses";
import { ICE_DEMO_DEFAULT, type IceDemoState } from "@/lib/world/demo-theater";
import {
  galaxyHrefForConcept,
  isConceptId,
  landHref,
  landParamFromSearch,
  planetHref,
  resolveLandCourseId,
} from "@/lib/world/earth-nav";
import { BiomeLand } from "./BiomeLand";
import { ConceptCard } from "./ConceptCard";
import { ConceptRail } from "./ConceptRail";
import { CourseNavigator } from "./CourseNavigator";
import { DemoTheater } from "./DemoTheater";
import { LandmarkFlag } from "./LandmarkFlag";
import { useCourseOverviewCache } from "./useCourseOverviewCache";
import "./earth-integration.css";

/**
 * The product page. Level 1: the globe with one pin per course. Level 2: the
 * course's island on the right and an interactive panel on the left. Hovering
 * the island shows a marker; clicking moves the concept into the panel.
 */
export function EarthShell() {
  const { selectedId, select, ingestVersion, focusConcept } = useStore();
  const identity = useIdentity();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nav = useShellNav();
  const [activeCourseId, setActiveCourseId] = useState<string | null>(
    () => identity.courseId || identity.courses[0]?.id || null,
  );
  const [enteredCourseId, setEnteredCourseId] = useState<string | null>(null);
  const [diving, setDiving] = useState<{
    courseId: string;
    anchor: ScreenPoint | null;
  } | null>(null);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [world, setWorld] = useState<WorldResponse | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [events, setEvents] = useState<WorldEvent[]>([]);
  const [flag, setFlag] = useState<{
    courseId: string;
    anchor: ScreenPoint | null;
  } | null>(null);
  const [iceDemo, setIceDemo] = useState<IceDemoState>(ICE_DEMO_DEFAULT);
  const [focusDistrict, setFocusDistrict] = useState<string | null>(null);
  const [landArriving, setLandArriving] = useState(false);

  const courses = useMemo(() => withEarthCourses(identity.courses), [identity.courses]);
  const landCourseId = resolveLandCourseId(landParamFromSearch(searchParams), courses);
  const entered = enteredCourseId !== null;
  const overviewCache = useCourseOverviewCache(identity.studentId, courses);
  const globeCourses = useMemo(
    () =>
      toGlobeCourses(courses).map((course) => {
        const record = overviewCache.records.get(course.id);
        const stats = record?.status === "ready" ? record.data.stats : null;
        return {
          ...course,
          stats,
          progress:
            stats && stats.total > 0
              ? stats.reached / stats.total
              : course.progress,
        };
      }),
    [courses, overviewCache.records],
  );
  const enteredCourse =
    globeCourses.find((course) => course.id === enteredCourseId) ?? null;
  const current =
    enteredCourse ??
    courses.find((course) => course.id === enteredCourseId) ??
    null;

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
    for (const course of courses) void overviewCache.load(course.id);
  }, [courses, overviewCache.load]);

  const focusCourse = useCallback(
    (courseId: string) => {
      if (!isOwnedCourse(courseId, courses) && !courses.some((course) => course.id === courseId)) {
        return;
      }
      setActiveCourseId(courseId);
      void overviewCache.load(courseId);
    },
    [courses, overviewCache.load],
  );

  const enterCourse = useCallback(
    (courseId: string, anchor: ScreenPoint | null = null) => {
      const onGlobe = globeCourses.some((course) => course.id === courseId);
      if (!onGlobe || diving || enteredCourseId) return;
      if (isOwnedCourse(courseId, courses)) {
        focusCourse(courseId);
        selectCourse(courseId);
      } else {
        setActiveCourseId(courseId);
      }
      setDiving({ courseId, anchor });
      select(null);
      const biome = globeCourses.find((course) => course.id === courseId)?.biome ?? null;
      emit({
        type: "enter-island",
        biome: biome ? rosterBiome(biome) : null,
        arrival: "dive",
      });
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (enterTimer.current) clearTimeout(enterTimer.current);
      enterTimer.current = setTimeout(() => {
        const code = globeCourses.find((course) => course.id === courseId)?.code ?? courseId;
        router.replace(landHref(code));
        setEnteredCourseId(courseId);
        setDiving(null);
        setLandArriving(true);
        setFocusDistrict(null);
        enterTimer.current = null;
      }, diveDurationMs(reduced));
    },
    [courses, diving, enteredCourseId, focusCourse, globeCourses, router, select],
  );

  const land = useCallback(
    (courseId?: string) => {
      const target = courseId ?? flag?.courseId ?? activeCourseId;
      if (!target) return;
      setFlag(null);
      enterCourse(target, flag?.courseId === target ? flag.anchor : null);
    },
    [activeCourseId, enterCourse, flag],
  );

  const raiseFlag = useCallback(
    (courseId: string, anchor: ScreenPoint | null) => {
      if (!isOwnedCourse(courseId, courses) && !courses.some((course) => course.id === courseId)) {
        return;
      }
      focusCourse(courseId);
      setFlag({ courseId, anchor });
    },
    [courses, focusCourse],
  );

  const leave = useCallback(() => {
    if (enterTimer.current) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    select(null);
    setDiving(null);
    setEnteredCourseId(null);
    setWorld(null);
    setHovered(null);
    setIceDemo(ICE_DEMO_DEFAULT);
    setFocusDistrict(null);
    setLandArriving(false);
    emit({ type: "leave-island" });
    if (landParamFromSearch(searchParams)) router.replace(planetHref());
  }, [router, searchParams, select]);

  useEffect(() => {
    if (nav.leavingTo === planetHref() || (!landCourseId && !diving)) {
      setEnteredCourseId(null);
      setWorld(null);
      setHovered(null);
      setIceDemo(ICE_DEMO_DEFAULT);
      setFocusDistrict(null);
      setLandArriving(false);
      return;
    }
    if (landCourseId) {
      setEnteredCourseId(landCourseId);
      if (isOwnedCourse(landCourseId, courses)) selectCourse(landCourseId);
    }
  }, [courses, diving, landCourseId, nav.leavingTo]);

  useEffect(
    () => () => {
      if (enterTimer.current) clearTimeout(enterTimer.current);
    },
    [],
  );

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

  const iceLandOpen =
    entered &&
    (enteredCourse?.code === DEMO_HERO_CODE || current?.code === DEMO_HERO_CODE) &&
    (enteredCourse?.biome ?? biomeForGlobeCourse(enteredCourseId ?? "", current?.code)) === "ice";

  return (
    <div className="earth-page is-earth">
      <div className="earth-stage">
        {entered && enteredCourseId ? (
          <BiomeLand
            key={enteredCourseId}
            courseId={enteredCourseId}
            biome={
              enteredCourse?.biome ??
              biomeForGlobeCourse(enteredCourseId, current?.code)
            }
            arriving={landArriving}
            focusDistrict={focusDistrict}
            onFocusDistrict={setFocusDistrict}
            onWorld={setWorld}
            hoveredId={hovered}
            onHover={setHovered}
            iceDemo={iceLandOpen ? iceDemo : undefined}
          />
        ) : (
          <ViewTransition name="studygotchi-earth" share="earth-morph" default="none">
            <div className="course-globe-overview">
              <CourseGlobe
                courses={globeCourses}
                activeCourseId={activeCourseId}
                arriving
                diving={diving !== null}
                diveAnchor={diving?.anchor ?? null}
                onActiveCourseChange={focusCourse}
                onCourseTownOpen={(courseId, anchor) => {
                  raiseFlag(courseId, anchor);
                }}
              />
            </div>
          </ViewTransition>
        )}
      </div>

      {iceLandOpen ? (
        <DemoTheater enabled demo={iceDemo} onChange={setIceDemo} />
      ) : null}

      {!entered ? (
        <div className="earth-planet-chrome">
          <CourseNavigator
            courses={courses}
            activeCourseId={activeCourseId}
            records={overviewCache.records}
            onFocusCourse={focusCourse}
          />
          {activeCourseId ? (
            <LandmarkFlag
              course={
                globeCourses.find((course) => course.id === activeCourseId) ?? {
                  id: activeCourseId,
                  code: courses.find((course) => course.id === activeCourseId)?.code ?? null,
                  name: courses.find((course) => course.id === activeCourseId)?.name ?? "Course",
                  biome: biomeForGlobeCourse(
                    activeCourseId,
                    courses.find((course) => course.id === activeCourseId)?.code,
                  ),
                  progress: null,
                  stats: null,
                }
              }
              record={overviewCache.records.get(activeCourseId)}
              onLand={() => land(activeCourseId)}
            />
          ) : null}
        </div>
      ) : selectedRegion ? (
        <aside className="earth-panel" aria-label="Place">
          <ConceptCard region={selectedRegion} onClose={() => select(null)} />
        </aside>
      ) : (
        <ConceptRail
          courseCode={current?.code ?? identity.courseName}
          world={world}
          overview={
            enteredCourseId
              ? overviewCache.records.get(enteredCourseId)?.status === "ready"
                ? overviewCache.records.get(enteredCourseId)?.data ?? null
                : null
              : null
          }
          events={events}
          activeConceptId={selectedId}
          activePlaceId={focusDistrict}
          iceLand={iceLandOpen}
          onLeave={leave}
          onSelectConcept={(conceptId) => {
            emit({ type: "ui", kind: "tap" });
            if (isConceptId(conceptId)) focusConcept(conceptId);
            nav.go(galaxyHrefForConcept(conceptId));
          }}
          onVisitPlace={(placeId) => {
            emit({ type: "ui", kind: "tap" });
            setFocusDistrict(placeId);
          }}
        />
      )}

    </div>
  );
}
