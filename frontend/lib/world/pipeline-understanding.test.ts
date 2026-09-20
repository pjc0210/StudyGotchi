import { describe, expect, it } from "vitest";
import { normalizeGraph } from "../api";
import { buildGraphModel } from "../graphModel";
import { DEMO_COURSES } from "./demo-courses";
import { pipelineGraphForCourse } from "./pipeline-assets";
import { pipelineConceptDetail, pipelineSourceForConcept, weakAreaTracks, weakGapTraces } from "./pipeline-understanding";

describe("8.223 pipeline scores and sources", () => {
  it("fills mastery, familiarity, and confidence for every personal graph node", () => {
    const graph = normalizeGraph(pipelineGraphForCourse(DEMO_COURSES[0].id));
    expect(graph.nodes.length).toBe(186);
    for (const node of graph.nodes) {
      expect(node.mastery, node.name).not.toBeNull();
      expect(node.familiarity).toBeGreaterThan(0);
      expect(node.confidence).toBeGreaterThan(0);
      expect(node.name).not.toMatch(/\\frac|\\omega|\\vec/);
    }
  });

  it("points every node at a real ingested PDF", () => {
    const graph = normalizeGraph(pipelineGraphForCourse(DEMO_COURSES[0].id));
    for (const node of graph.nodes) {
      const source = pipelineSourceForConcept(DEMO_COURSES[0].id, node.id);
      const detail = pipelineConceptDetail(DEMO_COURSES[0].id, node.id);
      expect(source?.title).toMatch(/\.pdf$/i);
      expect(detail?.resources[0]?.title).toBe(source?.title);
    }
  });

  it("groups weak areas into constellation tracks", () => {
    const graph = normalizeGraph(pipelineGraphForCourse(DEMO_COURSES[0].id));
    const tracks = weakAreaTracks(graph.nodes);
    expect(tracks.length).toBeGreaterThan(1);
    expect(tracks.some((track) => track.label === "Lagrangian mechanics" || track.label === "Oscillations")).toBe(true);
  });

  it("keeps only the top three weak tracks and a short local trace on each", () => {
    const graph = normalizeGraph(pipelineGraphForCourse(DEMO_COURSES[0].id));
    const model = buildGraphModel(graph, []);
    const tracks = weakAreaTracks(graph.nodes);
    expect(tracks).toHaveLength(3);
    const traces = weakGapTraces(tracks, model.links);
    expect(traces.length).toBeGreaterThan(0);
    expect(traces.length).toBeLessThanOrEqual(3);
    const memberSets = tracks.map((track) => new Set(track.conceptIds));
    for (const id of traces) {
      const link = model.links.find((item) => item.id === id);
      expect(link).toBeTruthy();
      expect(link?.kind).toBe("concept");
      expect(memberSets.some((members) => members.has(link!.source) && members.has(link!.target))).toBe(true);
    }
  });
});
