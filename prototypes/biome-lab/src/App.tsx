import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { type BiomeLayout, buildLayoutExport, creatureViewportFraction, districtChord } from './layout/biome-layout'
import { toLayoutJson } from './layout/from-layout-json'
import { type LoadedLayout, iceEntry, loadLayouts } from './layout/load-layouts'
import { STATIONS, defaultOverride, type StationId } from './camera/stations'
import { PIXEL_PROFILE } from './render/PixelComposer'
import { BiomeScene } from './scene/BiomeScene'
import { PHASE_SECONDS, type CatastrophePhase, type LabState } from './state'
import { Panel } from './ui/Panel'
import './app.css'

/** Default progress for a freshly picked biome: a spread of bands so growth is visible at once. */
function spreadProgress(layout: BiomeLayout) {
  const steps = [1, 0.75, 0.5, 1, 0.25, 0]
  return Object.fromEntries(layout.districts.map((c, i) => [c.id, steps[i % steps.length]]))
}

const INITIAL: LabState = {
  progress: { harbour: 1, town: 0.75, lake: 0.5, forest: 1, glacier: 0.25, station: 0 },
  residents: 6,
  seed: 7,
  night: false,
  clouds: true,
  snowfall: false,
  whale: true,
  pixel: true,
  station: 'overview',
  focusDistrict: null,
  camera: defaultOverride(STATIONS.overview),
  catastrophe: { districtId: null, phase: 'calm', startedAt: 0 },
  diving: false,
}

const NEXT_PHASE: Partial<Record<CatastrophePhase, CatastrophePhase>> = {
  blizzard: 'bang',
  bang: 'ruin',
  recovering: 'calm',
}

function download(name: string, href: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = name
  a.click()
}

