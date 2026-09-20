import type { CourseGlobeStats } from "@/components/world/globe/globe-types";
import type { CourseSummary } from "@/lib/identity";
import type { CourseResource } from "@/lib/types";
import type { WorldRegion, WorldResponse } from "./types";

export interface CourseTopicNode {
  id: string;
  label: string;
  concepts: CourseConceptNode[];
}

export interface CourseConceptNode {
  id: string;
  label: string;
  semanticState: WorldRegion["semantic_state"];
  creatureState: WorldRegion["creature_state"];
  files: CourseResource[];
}

export interface CourseOverview {
  course: CourseSummary;
  topics: CourseTopicNode[];
  unmatchedFiles: CourseResource[];
  stats: CourseGlobeStats;
  worldVersion: string;
}

const UNCLUSTERED_TOPIC_ID = "unclustered";
const UNCLUSTERED_TOPIC_LABEL = "Other concepts";

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "en");
}

function compareLabelAndId(
  left: { id: string; label: string },
  right: { id: string; label: string },
): number {
  return compareText(left.label, right.label) || compareText(left.id, right.id);
}

function compareResources(left: CourseResource, right: CourseResource): number {
  return compareText(left.title, right.title) || compareText(left.id, right.id);
}

function resourceKey(resource: CourseResource): string {
  return JSON.stringify([
    resource.title,
    resource.origin,
    resource.artifact_type,
    resource.status,
    resource.uploaded_at,
    resource.concept_count,
    [...new Set(resource.concept_ids)].sort(compareText),
  ]);
}

function mergeResourceRows(
  left: CourseResource,
  right: CourseResource,
): CourseResource {
  const selected =
    compareText(resourceKey(left), resourceKey(right)) <= 0 ? left : right;
  const conceptIds = [...new Set([...left.concept_ids, ...right.concept_ids])].sort(
    compareText,
  );
  return {
    ...selected,
    concept_count: conceptIds.length,
    concept_ids: conceptIds,
  };
}

export function buildCourseOverview(
  course: CourseSummary,
  world: WorldResponse,
  resources: CourseResource[],
): CourseOverview {
  const topicsById = new Map<string, CourseTopicNode>();
  const conceptsById = new Map<string, CourseConceptNode>();

  for (const region of world.regions) {
    const topicId = region.cluster_id ?? UNCLUSTERED_TOPIC_ID;
    const topicLabel =
      region.cluster ?? (region.cluster_id ? `Topic ${region.cluster_id}` : UNCLUSTERED_TOPIC_LABEL);
    const topic = topicsById.get(topicId) ?? {
      id: topicId,
      label: topicLabel,
      concepts: [],
    };

    // Inconsistent backend labels should not make ordering depend on payload order.
    if (compareText(topicLabel, topic.label) < 0) topic.label = topicLabel;

    const concept: CourseConceptNode = {
      id: region.concept_id,
      label: region.name,
      semanticState: region.semantic_state,
      creatureState: region.creature_state,
      files: [],
    };
    topic.concepts.push(concept);
    topicsById.set(topicId, topic);
    conceptsById.set(concept.id, concept);
  }

  const unmatchedFiles: CourseResource[] = [];
  const uniqueResources = new Map<string, CourseResource>();
  for (const resource of resources) {
    const existing = uniqueResources.get(resource.id);
    uniqueResources.set(
      resource.id,
      existing
        ? mergeResourceRows(existing, resource)
        : {
            ...resource,
            concept_ids: [...new Set(resource.concept_ids)].sort(compareText),
          },
    );
  }

  for (const resource of uniqueResources.values()) {
    let matched = false;
    for (const conceptId of new Set(resource.concept_ids)) {
      const concept = conceptsById.get(conceptId);
      if (!concept) continue;
      concept.files.push(resource);
      matched = true;
    }
    if (!matched) unmatchedFiles.push(resource);
  }

  const topics = [...topicsById.values()]
    .map((topic) => ({
      ...topic,
      concepts: topic.concepts
        .map((concept) => ({
          ...concept,
          files: [...concept.files].sort(compareResources),
        }))
        .sort(compareLabelAndId),
    }))
    .sort(compareLabelAndId);

  return {
    course,
    topics,
    unmatchedFiles: unmatchedFiles.sort(compareResources),
    stats: {
      reached: world.regions.filter((region) => region.semantic_state !== "frontier").length,
      total: world.regions.length + world.hidden_concept_count,
      mastered: world.regions.filter((region) => region.semantic_state === "mastered").length,
      residents: world.regions.filter((region) => region.creature_state !== "unhatched").length,
      sources: uniqueResources.size,
    },
    worldVersion: world.world_version,
  };
}
