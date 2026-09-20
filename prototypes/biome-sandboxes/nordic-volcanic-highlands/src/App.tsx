import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import type * as THREE from 'three'
import { NORDIC_LAYOUT, buildLayoutExport, creatureViewportFraction, districtChord, progressFromQuery } from './layout/biome-layout'
import { STATIONS, clampCameraOverride, defaultOverride, type StationId } from './camera/stations'
import { PIXEL_PROFILE } from './render/PixelComposer'
import { BiomeScene } from './scene/BiomeScene'
import { PHASE_SECONDS, type CatastrophePhase, type LabState } from './state'
import { Panel } from './ui/Panel'
import './app.css'

const layout = NORDIC_LAYOUT

function initialState(): LabState {
  const query = new URLSearchParams(window.location.search)
  const seed = Math.min(99, Math.max(1, Number(query.get('seed')) || 7))
  const requestedStation = (query.get('station') ?? 'overview') as StationId
  const station: StationId = STATIONS[requestedStation] ? requestedStation : 'overview'
  const focusDistrict = query.get('district')
  const camera = defaultOverride(STATIONS[station])
  if (station === 'district' && focusDistrict) {
    camera.azimuthDeg = layout.districts.find((district) => district.id === focusDistrict)?.stationAzimuth ?? camera.azimuthDeg
  }
  const numberFromQuery = (key: string, fallback: number) => {
    const parsed = Number(query.get(key) ?? fallback)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  const requestedCamera = clampCameraOverride({
    ...camera,
    azimuthDeg: numberFromQuery('azimuth', camera.azimuthDeg),
    dolly: numberFromQuery('dolly', camera.dolly),
    pitchDeg: numberFromQuery('pitch', camera.pitchDeg),
  })
  const all = progressFromQuery(query.get('progress'))
  return {
    progress: Object.fromEntries(layout.districts.map((district) => [district.id, all])),
    residents: 10,
    seed,
    night: query.get('night') === '1',
    aurora: query.get('aurora') !== '0',
    mist: true,
    ambient: true,
    pixel: true,
    station,
    focusDistrict,
    camera: requestedCamera,
    catastrophe: {
      districtId: query.get('catastrophe'),
      phase: query.get('catastrophe') ? 'ruin' : 'calm',
      startedAt: 0,
    },
    diving: false,
  }
}

const NEXT_PHASE: Partial<Record<CatastrophePhase, CatastrophePhase>> = {
  ashfall: 'quake',
  quake: 'ruin',
  recovering: 'calm',
}

function download(name: string, href: string) {
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = name
  anchor.click()
}

export default function App() {
  const [state, setState] = useState<LabState>(initialState)
  const [aspect, setAspect] = useState(16 / 9)
  const renderer = useRef<THREE.WebGLRenderer | null>(null)
  const patch = useCallback((next: Partial<LabState>) => setState((current) => ({ ...current, ...next })), [])

  useEffect(() => {
    const next = NEXT_PHASE[state.catastrophe.phase]
    if (!next) return
    const timer = window.setTimeout(() => {
      setState((current) => ({
        ...current,
        catastrophe: next === 'calm'
          ? { districtId: null, phase: 'calm', startedAt: 0 }
          : { ...current.catastrophe, phase: next, startedAt: performance.now() },
      }))
    }, PHASE_SECONDS[state.catastrophe.phase] * 1000)
    return () => window.clearTimeout(timer)
  }, [state.catastrophe.phase, state.catastrophe.startedAt])

  const districtCamera = (id: string) => {
    const district = layout.districts.find((candidate) => candidate.id === id)
    return { ...defaultOverride(STATIONS.district), azimuthDeg: district?.stationAzimuth ?? STATIONS.district.azimuthDeg }
  }

  const onStation = (id: StationId) => setState((current) => {
    const focusDistrict = id === 'district' ? current.focusDistrict ?? layout.districts[0].id : current.focusDistrict
    const camera = id === 'district' && focusDistrict ? districtCamera(focusDistrict) : defaultOverride(STATIONS[id])
    return { ...current, station: id, focusDistrict, camera }
  })

  const snapTo = (id: string) => setState((current) => ({ ...current, focusDistrict: id, station: 'district', camera: districtCamera(id) }))

  const onExport = () => {
    const data = buildLayoutExport(layout, state.progress, state.seed, { station: state.station, focusDistrict: state.focusDistrict, ...state.camera })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    download(`nordic-volcanic-highlands-seed-${state.seed}.json`, URL.createObjectURL(blob))
  }

  const onScreenshot = () => {
    if (!renderer.current) return
    download(`nordic-volcanic-highlands-${state.station}-${state.seed}-${Date.now()}.png`, renderer.current.domElement.toDataURL('image/png'))
  }

  const focused = state.station === 'district' ? layout.districts.find((district) => district.id === state.focusDistrict) : undefined
  const creatureFraction = focused
    ? creatureViewportFraction(layout.creatureHeight * layout.creatureScale, districtChord(focused), STATIONS.district.fitWidth ?? 0.75, aspect, state.camera.pitchDeg)
    : null

  return (
    <div className="lab" data-pixel={state.pixel} data-night={state.night}>
      <Panel
        layout={layout}
        state={state}
        onProgress={(id, value) => setState((current) => ({ ...current, progress: { ...current.progress, [id]: value } }))}
        onAllProgress={(value) => setState((current) => ({ ...current, progress: Object.fromEntries(layout.districts.map((district) => [district.id, value])) }))}
        onPatch={patch}
        onStation={onStation}
        onFocusDistrict={snapTo}
        onCamera={(camera) => setState((current) => ({
          ...current,
          camera: clampCameraOverride({
            ...current.camera,
            ...camera,
          }),
        }))}
        onDive={() => setState((current) => ({ ...current, diving: true, station: 'arrival', camera: defaultOverride(STATIONS.arrival), focusDistrict: null }))}
        onCatastrophe={(districtId) => setState((current) => ({ ...current, catastrophe: { districtId, phase: 'ashfall', startedAt: performance.now() } }))}
        onRecover={() => setState((current) => ({ ...current, catastrophe: { ...current.catastrophe, phase: 'recovering', startedAt: performance.now() } }))}
        onExport={onExport}
        onScreenshot={onScreenshot}
      />
      <div className="lab-canvas">
        <Canvas
          shadows
          dpr={state.pixel ? 1 : [1, 2]}
          gl={{ antialias: !state.pixel, preserveDrawingBuffer: true }}
          onCreated={({ gl, size }) => {
            renderer.current = gl
            setAspect(size.width / size.height)
          }}
        >
          <BiomeScene layout={layout} state={state} onDiveEnd={() => patch({ diving: false })} onPickDistrict={snapTo} />
        </Canvas>
        <div className="lab-hud">
          <span>{PIXEL_PROFILE.pixelSize} px fixed pass · seed {state.seed} · {state.night ? 'aurora night' : 'cold daylight'}</span>
          <span>{creatureFraction === null ? 'Drag to orbit · wheel to dolly · click a district' : `creature ${(creatureFraction * 100).toFixed(1)}% viewport · rule ≥ 6%`}</span>
        </div>
        <div className="world-key"><i className="fjord" />fjord<i className="geo" />geothermal<i className="lava" />isolated lava</div>
      </div>
    </div>
  )
}
