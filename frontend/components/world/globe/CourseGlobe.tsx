"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { emit } from "@/lib/audio/events";
import { useSpaceTheme } from "@/lib/space-theme";
import type { CourseGlobeCourse, ScreenPoint } from "./globe-types";

const CourseGlobeCanvas = dynamic(() => import("./CourseGlobeCanvas"), { ssr: false });

export interface CourseGlobeProps {
  courses: CourseGlobeCourse[];
  activeCourseId?: string | null;
  onSelect?: (courseId: string) => void;
  onActiveCourseChange?: (courseId: string) => void;
  onCourseTownOpen?: (courseId: string, anchor: ScreenPoint) => void;
  decorative?: boolean;
  playMusic?: boolean;
  className?: string;
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => setReducedMotion(media.matches);
    syncReducedMotion();
    media.addEventListener("change", syncReducedMotion);
    return () => media.removeEventListener("change", syncReducedMotion);
  }, []);

  return reducedMotion;
}

export function CourseGlobe({
  courses,
  activeCourseId = null,
  onSelect,
  onActiveCourseChange,
  onCourseTownOpen,
  decorative = false,
  playMusic = false,
  className,
}: CourseGlobeProps) {
  const { resolved: theme } = useSpaceTheme();
  const reducedMotion = useReducedMotion();
  const [focusedId, setFocusedId] = useState<string | null>(
    activeCourseId ?? courses[0]?.id ?? null,
  );

  useEffect(() => {
    if (activeCourseId) setFocusedId(activeCourseId);
  }, [activeCourseId]);

  useEffect(() => {
    if (!playMusic) return;
    emit({ type: "enter-world" });
    return () => emit({ type: "leave-world" });
  }, [playMusic]);

  const globe = (
    <CourseGlobeCanvas
      courses={courses}
      activeCourseId={focusedId}
      theme={theme}
      arriving={false}
      reducedMotion={reducedMotion}
      onActiveCourseChange={(courseId) => {
        setFocusedId(courseId);
        onActiveCourseChange?.(courseId);
      }}
      onCourseTownOpen={(courseId, anchor) => {
        if (decorative) return;
        if (onCourseTownOpen) {
          onCourseTownOpen(courseId, anchor);
          return;
        }
        onSelect?.(courseId);
      }}
    />
  );

  return className ? <div className={className}>{globe}</div> : globe;
}
