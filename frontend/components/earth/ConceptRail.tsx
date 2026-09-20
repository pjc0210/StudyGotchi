"use client";

import { useMemo, useState } from "react";
import type { WorldEvent } from "@/lib/api";
import type { WorldResponse } from "@/lib/world/types";
import type { CourseOverview } from "@/lib/world/course-overview";
import { conceptIdForLabel, conceptsForIceDistrict } from "@/lib/world/ice-district-concepts";
import { useStore } from "@/lib/store";
import { DEMO_COURSES } from "@/lib/world/demo-courses";
import { visibleCourseFileTitles } from "@/lib/world/demo-ingest";
import { UploadBox } from "./UploadBox";

export interface ConceptRailItem {
  id: string;
  label: string;
  conceptId: string;
}

export interface IceLandPlace {
  id: string;
  label: string;
}

export const ICE_LAND_PLACES: readonly IceLandPlace[] = [
  { id: "harbour", label: "Harbour" },
  { id: "town", label: "Town" },
  { id: "lake", label: "Lake" },
  { id: "forest", label: "Pine town" },
  { id: "glacier", label: "Mountain camp" },
  { id: "station", label: "Research island" },
];

export interface ConceptRailProps {
  courseCode: string | null;
  world: WorldResponse | null;
  overview: CourseOverview | null;
  events?: readonly WorldEvent[];
  activeConceptId: string | null;
  activePlaceId?: string | null;
  iceLand?: boolean;
  onLeave(): void;
  onSelectConcept(conceptId: string): void;
  onVisitPlace?(placeId: string): void;
}

const MAX_TOPIC_CLUSTERS = 12;

/** Shared topic/cluster names only — never one row per file or region. */
export function clustersForRail(
  world: WorldResponse | null,
  overview: CourseOverview | null,
): ConceptRailItem[] {
  const topics = (overview?.topics ?? []).filter((topic) => topic.id !== "unclustered");
  if (topics.length > 0 && topics.length <= MAX_TOPIC_CLUSTERS) {
    return topics.map((topic) => ({
      id: topic.id,
      label: topic.label,
      conceptId: topic.concepts[0]?.id ?? topic.id,
    }));
  }

  if (world && world.regions.length > 0) {
    const counts = new Map<string, number>();
    const seen = new Map<string, ConceptRailItem>();
    for (const region of world.regions) {
      const key = region.cluster?.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (!seen.has(key)) {
        seen.set(key, { id: key, label: key, conceptId: region.concept_id });
      }
    }
    const shared = [...seen.values()].filter((item) => (counts.get(item.id) ?? 0) >= 2);
    if (shared.length > 1 && shared.length <= MAX_TOPIC_CLUSTERS) {
      return shared.sort((left, right) => left.label.localeCompare(right.label, "en"));
    }
  }

  return [];
}

function iceFlavor(reached: number, total: number): string {
  if (total <= 0) return "Harbour fog is lifting.";
  const ratio = reached / total;
  if (ratio >= 0.4) return "Pack ice is holding. The observatory is lit.";
  if (ratio >= 0.15) return "The lake is skating-hard. Town is waking.";
  return "Snow is down. The mainland is waiting.";
}

export function ConceptRail({
  courseCode,
  world,
  overview,
  events = [],
  activeConceptId,
  activePlaceId = null,
  iceLand = false,
  onLeave,
  onSelectConcept,
  onVisitPlace,
}: ConceptRailProps) {
  const [open, setOpen] = useState(true);
  const clusters = useMemo(() => clustersForRail(world, overview), [overview, world]);
  const reached = world ? world.regions.filter((region) => region.semantic_state !== "frontier").length : overview?.stats.reached ?? 0;
  const total = world ? world.regions.length + world.hidden_concept_count : overview?.stats.total ?? 0;
  const lastIngest = events.find((event) => event.event === "RESOURCE_ADDED" || event.event === "RESOURCE_ANALYZED");
  const lastTest = events.find((event) => event.event === "UNDERSTANDING_GAIN" || event.event === "CONCEPT_MASTERED");
  const { resources, ingestVersion } = useStore();
  const iceFiles = useMemo(
    () => visibleCourseFileTitles(DEMO_COURSES[0].id, resources),
    [resources, ingestVersion],
  );

  return (
    <aside
      className="concept-rail"
      data-open={open ? "true" : undefined}
      aria-label="Land navigation"
    >
      <button
        type="button"
        className="concept-rail-tab"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Land
      </button>
      <div className="concept-rail-panel" hidden={!open}>
        <header>
          <button type="button" className="sg-btn" onClick={onLeave}>
            The planet
          </button>
          <h2>{courseCode ?? "Land"}</h2>
          <p>{iceLand ? iceFlavor(reached, total) : "Walk the land. Status stays compact."}</p>
        </header>
        <dl className="concept-rail-stats">
          <div>
            <dt>Ideas</dt>
            <dd>{total > 0 ? `${reached} / ${total}` : "—"}</dd>
          </div>
          <div>
            <dt>Last ingest</dt>
            <dd>{lastIngest?.explanation ?? (iceLand ? "Pipeline quiet" : "No new files")}</dd>
          </div>
          <div>
            <dt>Latest test</dt>
            <dd>{lastTest?.explanation ?? (iceLand ? "No quiz on the ice yet" : "No quiz yet")}</dd>
          </div>
        </dl>
        {iceLand ? (
          <>
            <p className="concept-rail-hint">Places. Tap the name to look there. Open Concepts for the ideas that live there.</p>
            <ul className="concept-rail-places">
              {ICE_LAND_PLACES.map((place) => {
                const concepts = conceptsForIceDistrict(place.id);
                return (
                  <li key={place.id}>
                    <button
                      type="button"
                      data-active={place.id === activePlaceId || undefined}
                      onClick={() => onVisitPlace?.(place.id)}
                    >
                      {place.label}
                    </button>
                    {concepts.length > 0 ? (
                      <details className="place-concepts">
                        <summary>Concepts</summary>
                        <ul>
                          {concepts.map((concept) => (
                            <li key={concept}>
                              <button
                                type="button"
                                onClick={() =>
                                  onSelectConcept(conceptIdForLabel(world?.regions, concept) ?? concept)
                                }
                              >
                                {concept}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <UploadBox courseId={DEMO_COURSES[0].id} />
            <details className="course-files">
              <summary>Course files · {iceFiles.length}</summary>
              <ul>
                {iceFiles.map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
            </details>
          </>
        ) : null}
        {clusters.length > 0 ? (
          <>
            <p className="concept-rail-hint">General concepts.</p>
            <ul>
              {clusters.map((cluster) => (
                <li key={cluster.id}>
                  <button
                    type="button"
                    data-active={cluster.conceptId === activeConceptId || undefined}
                    onClick={() => onSelectConcept(cluster.conceptId)}
                  >
                    {cluster.label}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : iceLand ? null : (
          <p className="concept-rail-empty">This land is still assembling its clusters.</p>
        )}
      </div>
    </aside>
  );
}
