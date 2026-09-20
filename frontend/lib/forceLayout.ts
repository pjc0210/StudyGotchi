/**
 * Visualisation adapter: turns the application graph model into settled 2D
 * positions using a force simulation.
 *
 * The simulation is run to a fixed budget and then stopped. A graph that keeps
 * drifting is unusable for pointing at things, and re-running it on every
 * render would make the layout non-reproducible.
 */

import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type ForceLink,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type { GraphModel, GraphModelNode } from "./graphModel";

export interface PositionedNode extends SimulationNodeDatum {
  id: string;
  node: GraphModelNode;
  x: number;
  y: number;
  /** Set while the user drags, so the simulation respects the placement. */
  fx?: number | null;
  fy?: number | null;
}

export interface PositionedLink extends SimulationLinkDatum<PositionedNode> {
  id: string;
  source: PositionedNode | string;
  target: PositionedNode | string;
}

export interface Layout {
  nodes: PositionedNode[];
  links: PositionedLink[];
  simulation: Simulation<PositionedNode, PositionedLink>;
}

/** Deterministic pseudo-random in [0,1) from a string, so layouts repeat. */
function seeded(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function seedPosition(id: string): { x: number; y: number } {
  // Start on a deterministic ring; the simulation does the real work but a
  // stable seed keeps the settled result reproducible across reloads.
  const angle = seeded(id, 1) * Math.PI * 2;
  const radius = 120 + seeded(id, 2) * 220;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function bindForces(simulation: Simulation<PositionedNode, PositionedLink>, links: PositionedLink[]) {
  simulation
    .force(
      "link",
      forceLink<PositionedNode, PositionedLink>(links)
        .id((d) => d.id)
        // Resource links sit a little longer so files ring their concepts
        // rather than crowding them.
        .distance((l) => (String(l.id).startsWith("r:") ? 112 : 156))
        .strength((l) => (String(l.id).startsWith("r:") ? 0.34 : 0.62)),
    )
    .force("charge", forceManyBody<PositionedNode>().strength(-680).distanceMax(880))
    .force(
      "collide",
      // Reserve the actual blob plus enough room for its external label.
      forceCollide<PositionedNode>()
        .radius((d) => d.node.radius + 15 + Math.min(d.node.label.length, 26) * 1.75)
        .strength(0.82),
    )
    .force("center", forceCenter(0, 0).strength(0.05))
    // Asymmetric pull compresses the graph vertically so its aspect ratio
    // approaches a widescreen canvas, without shearing the clusters.
    .force("x", forceX(0).strength(0.008))
    .force("y", forceY(0).strength(0.055));
}

export function createLayout(model: GraphModel): Layout {
  const nodes: PositionedNode[] = model.nodes.map((node) => ({
    id: node.id,
    node,
    ...seedPosition(node.id),
  }));

  const links: PositionedLink[] = model.links.map((link) => ({
    id: link.id,
    source: link.source,
    target: link.target,
  }));

  const simulation = forceSimulation<PositionedNode, PositionedLink>(nodes)
    .alpha(1)
    .alphaDecay(0.036)
    .velocityDecay(0.5);
  bindForces(simulation, links);

  return { nodes, links, simulation };
}

/**
 * Keep settled positions and reheat so a new file can shift the structure
 * instead of reseeding the whole sky. New nodes spawn beside their neighbours.
 */
export function syncLayout(layout: Layout, model: GraphModel): Layout {
  const previous = new Map(layout.nodes.map((node) => [node.id, node]));
  const nodes: PositionedNode[] = model.nodes.map((node) => {
    const prior = previous.get(node.id);
    if (prior) {
      prior.node = node;
      return prior;
    }

    const neighbourIds = model.adjacency.get(node.id);
    let x = 0;
    let y = 0;
    let count = 0;
    if (neighbourIds) {
      for (const id of neighbourIds) {
        const neighbour = previous.get(id);
        if (!neighbour) continue;
        x += neighbour.x;
        y += neighbour.y;
        count += 1;
      }
    }
    if (count === 0) {
      return { id: node.id, node, ...seedPosition(node.id) };
    }
    const jitter = 18 + seeded(node.id, 3) * 22;
    const angle = seeded(node.id, 4) * Math.PI * 2;
    return {
      id: node.id,
      node,
      x: x / count + Math.cos(angle) * jitter,
      y: y / count + Math.sin(angle) * jitter,
    };
  });

  const links: PositionedLink[] = model.links.map((link) => ({
    id: link.id,
    source: link.source,
    target: link.target,
  }));

  layout.simulation.nodes(nodes);
  const linkForce = layout.simulation.force<ForceLink<PositionedNode, PositionedLink>>("link");
  if (linkForce) linkForce.links(links);
  else bindForces(layout.simulation, links);

  layout.simulation.alpha(0.48).alphaDecay(0.018).restart();
  return { nodes, links, simulation: layout.simulation };
}

/** Run the simulation to convergence synchronously, then stop it. */
export function settle(layout: Layout, ticks = 420): void {
  layout.simulation.stop();
  for (let i = 0; i < ticks; i++) layout.simulation.tick();
  layout.simulation.alpha(0);
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsOf(nodes: PositionedNode[], pad = 40): Bounds | null {
  if (nodes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x - n.node.radius);
    minY = Math.min(minY, n.y - n.node.radius);
    maxX = Math.max(maxX, n.x + n.node.radius);
    maxY = Math.max(maxY, n.y + n.node.radius);
  }
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}
