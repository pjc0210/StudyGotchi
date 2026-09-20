"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LocalBiomeId } from "@/components/world/biomes/types";
import {
  DEMO_GROWTH_COURSES,
  GROWTH_STAGES,
  assignPlaces,
  growthStageAt,
  landmarkStageForProgress,
  nearestGrowthStage,
  placeStateAtProgress,
  progressForStage,
} from "@/lib/world/growth-studio";
import { LandPreview } from "./LandPreview";

const LAND_PREVIEWS: Array<{ id: LocalBiomeId; name: string }> = [
  { id: "frontier-town", name: "Frontier" },
  { id: "jungle-forest-village", name: "Jungle" },
  { id: "medieval-meadow-kingdom", name: "Meadow" },
  { id: "coastal-ruins", name: "Coast" },
  { id: "nordic-volcanic-highlands", name: "Nordic" },
  { id: "ice-golden", name: "Ice" },
];

export function GrowthStudio({
  initialCourseCode,
  initialLand,
}: {
  initialCourseCode?: string;
  initialLand?: string;
} = {}) {
  const startCourse =
    DEMO_GROWTH_COURSES.find((row) => row.code === initialCourseCode) ??
    DEMO_GROWTH_COURSES.find((row) => row.land === initialLand) ??
    DEMO_GROWTH_COURSES[0];
  const startLand =
    LAND_PREVIEWS.some((land) => land.id === initialLand) && initialLand !== startCourse.land
      ? (initialLand as LocalBiomeId)
      : null;
  const [courseId, setCourseId] = useState(startCourse.id);
  const [progress, setProgress] = useState(progressForStage("sprouting"));
  const [landOverride, setLandOverride] = useState<LocalBiomeId | null>(startLand);

  const course = DEMO_GROWTH_COURSES.find((row) => row.id === courseId) ?? DEMO_GROWTH_COURSES[0];
  const visual = landOverride ?? course.land;
  const stage = growthStageAt(progress);
  const places = useMemo(() => assignPlaces(course), [course]);

  return (
    <div className="growth-studio">
      <header className="growth-top">
        <div>
          <p className="growth-eyebrow">Design / growth</p>
          <h1>Course → biome → district → stage</h1>
        </div>
        <p className="growth-links">
          <Link href="/design">Paper & Pixel</Link>
          <Link href="/earth">Earth</Link>
        </p>
      </header>

      <section className="growth-legend" aria-label="Mapping legend">
        <ol>
          <li>
            <span>Course</span>
            One ingested syllabus. Today that is a land on the globe.
          </li>
          <li>
            <span>Biome</span>
            8.223 is sand / Frontier Town. 6.1400 is forest / Jungle. Other demo-data rows follow the same globe lookup.
          </li>
          <li>
            <span>Subsection</span>
            Engine clusters become places. On developed lands those sit in named districts. Production currently
            paints every district with the same course fraction; this page staggers them so you can read the intended
            order.
          </li>
          <li>
            <span>Stage</span>
            Per-concept: frontier → sprout → landmark + resident → mastered. Land-wide: progress 0–1 drives landmark
            stake / s1 / s2 / s3.
          </li>
        </ol>
      </section>

      <div className="growth-board">
        <aside className="growth-courses">
          <h2>Demo-data courses</h2>
          <ul>
            {DEMO_GROWTH_COURSES.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  data-active={row.id === course.id ? "true" : "false"}
                  onClick={() => {
                    setCourseId(row.id);
                    setLandOverride(null);
                  }}
                >
                  <b>{row.code}</b>
                  <em>{row.name}</em>
                  <small>
                    {row.role === "live" ? "live pipeline" : "snapshot leftover"} · {row.globeBiome} → {row.landName}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="growth-stage">
          <div className="growth-stage-meta">
            <p>
              <b>{course.code}</b> {course.landName}
              {landOverride && landOverride !== course.land ? " · previewing another land" : null}
            </p>
            <p>
              Landmark {landmarkStageForProgress(progress)} · {stage.label.toLowerCase()}
            </p>
          </div>
          <LandPreview key={visual} visual={visual} progress={progress} />
          <div className="growth-lands" role="group" aria-label="Preview another land">
            {LAND_PREVIEWS.map((land) => (
              <button
                key={land.id}
                type="button"
                data-active={(landOverride ?? course.land) === land.id ? "true" : "false"}
                onClick={() => setLandOverride(land.id === course.land ? null : land.id)}
              >
                {land.name}
              </button>
            ))}
          </div>
        </section>

        <aside className="growth-places">
          <h2>Places inside the land</h2>
          <ul>
            {places.map((place) => {
              const here = placeStateAtProgress(place, progress);
              return (
                <li key={`${place.districtId}-${place.cluster}-${place.index}`} data-spot={here.spot}>
                  <b>{place.cluster}</b>
                  <em>{place.districtName}</em>
                  <small>
                    {here.label}
                    {place.conceptCount ? ` · ${place.conceptCount} concepts` : ""}
                  </small>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      <section className="growth-transect">
        <div className="growth-ticks">
          {GROWTH_STAGES.map((row) => (
            <button
              key={row.id}
              type="button"
              data-current={nearestGrowthStage(progress) === row.id ? "true" : "false"}
              onClick={() => setProgress(row.progress)}
            >
              <span>{row.label}</span>
              <small>{row.ground}</small>
            </button>
          ))}
        </div>
        <label className="growth-slider">
          <span className="sr-only">Growth stage</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={progress}
            onChange={(event) => setProgress(Number(event.target.value))}
          />
        </label>
        <p className="growth-readout">
          {stage.label} · progress {progress.toFixed(2)} · semantic {stage.semantic} · spot {stage.spot} ·
          {stage.resident ? " resident" : " no resident"}
        </p>
        <div className="growth-snap">
          {GROWTH_STAGES.map((row) => (
            <button key={row.id} type="button" onClick={() => setProgress(progressForStage(row.id))}>
              {row.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
