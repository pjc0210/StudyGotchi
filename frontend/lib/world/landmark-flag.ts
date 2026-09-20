import type { GlobeBiome } from "@/components/world/globe/globe-types";
import type { CourseResource } from "@/lib/types";
import type { CourseOverview } from "./course-overview";

export type LandmarkFlagPlacement = "page-bottom-left";

export function landmarkFlagPlacement(): LandmarkFlagPlacement {
  return "page-bottom-left";
}

const WORLD_TOWN: Record<GlobeBiome, string> = {
  ice: "Ice research town",
  city: "City campus",
  meadow: "Meadow kingdom",
  forest: "Jungle forest",
  volcanic: "Volcanic highlands",
  sand: "Frontier town",
  coast: "Coastal ruins",
};

export function worldTownLabel(biome: GlobeBiome): string {
  return WORLD_TOWN[biome];
}

export function worldSubjectFromName(name: string): string {
  const text = name.toLowerCase();
  if (/mechanic/.test(text)) return "mechanics";
  if (/computab|complex/.test(text)) return "complexity";
  if (/algorithm/.test(text)) return "algorithms";
  if (/algebra/.test(text)) return "algebra";
  if (/differential|equation/.test(text)) return "equations";
  if (/electric|magnet/.test(text)) return "electromagnetism";
  if (/numeric|comput/.test(text)) return "computation";
  const word = name
    .replace(/[:].*$/, "")
    .split(/\s+/)
    .map((part) => part.replace(/[^a-zA-Z]/g, ""))
    .find((part) => part.length > 3 && !/^(intro|introduction|foundations|theory)$/i.test(part));
  return (word ?? "studies").toLowerCase();
}

export function humanizeWorkedTitle(title: string): string {
  const stem = title.replace(/\\/g, "/").split("/").pop() ?? title;
  const bare = stem.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  const pset = bare.match(/pset\s*(\d+)/i);
  if (pset) return `Pset ${pset[1]}`;
  return bare.replace(/\s+/g, " ").slice(0, 42);
}

const BOGUS_TOTAL = 2000;

export interface LandmarkFlagInput {
  name: string;
  biome: GlobeBiome;
  fileCount: number;
  ideasMapped: number;
  ideasTotal?: number;
  lastWorkedTitle?: string | null;
}

export interface LandmarkFlagCopy {
  worldLine: string;
  statusLine: string;
  lastLine: string | null;
}

export function buildLandmarkFlagCopy(input: LandmarkFlagInput): LandmarkFlagCopy {
  const worldLine = `Your ${worldSubjectFromName(input.name)} world · ${worldTownLabel(input.biome)}`;
  const files =
    input.fileCount === 1 ? "1 course file" : `${Math.max(0, input.fileCount)} course files`;
  const ideas =
    input.ideasMapped > 0 && input.ideasMapped < BOGUS_TOTAL
      ? `${input.ideasMapped} ideas mapped`
      : "Mapping ideas";
  const last = input.lastWorkedTitle?.trim()
    ? `Last worked: ${humanizeWorkedTitle(input.lastWorkedTitle)}`
    : null;
  return {
    worldLine,
    statusLine: `${files} · ${ideas}`,
    lastLine: last,
  };
}

function latestWorkedTitle(overview: CourseOverview | null | undefined): string | null {
  if (!overview) return null;
  const files: CourseResource[] = [
    ...overview.unmatchedFiles,
    ...overview.topics.flatMap((topic) => topic.concepts.flatMap((concept) => concept.files)),
  ];
  const dated = files
    .filter((file) => file.uploaded_at)
    .sort((left, right) => (right.uploaded_at ?? "").localeCompare(left.uploaded_at ?? ""));
  const student = dated.find((file) => file.origin === "student_self");
  const pick = student ?? dated[0];
  if (pick?.title) return pick.title;
  const pset = files
    .map((file) => file.title)
    .reverse()
    .find((title) => /pset/i.test(title));
  return pset ?? files.at(-1)?.title ?? null;
}

export function lastWorkedTitleFromNames(titles: readonly string[]): string | null {
  return [...titles].reverse().find((title) => /pset/i.test(title)) ?? titles.at(-1) ?? null;
}

export function landmarkFlagInputFromOverview(args: {
  name: string;
  biome: GlobeBiome;
  fileCount: number;
  fileTitles?: readonly string[];
  overview?: CourseOverview | null;
}): LandmarkFlagInput {
  const ideas = args.overview?.stats.reached ?? 0;
  const total = args.overview?.stats.total ?? 0;
  return {
    name: args.name,
    biome: args.biome,
    fileCount: args.fileCount || args.overview?.stats.sources || 0,
    ideasMapped: ideas,
    ideasTotal: total > BOGUS_TOTAL ? undefined : total,
    lastWorkedTitle:
      lastWorkedTitleFromNames(args.fileTitles ?? []) ?? latestWorkedTitle(args.overview),
  };
}
