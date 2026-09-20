import { createContext, useContext, useEffect, useState } from 'react'

export type AssetMode = 'glb' | 'primitive'

export interface AssetSettings {
  creatures: AssetMode
  landmarks: AssetMode
  /** world seed, so creature ids are deterministic per world */
  seed: string
  /** current progress, so a landmark can grow from stage 2 to stage 3 */
  progress: number
  /** debug multiplier on the Planet 2-zoom creature count (`?crowd=3`), for fps measurements */
  crowd: number
  /** topics currently in a catastrophe ruin state: their creatures play `sad` */
  sadTopics?: ReadonlySet<number>
  /** night mode (prefers-color-scheme or the manual toggle) */
  night?: boolean
}

export const AssetsContext = createContext<AssetSettings>({ creatures: 'primitive', landmarks: 'primitive', seed: '', progress: 0, crowd: 1 })

export function useAssets() {
  return useContext(AssetsContext)
}

// ---------------------------------------------------------------------------
// landmark manifest: which files the Landmark Artisan has finished

export const LANDMARK_MANIFEST_URL = '/assets/landmarks/manifest.json'

type ManifestState = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; ids: Set<string>; files: Map<string, string> }

let manifest: ManifestState = { status: 'loading' }
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

let started = false
function start() {
  if (started) return
  started = true
  fetch(LANDMARK_MANIFEST_URL)
    .then(async (r) => {
      // Vite answers unknown paths with index.html (200), so check the content type as well
      if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) throw new Error('no manifest')
      const json = (await r.json()) as { assets?: { id: string; file: string; validation?: string }[] }
      const ids = new Set<string>()
      const files = new Map<string, string>()
      for (const a of json.assets ?? []) {
        ids.add(a.id)
        // manifest paths are repo-relative ("assets/landmarks/..."); the symlink serves them at /assets
        files.set(a.id, '/' + a.file.replace(/^\/+/, ''))
      }
      manifest = { status: 'ready', ids, files }
    })
    .catch(() => {
      manifest = { status: 'missing' }
    })
    .finally(notify)
}

/** Re-renders when the manifest arrives. */
export function useLandmarkManifest(): ManifestState {
  const [, bump] = useState(0)
  useEffect(() => {
    start()
    const l = () => bump((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return manifest
}

/** URL for a manifest id, or null when the manifest is missing / does not list it. */
export function landmarkUrl(state: ManifestState, id: string): string | null {
  if (state.status !== 'ready') return null
  return state.files.get(id) ?? null
}
