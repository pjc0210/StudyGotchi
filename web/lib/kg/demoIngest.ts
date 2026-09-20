/**
 * Frontend-only ingest simulation, for live demos when there is no time to
 * wire up a real upload. Fabricates a resource and nudges a handful of real
 * concept nodes so the graph visibly reacts - no backend call, nothing
 * persisted. This is the only place in the app allowed to invent data
 * client-side; everywhere else treats the engine's numbers as truth.
 */

import type {
  ArtifactType,
  ConceptNode,
  ConceptState,
  CourseResource,
  DiscoveryState,
} from "./types";

export type DemoIngestKind = "exam" | "notes";

const NOTES_TITLES = [
  "Monday's Notes",
  "Wednesday's Notes",
  "Friday's Notes",
  "Reading Notes — Ch. 6",
];

const EXAM_TITLES = [
  "Midterm 1 (Graded)",
  "Problem Set 5 (Graded)",
  "Quiz 3 (Graded)",
  "Final Exam (Graded)",
];

let demoSeq = 0;

/** Deterministic pseudo-random in [0,1) so a given concept moves by a
 * consistent-feeling amount rather than jittering on every render. */
function seeded(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function rotatingPick<T>(pool: T[], count: number, offset: number): T[] {
  if (pool.length === 0) return [];
  const n = Math.min(count, pool.length);
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(pool[(offset + i) % pool.length]);
  return out;
}

/** Notes are ungraded - in the real pipeline they only ever move exposure,
 * never mastery. Prefers concepts still in fog so the effect reads as the
 * coast clearing rather than an existing landmark just glowing brighter. */
function pickForNotes(nodes: ConceptNode[], offset: number): ConceptNode[] {
  const frontier = nodes.filter((n) => n.discovery_state === "frontier");
  const pool = frontier.length > 0 ? frontier : nodes;
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  return rotatingPick(sorted, 3, offset);
}

/** A graded exam only ever lands on concepts the student has actually
 * touched, and goes after the weakest ones first - aimed upward here so the
 * demo beat reads as visible progress. */
function pickForExam(nodes: ConceptNode[], offset: number): ConceptNode[] {
  const touched = nodes.filter(
    (n) => n.discovery_state === "encountered" || n.discovery_state === "active",
  );
  const pool = touched.length > 0 ? touched : nodes;
  const sorted = [...pool].sort(
    (a, b) => (a.understanding ?? 0.5) - (b.understanding ?? 0.5),
  );
  return rotatingPick(sorted, 4, offset);
}

function notesOutcome(node: ConceptNode): Partial<ConceptNode> {
  const discovery_state: DiscoveryState =
    node.discovery_state === "frontier" ? "encountered" : node.discovery_state;
  const state: ConceptState = node.state === "frontier" ? "exposed" : node.state;
  return { discovery_state, state };
}

function examOutcome(node: ConceptNode): Partial<ConceptNode> {
  const roll = seeded(node.id, demoSeq);
  const understanding = 0.82 + roll * 0.15;
  const state: ConceptState = understanding >= 0.9 ? "mastered" : "strong";
  return { discovery_state: "active" as DiscoveryState, understanding, state };
}

export interface DemoIngestResult {
  nodes: ConceptNode[];
  resource: CourseResource;
}

/** Applies one simulated ingest on top of the current node list. Call again
 * for a second demo beat - it rotates onto a fresh set of concepts and a new
 * file name each time. */
export function simulateDemoIngest(
  nodes: ConceptNode[],
  kind: DemoIngestKind,
): DemoIngestResult {
  demoSeq += 1;

  const picked = kind === "notes" ? pickForNotes(nodes, demoSeq) : pickForExam(nodes, demoSeq);
  const outcome = kind === "notes" ? notesOutcome : examOutcome;
  const patchById = new Map(picked.map((n) => [n.id, outcome(n)]));

  const patchedNodes = nodes.map((n) => {
    const patch = patchById.get(n.id);
    return patch ? { ...n, ...patch } : n;
  });

  const titles = kind === "notes" ? NOTES_TITLES : EXAM_TITLES;
  const title = titles[(demoSeq - 1) % titles.length];
  const artifactType: ArtifactType = kind === "notes" ? "student_notes" : "exam";

  const resource: CourseResource = {
    id: `demo-${kind}-${demoSeq}`,
    title,
    origin: "student_self",
    artifact_type: artifactType,
    concept_count: picked.length,
    concept_ids: picked.map((n) => n.id),
    status: "complete",
    uploaded_at: new Date().toISOString(),
  };

  return { nodes: patchedNodes, resource };
}
