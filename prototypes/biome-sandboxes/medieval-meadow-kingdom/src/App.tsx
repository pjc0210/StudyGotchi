import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { MEADOW_KINGDOM, buildLayoutExport, creatureViewportFraction, generateKingdom } from './layout/biome-layout'
import { STATIONS, clampDioramaYaw, defaultOverride, type StationId } from './camera/stations'
import { PIXEL_PROFILE } from './render/PixelComposer'
import { BiomeScene } from './scene/BiomeScene'
import { PHASE_SECONDS, type CatastrophePhase, type LabState } from './state'
import { Panel } from './ui/Panel'
import { ReferenceBoard } from './ui/ReferenceBoard'
import './app.css'

const BASE_INITIAL: LabState = {
  progress: { 'forest-hamlet': 0.75, 'river-village': 1, 'bridge-market': 0.5, 'farm-common': 0.75, 'castle-court': 1 },
  residents: 8,
  seed: 7,
  night: false,
  clouds: true,
  snowfall: false,
  whale: true,
  pixel: true,
  showReferences: false,
  station: 'overview',
  focusDistrict: null,
  camera: defaultOverride(STATIONS.overview),
  catastrophe: { districtId: null, phase: 'calm', startedAt: 0 },
  diving: false,
}

function initialState(): LabState {
  const query = new URLSearchParams(window.location.search)
  const progress = query.has('progress') ? Math.min(1, Math.max(0, Number(query.get('progress')))) : null
  const seed = query.has('seed') ? Math.min(99, Math.max(1, Number(query.get('seed')))) : BASE_INITIAL.seed
  const station = (query.get('station') as StationId | null) ?? BASE_INITIAL.station
  const stationDef = STATIONS[station] ?? STATIONS.overview
  const requestedDistrict = query.get('district')
  const focusDistrict = MEADOW_KINGDOM.districts.some((district) => district.id === requestedDistrict) ? requestedDistrict : null
  const camera = defaultOverride(stationDef)
  if (stationDef.id === 'district' && focusDistrict) {
    camera.azimuthDeg = clampDioramaYaw(MEADOW_KINGDOM.districts.find((district) => district.id === focusDistrict)?.stationAzimuth ?? 0)
  }
  if (query.has('yaw')) camera.azimuthDeg = clampDioramaYaw(Number(query.get('yaw')))
  if (query.has('dolly')) camera.dolly = Math.min(2.2, Math.max(0.5, Number(query.get('dolly'))))
  const requestedPhase = query.get('phase') as CatastrophePhase | null
  const catastrophePhase: CatastrophePhase = requestedPhase && ['calm', 'blizzard', 'bang', 'ruin', 'recovering'].includes(requestedPhase)
    ? requestedPhase
    : 'calm'
  return {
    ...BASE_INITIAL,
    seed,
    station: stationDef.id,
    night: query.get('night') === '1',
    showReferences: query.get('refs') === '1',
    focusDistrict,
    catastrophe: catastrophePhase === 'calm'
      ? BASE_INITIAL.catastrophe
      : { districtId: focusDistrict ?? MEADOW_KINGDOM.districts[0].id, phase: catastrophePhase, startedAt: performance.now() },
    progress: progress === null
      ? BASE_INITIAL.progress
      : Object.fromEntries(MEADOW_KINGDOM.districts.map((district) => [district.id, progress])),
    camera,
  }
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
  const [state, setState] = useState<LabState>(initialState)
  const [aspect, setAspect] = useState(16 / 9)
  const glRef = useRef<THREE.WebGLRenderer | null>(null)
  const layout = useMemo(() => generateKingdom(state.seed), [state.seed])

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
    return { ...defaultOverride(STATIONS.district), azimuthDeg: clampDioramaYaw(d?.stationAzimuth ?? STATIONS.district.azimuthDeg) }
  }

  const onStation = (id: StationId) =>
    setState((s) => {
      const focusDistrict = id === 'district' ? s.focusDistrict ?? layout.districts[3].id : s.focusDistrict
      return { ...s, station: id, camera: id === 'district' && focusDistrict ? districtCamera(focusDistrict) : defaultOverride(STATIONS[id]), focusDistrict }
    })

  const snapTo = (id: string) => setState((s) => ({ ...s, focusDistrict: id, station: 'district', camera: districtCamera(id) }))

  const onCamera = (next: Partial<LabState['camera']>) =>
    setState((current) => ({
      ...current,
      camera: {
        ...current.camera,
        ...next,
        azimuthDeg: clampDioramaYaw(next.azimuthDeg ?? current.camera.azimuthDeg),
        pitchDeg: Math.min(40, Math.max(34, next.pitchDeg ?? current.camera.pitchDeg)),
      },
    }))

  const onExport = () => {
    const data = buildLayoutExport(layout, state.progress, { station: state.station, focusDistrict: state.focusDistrict, ...state.camera })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    download('biome-layout.json', URL.createObjectURL(blob))
  }

  const onScreenshot = () => {
    const gl = glRef.current
    if (!gl) return
    download(`biome-lab-${state.station}-${Date.now()}.png`, gl.domElement.toDataURL('image/png'))
  }

  // Scale-rule readout for the district station: creature height as a fraction of the viewport.
  const focused = state.station === 'district' ? layout.districts.find((d) => d.id === state.focusDistrict) : undefined
  const creatureFraction = focused
    ? creatureViewportFraction(layout.creatureHeight * layout.creatureScale, focused.stationChord * state.camera.dolly, STATIONS.district.fitWidth ?? 0.7, aspect, state.camera.pitchDeg)
    : null

  return (
    <div className="lab" data-pixel={state.pixel}>
      <Panel
        layout={layout}
        state={state}
        onProgress={(id, value) => setState((s) => ({ ...s, progress: { ...s.progress, [id]: value } }))}
        onAllProgress={(value) => setState((s) => ({ ...s, progress: Object.fromEntries(layout.districts.map((c) => [c.id, value])) }))}
        onPatch={patch}
        onStation={onStation}
        onFocusDistrict={snapTo}
        onCamera={onCamera}
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
          <BiomeScene layout={layout} state={state} onDiveEnd={() => patch({ diving: false })} onPickDistrict={snapTo} />
        </Canvas>
        {state.showReferences && <ReferenceBoard onClose={() => patch({ showReferences: false })} />}
        <div className="lab-hud">
          <span>
            {state.pixel ? `${PIXEL_PROFILE.pixelSize} px pass · fixed at every station · procedural primitives` : 'Full resolution · toon ramp'}
            {creatureFraction !== null && ` · creature ${(creatureFraction * 100).toFixed(1)} % of viewport (rule ≥ 6 %)`}
          </span>
          <span>Drag to frame ±35° · wheel to dolly · click a district · seed {state.seed}</span>
        </div>
      </div>
    </div>
  )
}
