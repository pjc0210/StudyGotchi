import { Component, Suspense, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import type { DecorItem } from '../lib/galaxy'
import { landmarkUrl, useAssets, useLandmarkManifest } from '../lib/assets'
import { DECOR_PROP_IDS, DecorLayer, bakeProp, type Placement, type PropLibrary } from './Decor'

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.warn('[GlbDecor] prop GLBs failed, using procedural decor', err)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function Loaded({ entries, items, place }: { entries: [string, string][]; items: DecorItem[]; place: (item: DecorItem) => Placement }) {
  const gltfs = useGLTF(entries.map(([, url]) => url))
  const library = useMemo<PropLibrary>(() => {
    const lib: PropLibrary = new Map()
    gltfs.forEach((g, i) => lib.set(entries[i][0], bakeProp(g.scene)))
    return lib
  }, [gltfs, entries])
  return <DecorLayer items={items} place={place} props={library} />
}

/**
 * DecorLayer that swaps in the Landmark Artisan's props (see `DECOR_PROPS`) once the landmark
 * manifest lists them. Procedural decor is drawn while loading, when the manifest is missing,
 * when the toggle is on "primitive", and if any prop fails to load.
 */
export function GlbDecorLayer({ items, place }: { items: DecorItem[]; place: (item: DecorItem) => Placement }) {
  const { landmarks } = useAssets()
  const manifest = useLandmarkManifest()
  const entries = useMemo(() => {
    if (landmarks !== 'glb' || manifest.status !== 'ready') return []
    return DECOR_PROP_IDS.map((id) => [id, landmarkUrl(manifest, id)] as const).filter((e): e is readonly [string, string] => !!e[1]).map((e) => [e[0], e[1]] as [string, string])
  }, [landmarks, manifest])
  const plain = <DecorLayer items={items} place={place} />
  if (!entries.length) return plain
  return (
    <Boundary fallback={plain}>
      <Suspense fallback={plain}>
        <Loaded entries={entries} items={items} place={place} />
      </Suspense>
    </Boundary>
  )
}
