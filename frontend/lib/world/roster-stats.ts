import type { CourseSummary } from "@/lib/identity";
import type { CourseOverviewCacheState } from "@/components/earth/useCourseOverviewCache";
import { sandboxCourseById } from "./sandbox-roster";

export interface RosterStatLine {
  label: string;
  value: string;
}

export interface RosterStats {
  enrolled: number;
  files: number;
  reached: number;
  total: number;
  walkers: number;
  term: string;
  thickest: { code: string; files: number } | null;
  thinnest: { code: string; files: number } | null;
  fileSeries: number[];
  reachedSeries: number[];
  walkerSeries: number[];
  bars: { code: string; files: number }[];
  lines: RosterStatLine[];
}

const BOGUS_IDEAS_TOTAL = 2000;

export function rosterIdeasValue(reached: number, total: number): string {
  if (reached <= 0) return "Waiting on lands";
  const bogus = total > BOGUS_IDEAS_TOTAL || (total > 0 && total > reached * 10 + 50);
  if (bogus || total <= 0) return `${reached} mapped`;
  return `${reached} mapped`;
}

function fileCountFor(
  course: CourseSummary,
  records: CourseOverviewCacheState,
): number {
  const ready = records.get(course.id);
  if (ready?.status === "ready" && ready.data.stats.sources > 0) {
    return ready.data.stats.sources;
  }
  return sandboxCourseById(course.id)?.fileCount ?? 0;
}

export function buildRosterStats(
  courses: readonly CourseSummary[],
  records: CourseOverviewCacheState,
): RosterStats {
  let files = 0;
  let reached = 0;
  let total = 0;
  let walkers = 0;
  let thickest: { code: string; files: number } | null = null;
  let thinnest: { code: string; files: number } | null = null;
  const fileSeries: number[] = [];
  const reachedSeries: number[] = [];
  const walkerSeries: number[] = [];
  const bars: { code: string; files: number }[] = [];

  for (const course of courses) {
    const count = fileCountFor(course, records);
    files += count;
    const code = course.code ?? course.name;
    bars.push({ code, files: count });
    if (!thickest || count > thickest.files) thickest = { code, files: count };
    if (count > 0 && (!thinnest || count < thinnest.files)) {
      thinnest = { code, files: count };
    }
    const record = records.get(course.id);
    if (record?.status === "ready") {
      reached += record.data.stats.reached;
      total += record.data.stats.total;
      walkers += record.data.stats.residents;
      fileSeries.push(record.data.stats.sources || count);
      reachedSeries.push(
        record.data.stats.total > 0
          ? Math.round((record.data.stats.reached / record.data.stats.total) * 100)
          : 0,
      );
      walkerSeries.push(record.data.stats.residents);
    } else {
      fileSeries.push(count);
      reachedSeries.push(0);
      walkerSeries.push(0);
    }
  }

  const terms = courses
    .map((course) => course.term)
    .filter((term): term is string => Boolean(term));
  const term = terms[0] ?? "This term";

  const lines: RosterStatLine[] = [
    {
      label: "Enrolled",
      value: courses.length === 1 ? "1 course" : `${courses.length} courses`,
    },
    {
      label: "Ingested",
      value: files === 1 ? "1 file" : `${files} files`,
    },
    {
      label: "Ideas",
      value: rosterIdeasValue(reached, total),
    },
    {
      label: "Buddies",
      value: walkers === 1 ? "1 buddy hatched" : `${walkers} buddies hatched`,
    },
    { label: "Term", value: `${term} · in session` },
  ];
  if (thickest) {
    lines.push({
      label: "Thickest land",
      value: `${thickest.code} · ${thickest.files} files`,
    });
  }
  if (thinnest && thinnest.code !== thickest?.code) {
    lines.push({
      label: "Thinnest syllabus",
      value: `${thinnest.code} · ${thinnest.files} files`,
    });
  }

  return {
    enrolled: courses.length,
    files,
    reached,
    total,
    walkers,
    term,
    thickest,
    thinnest,
    fileSeries,
    reachedSeries,
    walkerSeries,
    bars,
    lines,
  };
}
