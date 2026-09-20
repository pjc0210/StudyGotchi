import { visualForGlobeBiome, type LocalBiomeId } from "@/components/world/biomes/types";
import type { GlobeBiome } from "@/components/world/globe/globe-types";
import { biomeForGlobeCourse } from "./globe-courses";
import { DEMO_COURSES } from "./demo-courses";

export type GrowthStageId = "empty" | "arriving" | "sprouting" | "populated" | "mastered";
export type LandmarkStage = "stake" | "s1" | "s2" | "s3";
export type SpotState = 0 | 1 | 2;

export interface GrowthStage {
  id: GrowthStageId;
  label: string;
  /** Land-wide fraction WorldPage already feeds developed biomes. */
  progress: number;
  semantic: "frontier" | "exposed" | "developing" | "strong" | "mastered";
  spot: SpotState;
  landmark: LandmarkStage;
  resident: boolean;
  ground: string;
}

export interface GrowthDistrict {
  id: string;
  name: string;
}

export interface GrowthCourse {
  id: string;
  code: string;
  name: string;
  term: string;
  source: string;
  role: "live" | "snapshot";
  globeBiome: GlobeBiome;
  land: LocalBiomeId;
  landName: string;
  districts: GrowthDistrict[];
  clusters: string[];
}

export interface GrowthPlace {
  cluster: string;
  conceptCount: number;
  districtId: string;
  districtName: string;
  index: number;
  total: number;
}

export interface PlaceStage {
  semantic: GrowthStage["semantic"];
  spot: SpotState;
  landmark: LandmarkStage;
  resident: boolean;
  label: string;
}

const LAND_NAME: Record<LocalBiomeId, string> = {
  "ice-golden": "Chilly Town",
  "frontier-town": "Frontier Town",
  "coastal-ruins": "Coastal Ruins",
  "jungle-forest-village": "Jungle / Forest Village",
  "medieval-meadow-kingdom": "Medieval Meadow Kingdom",
  "nordic-volcanic-highlands": "Nordic Volcanic Highlands",
  island: "Generic island",
};

const DISTRICTS: Record<LocalBiomeId, GrowthDistrict[]> = {
  "ice-golden": [
    { id: "harbour", name: "Harbour" },
    { id: "observatory", name: "Observatory" },
    { id: "lighthouse", name: "Lighthouse" },
    { id: "ice-town", name: "Ice Town" },
  ],
  "frontier-town": [
    { id: "main-town", name: "Main Town" },
    { id: "railway-station", name: "Grand Railway" },
    { id: "outskirts-reserve", name: "Desert Reserve" },
    { id: "broad-ranch", name: "Broad Ranch" },
    { id: "mine-works", name: "Mine Works" },
    { id: "archaeology-dig", name: "Frontier Dig" },
  ],
  "coastal-ruins": [
    { id: "cliff-village", name: "Cliff Village Terraces" },
    { id: "archaeology-ridge", name: "Archaeology Ridge" },
    { id: "dry-terraces", name: "Dry Terraces" },
    { id: "drowned-forum", name: "Drowned Forum Cove" },
    { id: "working-quay", name: "Working Quay" },
  ],
  "jungle-forest-village": [
    { id: "canopy", name: "Great Canopy Village" },
    { id: "falls", name: "Falls Terraces" },
    { id: "lagoon", name: "Lagoon Quarter" },
    { id: "ruins", name: "Ruin Commons" },
    { id: "riverworks", name: "Riverworks" },
  ],
  "medieval-meadow-kingdom": [
    { id: "forest-hamlet", name: "Forest Hamlet + Timber Common" },
    { id: "river-village", name: "River Village + Mill" },
    { id: "bridge-market", name: "Bridge Market + Guild Court" },
    { id: "farm-common", name: "Farm + Village Common" },
    { id: "castle-court", name: "Crown Headland + Castle Court" },
  ],
  "nordic-volcanic-highlands": [
    { id: "fjord-village", name: "Fjord Village + Quay" },
    { id: "basalt-canyon", name: "Basalt Canyon + Mine/Forge" },
    { id: "highland-hamlet", name: "Highland Hamlet + Pasture" },
    { id: "geothermal-farms", name: "Geothermal Farms + Outpost" },
    { id: "archipelago", name: "Lava Archipelago" },
  ],
  island: [{ id: "loose", name: "Loose ends" }],
};

/**
 * Product growth ladder from build_spec + WorldPage progress + biome landmarkStage.
 * Empty / arriving stay frontier. Sprouting is encountered. Populated is demonstrated
 * plus a resident. Mastered is the engine's mastered semantic state.
 */
export const GROWTH_STAGES: readonly GrowthStage[] = [
  {
    id: "empty",
    label: "Empty",
    progress: 0,
    semantic: "frontier",
    spot: 0,
    landmark: "stake",
    resident: false,
    ground: "Fog or empty dirt. Nothing has been reached.",
  },
  {
    id: "arriving",
    label: "Arriving",
    progress: 0.08,
    semantic: "frontier",
    spot: 0,
    landmark: "stake",
    resident: false,
    ground: "The land mounts after the globe dive. Still frontier until a concept is touched.",
  },
  {
    id: "sprouting",
    label: "Sprouting",
    progress: 0.28,
    semantic: "exposed",
    spot: 1,
    landmark: "s1",
    resident: false,
    ground: "Encountered. A sprout on that concept's spot.",
  },
  {
    id: "populated",
    label: "Populated",
    progress: 0.62,
    semantic: "strong",
    spot: 2,
    landmark: "s2",
    resident: true,
    ground: "Demonstrated landmark, ground rising, a resident from a finished piece of work.",
  },
  {
    id: "mastered",
    label: "Mastered",
    progress: 1,
    semantic: "mastered",
    spot: 2,
    landmark: "s3",
    resident: true,
    ground: "Mastery. Landmark at s3, the district is full, the resident stays.",
  },
];

