import type { CourseSummary } from "@/lib/identity";
import { biomeForCourse } from "@/components/world/globe/globe-spec";
import type {
  CourseGlobeCourse,
  GlobeBiome,
  GlobeMarkerId,
} from "@/components/world/globe/globe-types";
import type { BiomeId } from "@/lib/world/types";

const BIOME_MARKERS: Record<GlobeBiome, GlobeMarkerId> = {
  ice: "ice-town",
  city: "city",
  meadow: "academy-town",
  forest: "forest",
  volcanic: "volcanic",
  sand: "egyptian-desert",
  coast: "harbor-town",
};

/** Neighbor towns so a one-course student still sees a lived-in planet. */
export const GLOBE_SHOWCASE: CourseGlobeCourse[] = [
  { id: "6.1210", code: "6.1210", name: "Introduction to Algorithms", biome: "ice", markerId: "ice-town", progress: 0.78, stats: null },
  { id: "18.06", code: "18.06", name: "Linear Algebra", biome: "city", markerId: "city", progress: 0.66, stats: null },
  { id: "8.02", code: "8.02", name: "Electricity and Magnetism", biome: "volcanic", markerId: "volcanic", progress: 0.41, stats: null },
  { id: "21W.789", code: "21W.789", name: "Communicating with Mobile Technology", biome: "meadow", markerId: "academy-town", progress: 0.34, stats: null },
  { id: "6.1400", code: "6.1400", name: "Computability and Complexity", biome: "forest", markerId: "forest", progress: 0.72, stats: null },
  { id: "8.223", code: "8.223", name: "Classical Mechanics II", biome: "sand", markerId: "egyptian-desert", progress: 0.55, stats: null },
  { id: "12.001", code: "12.001", name: "Introduction to Geology", biome: "coast", markerId: "harbor-town", progress: 0.49, stats: null },
  { id: "21L.003", code: "21L.003", name: "Reading Fiction", biome: "city", markerId: "ink-world", progress: 0.62, stats: null },
  { id: "8.962", code: "8.962", name: "General Relativity", biome: "city", markerId: "celestial-garden", progress: 0.44, stats: null },
  { id: "2.007", code: "2.007", name: "Design and Manufacturing", biome: "volcanic", markerId: "heavy-industry", progress: 0.51, stats: null },
  { id: "6.828", code: "6.828", name: "Operating System Engineering", biome: "coast", markerId: "future-utopia", progress: 0.39, stats: null },
  { id: "17.40", code: "17.40", name: "American Foreign Policy", biome: "sand", markerId: "wildwest", progress: 0.47, stats: null },
  { id: "12.005", code: "12.005", name: "Applications of Continuum Mechanics", biome: "ice", markerId: "alpine", progress: 0.58, stats: null },
  { id: "1.018", code: "1.018", name: "Ecology I", biome: "forest", markerId: "swamp", progress: 0.36, stats: null },
  { id: "7.014", code: "7.014", name: "Introductory Biology", biome: "forest", markerId: "jungle", progress: 0.69, stats: null },
  { id: "4.302", code: "4.302", name: "Foundations in Art, Design and Spatial Practices", biome: "meadow", markerId: "whimsical-land", progress: 0.53, stats: null },
  { id: "18.404", code: "18.404", name: "Theory of Computation", biome: "city", markerId: "fractal-recursion", progress: 0.61, stats: null },
];

export function markerIdForCourse(course: CourseGlobeCourse): GlobeMarkerId {
  return course.markerId ?? BIOME_MARKERS[course.biome];
}

export function rosterBiome(biome: GlobeBiome): BiomeId {
  if (biome === "volcanic") return "sand";
  if (biome === "coast") return "ice";
  return biome;
}

export function toGlobeCourses(courses: CourseSummary[]): CourseGlobeCourse[] {
  const real = courses.map((course) => ({
    id: course.id,
    code: course.code,
    name: course.name,
    biome: biomeForCourse(course.id),
    markerId: BIOME_MARKERS[biomeForCourse(course.id)],
    progress: 0.58,
    stats: null,
  }));
  const taken = new Set(real.map((course) => course.id));
  const extras = GLOBE_SHOWCASE.filter((course) => !taken.has(course.id));
  return [...real, ...extras].slice(0, 17);
}

export function isOwnedCourse(courseId: string, courses: CourseSummary[]): boolean {
  return courses.some((course) => course.id === courseId);
}
