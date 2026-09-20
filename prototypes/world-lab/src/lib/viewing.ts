import { useEffect, useState } from 'react'

/**
 * Viewing settings for the site page: where the planet sits in the viewport and how it is framed.
 * Defaults from docs/design/world/00-world-bible.md §3.1 (anchor 0.72 / 0.5, FOV 22, 6.4 R). The
 * store is a plain module object read by the scene every frame; the React hook mirrors it for the
 * panel and writes every change to the URL query so the values can be copied.
 */
export interface Viewing {
  /** planet centre as a fraction of the canvas width / height */
  ax: number
  ay: number
  /** camera distance in planet radii */
  dist: number
  /** vertical fov, degrees */
  fov: number
  /** facing pose: how far above a marker the camera sits, degrees (negative looks up from below) */
  pitch: number
  /** multiplier on the marker size */
  marker: number
  /** canvas width share of the viewport, percent */
  share: number
}

export const VIEWING_DEFAULTS: Viewing = { ax: 0.72, ay: 0.5, dist: 6.4, fov: 22, pitch: 26, marker: 1, share: 55 }

export const VIEWING_RANGES: Record<keyof Viewing, [number, number, number]> = {
  ax: [0.45, 0.85, 0.01],
  ay: [0.3, 0.7, 0.01],
  dist: [4, 9, 0.1],
  fov: [18, 36, 1],
  pitch: [-10, 25, 1],
  marker: [0.6, 1.6, 0.05],
  share: [40, 70, 1],
}

const KEYS = Object.keys(VIEWING_DEFAULTS) as (keyof Viewing)[]

function fromUrl(): Viewing {
  const p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
  const out = { ...VIEWING_DEFAULTS }
  for (const k of KEYS) {
    const v = parseFloat(p.get(k) ?? '')
    if (Number.isFinite(v)) out[k] = v
  }
  return out
}

/**
 * live values the scene reads; `active` is true only on the site page. `paneAx` / `paneAy` are the
 * anchors converted from viewport fractions to fractions of the canvas pane (the site page sets them).
 */
export const viewing: Viewing & { active: boolean; paneAx?: number; paneAy?: number } = { ...fromUrl(), active: false }

const listeners = new Set<() => void>()

export function setViewing(patch: Partial<Viewing>) {
  Object.assign(viewing, patch)
  const url = new URL(window.location.href)
  for (const k of KEYS) {
    if (Math.abs(viewing[k] - VIEWING_DEFAULTS[k]) < 1e-9) url.searchParams.delete(k)
    else url.searchParams.set(k, String(Math.round(viewing[k] * 1000) / 1000))
  }
  window.history.replaceState(null, '', url)
  listeners.forEach((l) => l())
}

/** the settings as a query string, for "copy settings" */
export function viewingQuery(): string {
  const p = new URLSearchParams({ mode: 'site' })
  for (const k of KEYS) p.set(k, String(Math.round(viewing[k] * 1000) / 1000))
  return '?' + p.toString()
}

export function useViewing(): Viewing {
  const [, bump] = useState(0)
  useEffect(() => {
    const l = () => bump((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return viewing
}