const CLUSTER_COUNTS: Record<string, Record<string, number>> = {
  "6.1400": {
    "Regular Language": 7,
    "Deterministic Finite Automaton (DFA)": 6,
    "Myhill-Nerode Theorem": 4,
    "Strings with Equal #01 and #10": 3,
    "Non-Regularity of Binary Palindromes": 3,
    "Regular Languages Closed Under Insertion": 3,
    "Nondeterministic Finite Automaton": 2,
  },
  "18.06": {},
  "CS-4780": {
    "Kernel Regression": 3,
    "Positive Semidefinite Matrices": 2,
  },
  "8.223": {
    "Canonical Momentum": 22,
    "Euler-Lagrange with Constraints": 15,
    "Lagrangian Formalism": 12,
    "Lagrange Multipliers": 9,
    "Lorentz Force Law": 8,
    "Noether's Theorem": 7,
  },
};

const SNAPSHOT_EXTRAS = [
  {
    id: "bf84e275-44e3-464d-8099-a2d501b3dedb",
    code: "18.06",
    name: "Linear Algebra",
    term: "Spring 2026",
  },
  {
    id: "f32fc8a6-e500-4621-b349-cf4cdc01881c",
    code: "CS-4780",
    name: "Intermediate Machine Learning",
    term: "Fall 2026",
  },
] as const;

function courseOf(
  id: string,
  code: string | null,
  name: string,
  term: string,
  source: string,
  role: GrowthCourse["role"],
): GrowthCourse {
  const globeBiome = biomeForGlobeCourse(id, code);
  const land = visualForGlobeBiome(globeBiome);
  return {
    id,
    code: code ?? id,
    name,
    term,
    source,
    role,
    globeBiome,
    land,
    landName: LAND_NAME[land],
    districts: DISTRICTS[land],
    clusters: Object.keys(CLUSTER_COUNTS[code ?? ""] ?? {}),
  };
}

/** Live pipeline roster first, then leftover snapshot courses still sitting in demo-data. */
export const DEMO_GROWTH_COURSES: GrowthCourse[] = [
  ...DEMO_COURSES.map((course) =>
    courseOf(course.id, course.code, course.name, course.term, "demo-data/two-course-pipeline", "live"),
  ),
  ...SNAPSHOT_EXTRAS.map((course) =>
    courseOf(course.id, course.code, course.name, course.term, "demo-data/snapshot", "snapshot"),
  ),
];

export function assignPlaces(course: GrowthCourse): GrowthPlace[] {
  const clusters = course.clusters;
  const districts = course.districts;
  if (clusters.length === 0) {
    return districts.map((district, index) => ({
      cluster: "No ingested cluster yet",
      conceptCount: 0,
      districtId: district.id,
      districtName: district.name,
      index,
      total: districts.length,
    }));
  }
  const counts = CLUSTER_COUNTS[course.code] ?? {};
  return clusters.map((cluster, index) => {
    const district = districts[index % districts.length];
    return {
      cluster,
      conceptCount: counts[cluster] ?? 1,
      districtId: district.id,
      districtName: district.name,
      index,
      total: clusters.length,
    };
  });
}

export function progressForStage(id: GrowthStageId): number {
  return GROWTH_STAGES.find((stage) => stage.id === id)?.progress ?? 0;
}

export function nearestGrowthStage(progress: number): GrowthStageId {
  const value = clamp01(progress);
  let best = GROWTH_STAGES[0];
  let distance = Math.abs(value - best.progress);
  for (const stage of GROWTH_STAGES) {
    const next = Math.abs(value - stage.progress);
    if (next < distance) {
      best = stage;
      distance = next;
    }
  }
  return best.id;
}

export function growthStageAt(progress: number): GrowthStage {
  const id = nearestGrowthStage(progress);
  return GROWTH_STAGES.find((stage) => stage.id === id) ?? GROWTH_STAGES[0];
}

/** Shared developed-biome landmark curve (frontier-town / most lands). */
export function landmarkStageForProgress(progress: number): LandmarkStage {
  const value = clamp01(progress);
  if (value <= 0) return "stake";
  if (value < 0.5) return "s1";
  if (value < 1) return "s2";
  return "s3";
}

export function placeStateAtProgress(place: GrowthPlace, progress: number): PlaceStage {
  const value = clamp01(progress);
  const gate = place.total <= 1 ? 0 : place.index / place.total;
  if (value <= 0 || value < gate) {
    return { semantic: "frontier", spot: 0, landmark: "stake", resident: false, label: "Frontier" };
  }
  const local = clamp01((value - gate) / Math.max(0.18, 1 - gate));
  if (local <= 0.32) {
    return { semantic: "exposed", spot: 1, landmark: "s1", resident: false, label: "Sprout" };
  }
  if (local < 0.72) {
    return { semantic: "strong", spot: 2, landmark: "s2", resident: true, label: "Landmark + resident" };
  }
  return { semantic: "mastered", spot: 2, landmark: "s3", resident: true, label: "Mastered" };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
