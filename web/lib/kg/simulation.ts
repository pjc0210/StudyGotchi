/**
 * Minimal force simulation, modelled on the subset of d3-force the graph
 * canvas uses (link, charge, collide, centering and axis pull). Vendored so
 * the web app keeps its zero-dependency install.
 *
 * Pair interactions are computed directly rather than through a quadtree:
 * a course graph is tens of nodes, so the quadtree's bookkeeping costs more
 * than the comparisons it saves.
 */

export interface SimNode {
  x: number
  y: number
  vx: number
  vy: number
  /** Set while the user drags, so the simulation respects the placement. */
  fx?: number | null
  fy?: number | null
}

export interface SimLink<N extends SimNode> {
  source: N
  target: N
  distance: number
  strength: number
}

export interface SimulationOptions<N extends SimNode> {
  nodes: N[]
  links: SimLink<N>[]
  /** Repulsion between every pair. Negative pushes apart. */
  charge: number
  chargeDistanceMax: number
  collideRadius: (node: N) => number
  collideStrength: number
  centerStrength: number
  xStrength: number
  yStrength: number
  alphaDecay: number
  velocityDecay: number
}

const ALPHA_MIN = 0.001
const JIGGLE = () => (Math.random() - 0.5) * 1e-6

export class Simulation<N extends SimNode> {
  private readonly opts: SimulationOptions<N>
  private readonly bias: number[]
  private listeners = new Map<string, (() => void) | null>()
  private alphaValue = 1
  private alphaTargetValue = 0
  private raf: number | null = null

  constructor(opts: SimulationOptions<N>) {
    this.opts = opts

    const degree = new Map<N, number>()
    for (const link of opts.links) {
      degree.set(link.source, (degree.get(link.source) ?? 0) + 1)
      degree.set(link.target, (degree.get(link.target) ?? 0) + 1)
    }
    this.bias = opts.links.map((link) => {
      const s = degree.get(link.source) ?? 1
      const t = degree.get(link.target) ?? 1
      return s / (s + t)
    })
  }

  on(name: string, fn: (() => void) | null) {
    this.listeners.set(name, fn)
    return this
  }

  alpha(value: number) {
    this.alphaValue = value
    return this
  }

  alphaTarget(value: number) {
    this.alphaTargetValue = value
    return this
  }

  restart() {
    if (this.raf === null) this.raf = requestAnimationFrame(this.step)
    return this
  }

  stop() {
    if (this.raf !== null) {
      cancelAnimationFrame(this.raf)
      this.raf = null
    }
    return this
  }

  private step = () => {
    this.tick()
    if (this.alphaValue < ALPHA_MIN && this.alphaTargetValue === 0) {
      this.raf = null
      return
    }
    this.raf = requestAnimationFrame(this.step)
  }

  tick() {
    const o = this.opts
    this.alphaValue +=
      (this.alphaTargetValue - this.alphaValue) * o.alphaDecay
    const alpha = this.alphaValue

    this.applyLinks(alpha)
    this.applyCharge(alpha)
    this.applyAxes(alpha)
    this.applyCollide()

    for (const node of o.nodes) {
      if (node.fx === null || node.fx === undefined) {
        node.vx *= o.velocityDecay
        node.x += node.vx
      } else {
        node.x = node.fx
        node.vx = 0
      }
      if (node.fy === null || node.fy === undefined) {
        node.vy *= o.velocityDecay
        node.y += node.vy
      } else {
        node.y = node.fy
        node.vy = 0
      }
    }

    this.applyCenter()

    for (const fn of this.listeners.values()) fn?.()
    return this
  }

  private applyLinks(alpha: number) {
    const { links } = this.opts
    for (let i = 0; i < links.length; i += 1) {
      const link = links[i]
      const source = link.source
      const target = link.target
      let x = target.x + target.vx - source.x - source.vx || JIGGLE()
      let y = target.y + target.vy - source.y - source.vy || JIGGLE()
      const length = Math.sqrt(x * x + y * y)
      const push = ((length - link.distance) / length) * alpha * link.strength
      x *= push
      y *= push
      const b = this.bias[i]
      target.vx -= x * b
      target.vy -= y * b
      source.vx += x * (1 - b)
      source.vy += y * (1 - b)
    }
  }

  private applyCharge(alpha: number) {
    const { nodes, charge, chargeDistanceMax } = this.opts
    const maxSq = chargeDistanceMax * chargeDistanceMax
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i]
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j]
        const dx = b.x - a.x || JIGGLE()
        const dy = b.y - a.y || JIGGLE()
        const lengthSq = dx * dx + dy * dy
        if (lengthSq > maxSq) continue
        const w = (charge * alpha) / lengthSq
        a.vx += dx * w
        a.vy += dy * w
        b.vx -= dx * w
        b.vy -= dy * w
      }
    }
  }

  private applyAxes(alpha: number) {
    const { nodes, xStrength, yStrength } = this.opts
    for (const node of nodes) {
      node.vx -= node.x * xStrength * alpha
      node.vy -= node.y * yStrength * alpha
    }
  }

  private applyCollide() {
    const { nodes, collideRadius, collideStrength } = this.opts
    const radii = nodes.map(collideRadius)
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i]
      const ra = radii[i]
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j]
        const rb = radii[j]
        const r = ra + rb
        let dx = a.x + a.vx - b.x - b.vx || JIGGLE()
        let dy = a.y + a.vy - b.y - b.vy || JIGGLE()
        const lengthSq = dx * dx + dy * dy
        if (lengthSq >= r * r) continue
        const length = Math.sqrt(lengthSq)
        const push = ((r - length) / length) * collideStrength
        dx *= push
        dy *= push
        // Heavier (larger) nodes yield less, as in d3's collide force.
        const share = (rb * rb) / (ra * ra + rb * rb)
        a.vx += dx * share
        a.vy += dy * share
        b.vx -= dx * (1 - share)
        b.vy -= dy * (1 - share)
      }
    }
  }

  private applyCenter() {
    const { nodes, centerStrength } = this.opts
    if (nodes.length === 0) return
    let sx = 0
    let sy = 0
    for (const node of nodes) {
      sx += node.x
      sy += node.y
    }
    sx = (sx / nodes.length) * centerStrength
    sy = (sy / nodes.length) * centerStrength
    for (const node of nodes) {
      node.x -= sx
      node.y -= sy
    }
  }
}
