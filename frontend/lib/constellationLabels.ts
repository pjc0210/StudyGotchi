/**
 * Space label level-of-detail. Zoomed out the sky shows constellation names;
 * zoomed in it shows short node names. Full filenames never make it onto the
 * canvas - the inspector and tooltip keep the complete title.
 */

export type SpaceLabelLayer = "clusters" | "nodes";

export const CLUSTER_ZOOM = 0.85;
/** Default fit stays in the cluster layer so arrival is constellations, not files. */
export const FIT_CLUSTER_ZOOM = CLUSTER_ZOOM - 0.04;

export function spaceLabelLayer(zoom: number): SpaceLabelLayer {
  return zoom < CLUSTER_ZOOM ? "clusters" : "nodes";
}

export function tidySpaceLabel(text: string): string {
  const leaf = text.split(/[/\\]/).pop() ?? text;
  return leaf
    .replace(/\.(pdf|pptx?|docx?|txt|md|csv|png|jpe?g|webp)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function clipSpaceLabel(text: string, maxChars: number): string {
  const cleaned = tidySpaceLabel(text);
  const limit = Math.max(1, maxChars);
  if (cleaned.length <= limit) return cleaned;
  return `${cleaned.slice(0, Math.max(1, limit - 1))}\u2026`;
}

/** How many characters a node name may use. Forced = hover or selection. */
export function nodeLabelBudget(zoom: number, forced: boolean): number {
  if (forced) return 24;
  if (zoom >= 1.8) return 22;
  if (zoom >= 1.25) return 18;
  return 14;
}

export function clusterLabelBudget(zoom: number): number {
  return zoom >= 0.55 ? 18 : 14;
}

export function hexRgb(hex: string): { r: number; g: number; b: number } {
  const n = hex.replace("#", "");
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

export interface SpaceLabelNode {
  id: string;
  x: number;
  y: number;
  kind: "concept" | "resource";
  label: string;
  weight: number;
  cluster?: string;
  clusterId?: string;
}

export interface SpaceCluster {
  id: string;
  label: string;
  x: number;
  y: number;
  weight: number;
  count: number;
  memberIds: string[];
  tintIndex: number;
}

export function buildSpaceClusters(
  nodes: SpaceLabelNode[],
  adjacency: Map<string, Set<string>> = new Map(),
): SpaceCluster[] {
  const concepts = nodes.filter((n) => n.kind === "concept");
  const groups = new Map<string, { label: string; members: SpaceLabelNode[] }>();

  const named: SpaceLabelNode[] = [];
  const leftover: SpaceLabelNode[] = [];

  for (const node of concepts) {
    if (node.cluster || node.clusterId) named.push(node);
    else leftover.push(node);
  }

  for (const node of named) {
    const id = node.clusterId ?? slug(node.cluster ?? node.id);
    const label = node.cluster ?? titleFromNode(node);
    const group = groups.get(id) ?? { label, members: [] };
    group.members.push(node);
    groups.set(id, group);
  }

  for (const component of connectedComponents(leftover, adjacency)) {
    if (component.length < 2) continue;
    const top = [...component].sort((a, b) => b.weight - a.weight)[0];
    const id = `gen:${top.id}`;
    groups.set(id, { label: titleFromNode(top), members: component });
  }

  const clusters: SpaceCluster[] = [];
  let tint = 0;
  for (const [id, group] of groups) {
    let sx = 0;
    let sy = 0;
    let weight = 0;
    for (const member of group.members) {
      sx += member.x;
      sy += member.y;
      weight += member.weight;
    }
    const count = group.members.length;
    clusters.push({
      id,
      label: clipSpaceLabel(group.label, 22),
      x: sx / count,
      y: sy / count,
      weight,
      count,
      memberIds: group.members.map((m) => m.id),
      tintIndex: tint % 6,
    });
    tint += 1;
  }

  return clusters.sort((a, b) => b.weight - a.weight);
}

function titleFromNode(node: SpaceLabelNode): string {
  return tidySpaceLabel(node.label).split(" ").slice(0, 2).join(" ");
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cluster";
}

function connectedComponents(
  nodes: SpaceLabelNode[],
  adjacency: Map<string, Set<string>>,
): SpaceLabelNode[][] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const components: SpaceLabelNode[][] = [];

  for (const node of nodes) {
    if (seen.has(node.id)) continue;
    const queue = [node];
    const component: SpaceLabelNode[] = [];
    seen.add(node.id);
    while (queue.length > 0) {
      const current = queue.pop()!;
      component.push(current);
      for (const nextId of adjacency.get(current.id) ?? []) {
        if (seen.has(nextId)) continue;
        const next = byId.get(nextId);
        if (!next) continue;
        seen.add(nextId);
        queue.push(next);
      }
    }
    components.push(component);
  }

  return components;
}
