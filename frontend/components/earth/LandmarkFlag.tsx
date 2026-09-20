"use client";

import { visibleCourseFileTitles } from "@/lib/world/demo-ingest";
import {
  buildLandmarkFlagCopy,
  landmarkFlagInputFromOverview,
  landmarkFlagPlacement,
} from "@/lib/world/landmark-flag";
import type { CourseGlobeCourse } from "@/components/world/globe/globe-types";
import type { CourseOverviewCacheRecord } from "./useCourseOverviewCache";

export interface LandmarkFlagProps {
  course: CourseGlobeCourse;
  record?: CourseOverviewCacheRecord;
  onLand(): void;
}

/** Detached card under Classes. Active-course status, never a raw fraction. */
export function LandmarkFlag({ course, record, onLand }: LandmarkFlagProps) {
  const overview = record?.status === "ready" ? record.data : null;
  const fileTitles = visibleCourseFileTitles(course.id);
  const copy = buildLandmarkFlagCopy(
    landmarkFlagInputFromOverview({
      name: course.name,
      biome: course.biome,
      fileCount: fileTitles.length,
      fileTitles,
      overview,
    }),
  );
  const waiting =
    record?.status === "error"
      ? "Could not read this land."
      : record?.status === "ready"
        ? null
        : "Reading this land…";

  return (
    <div
      className="landmark-flag"
      data-docked="true"
      data-placement={landmarkFlagPlacement()}
      role="region"
      aria-label="Active course"
      aria-labelledby="landmark-flag-title"
    >
      <span className="landmark-flag-tab">Flag</span>
      <span className="sg-eyebrow">{course.code ?? "Course"}</span>
      <h2 id="landmark-flag-title">{course.name}</h2>
      <p className="landmark-flag-biome">{copy.worldLine}</p>
      <p className="landmark-flag-stat">{waiting ?? copy.statusLine}</p>
      {waiting || !copy.lastLine ? null : <p className="landmark-flag-stat">{copy.lastLine}</p>}
      <button type="button" className="sg-btn sg-btn-primary" onClick={onLand}>
        Land
      </button>
    </div>
  );
}
