"use client";

import type { CourseSummary } from "@/lib/identity";
import { buildRosterStats } from "@/lib/world/roster-stats";
import type { CourseOverviewCacheState } from "./useCourseOverviewCache";

export interface CourseNavigatorProps {
  courses: readonly CourseSummary[];
  activeCourseId: string | null;
  records: CourseOverviewCacheState;
  onFocusCourse(courseId: string): void;
}

function Sparkline({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(...values, 1);
  const width = 160;
  const height = 22;
  const points = values
    .map((value, index) => {
      const x = values.length <= 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - (value / max) * (height - 3) - 1.5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div className="roster-spark">
      <span>{label}</span>
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden>
        <polyline fill="none" stroke="currentColor" strokeWidth="1.7" points={points} />
      </svg>
    </div>
  );
}

export function CourseNavigator({
  courses,
  activeCourseId,
  records,
  onFocusCourse,
}: CourseNavigatorProps) {
  const stats = buildRosterStats(courses, records);
  const enrolled = stats.lines.find((line) => line.label === "Enrolled");
  const ingested = stats.lines.find((line) => line.label === "Ingested");
  const ideas = stats.lines.find((line) => line.label === "Ideas");
  const walkers = stats.lines.find((line) => line.label === "Walkers");

  return (
    <aside className="course-navigator" aria-label="Course navigator">
      <header className="course-navigator-summary">
        <span className="sg-eyebrow">Classes</span>
        <p className="chrome-legend">Seven lands. Click a class to aim its pin. Status lives on the flag.</p>
      </header>

      {courses.length > 0 ? (
        <ul className="course-roster">
          {courses.map((course) => {
            const active = course.id === activeCourseId;
            return (
              <li key={course.id}>
                <button
                  type="button"
                  className="course-roster-row"
                  data-active={active || undefined}
                  aria-current={active ? "true" : undefined}
                  onClick={() => onFocusCourse(course.id)}
                >
                  <span>{course.code ?? "Course"}</span>
                  <small>{course.name}</small>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="course-navigator-status">No courses yet.</p>
      )}

      <section className="roster-pulse" aria-label="Class pulse">
        <dl className="roster-metrics">
          <div>
            <dt>Enrolled</dt>
            <dd>{enrolled?.value}</dd>
          </div>
          <div>
            <dt>Ingested</dt>
            <dd>{ingested?.value}</dd>
          </div>
          <div>
            <dt>Ideas</dt>
            <dd>{ideas?.value}</dd>
          </div>
          <div>
            <dt>Walkers</dt>
            <dd>{walkers?.value}</dd>
          </div>
        </dl>
        <div className="roster-spark-row">
          <Sparkline values={stats.fileSeries} label="Files by class" />
          {stats.thickest ? (
            <p className="roster-strongest">
              Strongest · {stats.thickest.code} · {stats.thickest.files} files
            </p>
          ) : null}
        </div>
      </section>
    </aside>
  );
}
