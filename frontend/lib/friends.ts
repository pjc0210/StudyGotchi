/**
 * Friends' knowledge graphs for Introduction to Algorithms (6.1210) only.
 *
 * There is no real classmate data behind this - no ingested files, no
 * backend rows. It is generated client-side from the *real* 6.1210 course
 * structure (concept names, clusters, importance, prerequisite/related
 * edges - the objective part every student in the course shares) with a
 * synthetic, per-friend understanding/engagement profile layered on top,
 * plus a couple of invented "personal note" concepts per friend so each
 * graph also has a bit of content the real course ontology doesn't.
 *
 * Deterministic: the same friend always renders the same graph on reload
 * (seeded by friend id + concept id), so it reads as a real fixed person's
 * state rather than re-randomizing every visit.
 */

import courseData from "./data/intro-algorithms-course.json";
import type {
  ConceptEdge,
  ConceptNode,
  ConceptState,
  DiscoveryState,
  KnowledgeGraphResponse,
} from "./types";

export const INTRO_ALGO_COURSE_ID = courseData.course_id;

export interface Friend {
  id: string;
  name: string;
  blurb: string;
}

interface FriendProfile extends Friend {
  /** Roughly where this friend's understanding centers, before topic bias. */
  baseUnderstanding: number;
  /** Fraction of concepts this friend has engaged with at all; the rest
   *  render as frontier, same as a real partial progression would. */
  seenFraction: number;
  /** Name-substring matches (case-insensitive) that push understanding up. */
  strongKeywords: string[];
  /** Name-substring matches that pull understanding down. */
  weakKeywords: string[];
  /** Invented personal notes: a name, which real concept(s) to attach to
   *  (by name-substring match), and roughly how well they know it. */
  personalNotes: { name: string; attachTo: string; understanding: number }[];
}

const FRIEND_PROFILES: FriendProfile[] = [
  {
    id: "pj",
    name: "PJ",
    blurb:
      "Strong on divide-and-conquer and sorting - Karatsuba and merge sort clicked early. Hasn't spent much real time on graph algorithms yet.",
    baseUnderstanding: 0.56,
    seenFraction: 0.72,
    strongKeywords: [
      "Divide",
      "Recursion",
      "Karatsuba",
      "Merge Sort",
      "Sort",
      "Master Theorem",
    ],
    weakKeywords: [
      "Graph",
      "BFS",
      "DFS",
      "Dijkstra",
      "Bellman",
      "Shortest Path",
      "SCC",
      "Strongly Connected",
    ],
    personalNotes: [
      {
        name: "PJ's Recursion Tree Shortcut",
        attachTo: "Divide",
        understanding: 0.82,
      },
      {
        name: "PJ's Karatsuba Worked Example",
        attachTo: "Karatsuba",
        understanding: 0.78,
      },
    ],
  },
  {
    id: "eddy",
    name: "Eddy",
    blurb:
      "Strong on hashing and BST correctness arguments - likes proving invariants before trusting an algorithm. Dynamic programming is still slow going.",
    baseUnderstanding: 0.58,
    seenFraction: 0.68,
    strongKeywords: ["Hash", "Correctness", "Invariant", "Tree", "BST", "Search"],
    weakKeywords: [
      "Dynamic Programming",
      "Subset Sum",
      "Optimal Substructure",
      "DP",
    ],
    personalNotes: [
      {
        name: "Eddy's Hash Table Load Factor Notes",
        attachTo: "Hash",
        understanding: 0.85,
      },
      {
        name: "Eddy's BST Invariant Checklist",
        attachTo: "BST",
        understanding: 0.8,
      },
    ],
  },
  {
    id: "adhyann",
    name: "Adhyann",
    blurb:
      "Practice-heavy - strong on greedy algorithms and heaps from problem sets, but the asymptotic/complexity theory side hasn't stuck yet.",
    baseUnderstanding: 0.52,
    seenFraction: 0.65,
    strongKeywords: ["Greedy", "Huffman", "Heap", "Priority Queue"],
    weakKeywords: [
      "Complexity",
      "Asymptotic",
      "Computability",
      "Reduction",
      "NP",
    ],
    personalNotes: [
      {
        name: "Adhyann's Greedy Exchange Argument Cheatsheet",
        attachTo: "Greedy",
        understanding: 0.83,
      },
      {
        name: "Adhyann's Heap Operations Drill",
        attachTo: "Heap",
        understanding: 0.79,
      },
    ],
  },
];

