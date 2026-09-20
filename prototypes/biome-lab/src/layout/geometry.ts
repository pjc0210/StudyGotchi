/** Pure 2-D helpers shared by the Ice terrain and the generic world terrain. No three.js. */

export type Pt = [number, number]

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

export function fbm(x: number, y: number, octaves = 3): number {
  let sum = 0
  let amp = 0.5
  let freq = 1
  for (let i = 0; i < octaves; i++) {
    sum += (valueNoise(x * freq, y * freq) - 0.5) * amp
    amp *= 0.5
    freq *= 2
  }
  return sum
}

export { hash2 }

export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function distToPolyline(points: Pt[], x: number, z: number): { dist: number; t: number } {
  let best = Number.POSITIVE_INFINITY
  let bestT = 0
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1]
    const [bx, bz] = points[i]
    const dx = bx - ax
    const dz = bz - az
    const len2 = dx * dx + dz * dz || 1
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / len2))
    const d = Math.hypot(ax + dx * t - x, az + dz * t - z)
    if (d < best) {
      best = d
      bestT = (i - 1 + t) / (points.length - 1)
    }
  }
  return { dist: best, t: bestT }
}

export function polylineLength(points: Pt[]): number {
  let len = 0
  for (let i = 1; i < points.length; i++) len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  return len
}

/** Point and unit tangent at arc-length `s` along a polyline (clamped). */
export function pointAlong(points: Pt[], s: number): { x: number; z: number; dx: number; dz: number } {
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1]
    const [bx, bz] = points[i]
    const len = Math.hypot(bx - ax, bz - az)
    if (s <= acc + len || i === points.length - 1) {
      const t = len > 0 ? Math.min(1, Math.max(0, (s - acc) / len)) : 0
      return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, dx: (bx - ax) / (len || 1), dz: (bz - az) / (len || 1) }
    }
    acc += len
  }
  const [x, z] = points[0]
  return { x, z, dx: 1, dz: 0 }
}

export function segmentIntersection(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const r = [b[0] - a[0], b[1] - a[1]]
  const s = [d[0] - c[0], d[1] - c[1]]
  const denom = r[0] * s[1] - r[1] * s[0]
  if (Math.abs(denom) < 1e-9) return null
  const qp = [c[0] - a[0], c[1] - a[1]]
  const t = (qp[0] * s[1] - qp[1] * s[0]) / denom
  const u = (qp[0] * r[1] - qp[1] * r[0]) / denom
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return [a[0] + r[0] * t, a[1] + r[1] * t]
}

/** All crossings of two polylines. */
export function polylineCrossings(a: Pt[], b: Pt[]): Array<{ point: Pt; aDir: Pt }> {
  const out: Array<{ point: Pt; aDir: Pt }> = []
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      const p = segmentIntersection(a[i - 1], a[i], b[j - 1], b[j])
      if (p) {
        const len = Math.hypot(a[i][0] - a[i - 1][0], a[i][1] - a[i - 1][1]) || 1
        out.push({ point: p, aDir: [(a[i][0] - a[i - 1][0]) / len, (a[i][1] - a[i - 1][1]) / len] })
      }
    }
  }
  return out
}

/** Closed polyline (last point joins the first). */
export function closeLoop(points: Pt[]): Pt[] {
  if (points.length === 0) return points
  const [fx, fz] = points[0]
  const [lx, lz] = points[points.length - 1]
  return fx === lx && fz === lz ? points : [...points, points[0]]
}

/** Resample a polyline every `step` metres (the last point is always kept). */
export function resample(points: Pt[], step: number): Pt[] {
  const total = polylineLength(points)
  const out: Pt[] = []
  for (let s = 0; s < total; s += step) {
    const p = pointAlong(points, s)
    out.push([p.x, p.z])
  }
  out.push(points[points.length - 1])
  return out
}

/** Catmull-Rom smoothing of a polyline into `per` points per segment (ends clamped). */
export function smoothPolyline(points: Pt[], per = 6, closed = false): Pt[] {
  if (points.length < 3) return points
  const n = points.length
  const at = (i: number): Pt => (closed ? points[((i % n) + n) % n] : points[Math.min(n - 1, Math.max(0, i))])
  const out: Pt[] = []
  const segs = closed ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    for (let k = 0; k < per; k++) {
      const t = k / per
      const t2 = t * t
      const t3 = t2 * t
      const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
      const z = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
      out.push([x, z])
    }
  }
  if (!closed) out.push(points[n - 1])
  else out.push(out[0])
  return out
}
