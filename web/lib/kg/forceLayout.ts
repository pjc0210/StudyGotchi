/**
 * Visualisation adapter: turns the application graph model into settled 2D
 * positions using a force simulation.
 *
 * The simulation is run to a fixed budget and then stopped. A graph that keeps
 * drifting is unusable for pointing at things, and re-running it on every
 * render would make the layout non-reproducible.
 */

import { Simulation, type SimLink, type SimNode } from './simulation'
import type { GraphModel, GraphModelNode } from './graphModel'

export interface PositionedNode extends SimNode {
  id: string
  node: GraphModelNode
}

export interface PositionedLink {
  id: string
  source: PositionedNode
  target: PositionedNode
}

export interface Layout {
  nodes: PositionedNode[]
  links: PositionedLink[]
  simulation: Simulation<PositionedNode>
}

/** Deterministic pseudo-random in [0,1) from a string, so layouts repeat. */
function seeded(id: string, salt: number): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}

export function createLayout(model: GraphModel): Layout {
  const nodes: PositionedNode[] = model.nodes.map((node) => {
    // Start on a deterministic ring; the simulation does the real work but a
    // stable seed keeps the settled result reproducible across reloads.
    const angle = seeded(node.id, 1) * Math.PI * 2
    const radius = 120 + seeded(node.id, 2) * 220
    return {
      id: node.id,
      node,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    }
  })

  const byId = new Map(nodes.map((n) => [n.id, n]))

  const links: PositionedLink[] = []
  const simLinks: SimLink<PositionedNode>[] = []
  for (const link of model.links) {
    const source = byId.get(link.source)
    const target = byId.get(link.target)
    if (!source || !target) continue
    links.push({ id: link.id, source, target })
    // Resource links sit a little longer so files ring their concepts
    // rather than crowding them.
    const isResource = link.id.startsWith('r:')
    simLinks.push({
      source,
      target,
      distance: isResource ? 112 : 156,
      strength: isResource ? 0.34 : 0.62,
    })
  }

  const simulation = new Simulation<PositionedNode>({
    nodes,
    links: simLinks,
    charge: -680,
    chargeDistanceMax: 880,
    // Reserve the actual blob plus enough room for its external label.
    collideRadius: (d) =>
      d.node.radius + 15 + Math.min(d.node.label.length, 26) * 1.75,
    collideStrength: 0.82,
    centerStrength: 0.05,
    // Asymmetric pull compresses the graph vertically so its aspect ratio
    // approaches a widescreen canvas, without shearing the clusters.
    xStrength: 0.008,
    yStrength: 0.055,
    alphaDecay: 0.036,
    velocityDecay: 0.5,
  })

  return { nodes, links, simulation }
}

/** Run the simulation to convergence synchronously, then stop it. */
export function settle(layout: Layout, ticks = 420): void {
  layout.simulation.stop()
  for (let i = 0; i < ticks; i++) layout.simulation.tick()
  layout.simulation.alpha(0)
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function boundsOf(nodes: PositionedNode[], pad = 40): Bounds | null {
  if (nodes.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    minX = Math.min(minX, n.x - n.node.radius)
    minY = Math.min(minY, n.y - n.node.radius)
    maxX = Math.max(maxX, n.x + n.node.radius)
    maxY = Math.max(maxY, n.y + n.node.radius)
  }
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad }
}