export const FRIENDS: Friend[] = FRIEND_PROFILES.map(({ id, name, blurb }) => ({
  id,
  name,
  blurb,
}));

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic pseudo-random in [0,1) from a seed string. */
function seededUnit(seed: string): number {
  return (hash(seed) % 100000) / 100000;
}

function matchesAny(name: string, keywords: string[]): boolean {
  const lower = name.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

function classifyState(
  understanding: number | null,
  discoveryState: DiscoveryState,
): ConceptState {
  if (discoveryState === "frontier" || understanding === null) return "frontier";
  if (understanding >= 0.85) return "mastered";
  if (understanding >= 0.7) return "strong";
  if (understanding < 0.3) return "exposed";
  if (understanding < 0.45) return "struggling";
  return "developing";
}

function clamp01(v: number): number {
  return Math.max(0.02, Math.min(0.98, v));
}

/** Builds one friend's synthetic-but-structurally-real knowledge graph. */
export function buildFriendGraph(friendId: string): KnowledgeGraphResponse {
  const profile = FRIEND_PROFILES.find((f) => f.id === friendId);
  if (!profile) {
    throw new Error(`Unknown friend id: ${friendId}`);
  }

  const nodes: ConceptNode[] = [];
  const edges: ConceptEdge[] = courseData.edges.map((e) => ({
    source: e.source,
    target: e.target,
    type: e.edge_type,
    origin: "course" as const,
    confidence: 0.85,
  }));

  for (const c of courseData.nodes) {
    const seen = seededUnit(`${friendId}:${c.id}:seen`) < profile.seenFraction;

    if (!seen) {
      nodes.push({
        id: c.id,
        name: c.name,
        scope: "course",
        discovery_state: "frontier",
        cluster: c.cluster ?? undefined,
        importance: c.importance,
        personal_relevance: Math.round(seededUnit(`${friendId}:${c.id}:rel`) * 20) / 100,
        understanding: null,
        state: "frontier",
      });
      continue;
    }

    let understanding = profile.baseUnderstanding;
    understanding += (seededUnit(`${friendId}:${c.id}:noise`) - 0.5) * 0.3;
    if (matchesAny(c.name, profile.strongKeywords)) understanding += 0.25;
    if (matchesAny(c.name, profile.weakKeywords)) understanding -= 0.25;
    understanding = clamp01(understanding);

    const engaged = seededUnit(`${friendId}:${c.id}:engage`) < 0.55;
    const discoveryState: DiscoveryState = engaged ? "active" : "encountered";

    nodes.push({
      id: c.id,
      name: c.name,
      scope: "course",
      discovery_state: discoveryState,
      cluster: c.cluster ?? undefined,
      importance: c.importance,
      personal_relevance: Math.round((0.3 + seededUnit(`${friendId}:${c.id}:rel`) * 0.6) * 100) / 100,
      understanding: Math.round(understanding * 100) / 100,
      state: classifyState(understanding, discoveryState),
    });
  }

  // Invented personal notes: concepts the real course ontology has no idea
  // about, each attached to whichever real concept its name best matches.
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const note of profile.personalNotes) {
    const target = courseData.nodes.find((c) =>
      c.name.toLowerCase().includes(note.attachTo.toLowerCase()),
    );
    if (!target) continue;

    const noteId = `${friendId}-note-${note.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
    nodes.push({
      id: noteId,
      name: note.name,
      scope: "personal",
      discovery_state: "active",
      cluster: byId.get(target.id)?.cluster,
      importance: 0.35,
      personal_relevance: 0.95,
      understanding: note.understanding,
      state: classifyState(note.understanding, "active"),
    });
    edges.push({
      source: noteId,
      target: target.id,
      type: "PERSONAL_BUILDS_ON",
      origin: "personal",
      confidence: 0.7,
    });
  }

  return {
    student_id: `friend-${friendId}`,
    course_id: INTRO_ALGO_COURSE_ID,
    graph_version: 1,
    nodes,
    edges,
    // Every course concept is rendered (as frontier when not "seen"), so
    // nothing is actually excluded - this stays 0 rather than faking a
    // number for a field the real backend uses for genuinely hidden nodes.
    hidden_concept_count: 0,
  };
}
