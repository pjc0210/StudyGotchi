import type { KnowledgeGraphResponse } from "@/lib/types";
import type { WorldResponse } from "@/lib/api";
import { DEMO_COURSES } from "./demo-courses";
/**
 * In-app copies of two-course-pipeline JSON. Do not import
 * `../../../demo-data/two-course-pipeline/...` — Turbopack's frontend root
 * cannot resolve that path and /earth goes blank.
 */
import graphHero from "./pipeline/8.223-knowledge-graph.json";
import worldHero from "./pipeline/8.223-world.json";
import graphSecond from "./pipeline/6.1400-knowledge-graph.json";
import worldSecond from "./pipeline/6.1400-world.json";

const GRAPHS: Record<string, KnowledgeGraphResponse> = {
  [DEMO_COURSES[0].id]: graphHero as KnowledgeGraphResponse,
  [DEMO_COURSES[1].id]: graphSecond as KnowledgeGraphResponse,
};

const WORLDS: Record<string, WorldResponse> = {
  [DEMO_COURSES[0].id]: worldHero as WorldResponse,
  [DEMO_COURSES[1].id]: worldSecond as WorldResponse,
};

export function pipelineGraphForCourse(courseId: string): KnowledgeGraphResponse | null {
  return GRAPHS[courseId] ?? null;
}

export function pipelineWorldForCourse(courseId: string): WorldResponse | null {
  const world = WORLDS[courseId];
  if (!world) return null;
  return {
    ...world,
    course_id: courseId,
    regions: world.regions.map((region) => ({ ...region })),
    edges: world.edges.map((edge) => ({ ...edge })),
  };
}