export default function App() {
  const [state, setState] = useState<LabState>(INITIAL)
  const [aspect, setAspect] = useState(16 / 9)
  const glRef = useRef<THREE.WebGLRenderer | null>(null)
  // Biome catalogue: Ice built in, every layout JSON found under /layouts, lab drafts.
  const [entries, setEntries] = useState<LoadedLayout[]>([iceEntry()])
  const [biomeId, setBiomeId] = useState(() => new URLSearchParams(window.location.search).get('biome') ?? 'ice-town')
  const layout = (entries.find((e) => e.layout.id === biomeId) ?? entries[0]).layout

  useEffect(() => {
    const extra = (new URLSearchParams(window.location.search).get('layouts') ?? '').split(',').filter(Boolean)
    void loadLayouts(extra).then((loaded) => {
      setEntries(loaded)
      const picked = loaded.find((e) => e.layout.id === biomeId)
      if (picked && biomeId !== 'ice-town') setState((s) => ({ ...s, progress: spreadProgress(picked.layout), focusDistrict: null, station: 'overview', camera: defaultOverride(STATIONS.overview) }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPickBiome = (id: string) => {
    const entry = entries.find((e) => e.layout.id === id)
    if (!entry) return
    setBiomeId(id)
    const url = new URL(window.location.href)
    if (id === 'ice-town') url.searchParams.delete('biome')
    else url.searchParams.set('biome', id)
    window.history.replaceState(null, '', url)
    setState((s) => ({
      ...s,
      progress: id === 'ice-town' ? INITIAL.progress : spreadProgress(entry.layout),
      focusDistrict: null,
      station: 'overview',
      camera: defaultOverride(STATIONS.overview),
      catastrophe: { districtId: null, phase: 'calm', startedAt: 0 },
      diving: false,
    }))
  }

  const patch = useCallback((p: Partial<LabState>) => setState((s) => ({ ...s, ...p })), [])

  // Catastrophe phases advance on a timer; ruin waits for "recover".
  useEffect(() => {
    const next = NEXT_PHASE[state.catastrophe.phase]
    if (!next) return
    const ms = PHASE_SECONDS[state.catastrophe.phase] * 1000
    const id = window.setTimeout(() => {
      setState((s) => ({
        ...s,
        catastrophe: next === 'calm' ? { districtId: null, phase: 'calm', startedAt: 0 } : { ...s.catastrophe, phase: next, startedAt: performance.now() },
      }))
    }, ms)
    return () => window.clearTimeout(id)
  }, [state.catastrophe.phase, state.catastrophe.startedAt])

  // The district station's azimuth is per district (long districts are framed along their length).
  const districtCamera = (id: string) => {
    const d = layout.districts.find((k) => k.id === id)
    return { ...defaultOverride(STATIONS.district), azimuthDeg: d?.stationAzimuth ?? STATIONS.district.azimuthDeg, pitchDeg: d?.stationPitch ?? STATIONS.district.pitchDeg }
  }

  const onStation = (id: StationId) =>
    setState((s) => {
      const focusDistrict = id === 'district' ? s.focusDistrict ?? layout.districts[3].id : s.focusDistrict
      return { ...s, station: id, camera: id === 'district' && focusDistrict ? districtCamera(focusDistrict) : defaultOverride(STATIONS[id]), focusDistrict }
    })

  const snapTo = (id: string) => setState((s) => ({ ...s, focusDistrict: id, station: 'district', camera: districtCamera(id) }))

  const onExport = () => {
    const data = buildLayoutExport(layout, state.progress, { station: state.station, focusDistrict: state.focusDistrict, ...state.camera })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    download(`${layout.id}-state.json`, URL.createObjectURL(blob))
  }

  /** The layout in the shared `*.layout.json` shape (Ice round-trips through the adapter). */
  const onExportLayout = () => {
    const blob = new Blob([JSON.stringify(toLayoutJson(layout), null, 2)], { type: 'application/json' })
    download(`${layout.id}.layout.json`, URL.createObjectURL(blob))
  }

  const onScreenshot = () => {
    const gl = glRef.current
    if (!gl) return
    download(`biome-lab-${state.station}-${Date.now()}.png`, gl.domElement.toDataURL('image/png'))
  }

  // Scale-rule readout for the district station: creature height as a fraction of the viewport.
  const focused = state.station === 'district' ? layout.districts.find((d) => d.id === state.focusDistrict) : undefined
  const creatureFraction = focused
    ? creatureViewportFraction(layout.creatureHeight * layout.creatureScale, districtChord(focused, state.camera.azimuthDeg) * state.camera.dolly, STATIONS.district.fitWidth ?? 0.7, aspect, state.camera.pitchDeg)
    : null

  return (
    <div className="lab" data-pixel={state.pixel}>
      <Panel
        layout={layout}
        biomes={entries.map((e) => ({ id: e.layout.id, name: e.layout.name, source: e.source }))}
        onPickBiome={onPickBiome}
        onExportLayout={onExportLayout}
        state={state}
        onProgress={(id, value) => setState((s) => ({ ...s, progress: { ...s.progress, [id]: value } }))}
        onAllProgress={(value) => setState((s) => ({ ...s, progress: Object.fromEntries(layout.districts.map((c) => [c.id, value])) }))}
        onPatch={patch}
        onStation={onStation}
        onFocusDistrict={snapTo}
        onCamera={(c) => setState((s) => ({ ...s, camera: { ...s.camera, ...c } }))}
        onDive={() => setState((s) => ({ ...s, diving: true, station: 'arrival', camera: defaultOverride(STATIONS.arrival), focusDistrict: null }))}
        onCatastrophe={(districtId) => setState((s) => ({ ...s, catastrophe: { districtId, phase: 'blizzard', startedAt: performance.now() } }))}
        onRecover={() => setState((s) => ({ ...s, catastrophe: { ...s.catastrophe, phase: 'recovering', startedAt: performance.now() } }))}
        onExport={onExport}
        onScreenshot={onScreenshot}
      />
      <div className="lab-canvas">
        <Canvas
          shadows
          dpr={state.pixel ? 1 : [1, 2]}
          gl={{ antialias: !state.pixel, preserveDrawingBuffer: true }}
          onCreated={({ gl, size }) => {
            glRef.current = gl
            setAspect(size.width / size.height)
          }}
        >
          <BiomeScene key={layout.id} layout={layout} state={state} onDiveEnd={() => patch({ diving: false })} onPickDistrict={snapTo} />
        </Canvas>
        <div className="lab-hud">
          <span>
            {state.pixel ? `${PIXEL_PROFILE.pixelSize} px DS pass · fixed at every station · toon ramp · native UI` : 'Full resolution · toon ramp'}
            {creatureFraction !== null && ` · creature ${(creatureFraction * 100).toFixed(1)} % of viewport (rule ≥ 6 %)`}
          </span>
          <span>Drag to orbit · wheel to dolly · click a district</span>
        </div>
      </div>
    </div>
  )
}
