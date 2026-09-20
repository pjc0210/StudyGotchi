import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { COASTAL_RUINS_LAYOUT, buildLayoutExport, creatureViewportFraction } from './layout/biome-layout'
import { STATIONS, defaultOverride, type StationId } from './camera/stations'
import { PIXEL_PROFILE } from './render/PixelComposer'
import { BiomeScene } from './scene/BiomeScene'
import { PHASE_SECONDS, type CatastrophePhase, type LabState } from './state'
import { Panel } from './ui/Panel'
import './app.css'

const layout = COASTAL_RUINS_LAYOUT

function initialState(): LabState {
  const params = new URLSearchParams(window.location.search)
  const all = Math.min(1, Math.max(0, Number(params.get('p') ?? 75) / 100))
  const requestedStation = params.get('station')
  const station: StationId = requestedStation && requestedStation in STATIONS ? requestedStation as StationId : 'overview'
  const focusDistrict = params.get('district')
  const district = layout.districts.find((candidate) => candidate.id === focusDistrict)
  const seed = Math.min(99, Math.max(1, Number(params.get('seed') ?? 7)))
  const catastropheId = params.get('cat')
  const catastropheDistrict = layout.districts.find((candidate) => candidate.id === catastropheId)?.id ?? null
  const camera = defaultOverride(STATIONS[station])
  if (params.has('az')) camera.azimuthDeg = Math.min(35, Math.max(-35, Number(params.get('az'))))
  if (params.has('dolly')) camera.dolly = Number(params.get('dolly'))
  if (district && station === 'district') camera.azimuthDeg = district.stationAzimuth
  return {
    progress: Object.fromEntries(layout.districts.map((candidate) => [candidate.id, all])),
    residents: Math.round(all * 18),
    seed,
    night: params.get('night') === '1',
    clouds: params.get('clouds') !== '0',
    boatEvent: params.get('boat') !== '0',
    pixel: params.get('pixel') !== '0',
    markerMode: params.get('marker') === '1',
    station,
    focusDistrict: district?.id ?? null,
    camera,
    catastrophe: catastropheDistrict ? { districtId: catastropheDistrict, phase: 'ruin', startedAt: 0 } : { districtId: null, phase: 'calm', startedAt: 0 },
    diving: false,
  }
}

const NEXT_PHASE: Partial<Record<CatastrophePhase, CatastrophePhase>> = {
  squall: 'quake',
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
  const referenceMode = new URLSearchParams(window.location.search).get('reference') === '1'
  const [aspect, setAspect] = useState(16 / 9)
  const renderer = useRef<THREE.WebGLRenderer | null>(null)
  const patch = useCallback((next: Partial<LabState>) => setState((current) => ({ ...current, ...next })), [])

  useEffect(() => {
    const next = NEXT_PHASE[state.catastrophe.phase]
    if (!next) return
    const timeout = window.setTimeout(() => {
      setState((current) => ({
        ...current,
        catastrophe: next === 'calm'
          ? { districtId: null, phase: 'calm', startedAt: 0 }
          : { ...current.catastrophe, phase: next, startedAt: performance.now() },
      }))
    }, PHASE_SECONDS[state.catastrophe.phase] * 1000)
    return () => window.clearTimeout(timeout)
  }, [state.catastrophe.phase, state.catastrophe.startedAt])

  const districtCamera = (id: string) => {
    const district = layout.districts.find((candidate) => candidate.id === id)
    return { ...defaultOverride(STATIONS.district), azimuthDeg: district?.stationAzimuth ?? STATIONS.district.azimuthDeg }
  }

  const onStation = (station: StationId) => {
    setState((current) => {
      const focusDistrict = station === 'district' ? current.focusDistrict ?? layout.districts[0].id : current.focusDistrict
      return {
        ...current,
        station,
        markerMode: false,
        focusDistrict,
        camera: station === 'district' && focusDistrict ? districtCamera(focusDistrict) : defaultOverride(STATIONS[station]),
      }
    })
  }

  const snapTo = (id: string) => setState((current) => ({
    ...current,
    markerMode: false,
    focusDistrict: id,
    station: 'district',
    camera: districtCamera(id),
  }))

  const onExport = () => {
    const payload = buildLayoutExport(layout, state.progress, state.seed, {
      station: state.station,
      focusDistrict: state.focusDistrict,
      ...state.camera,
    })
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    download(`coastal-ruins-seed-${state.seed}.json`, URL.createObjectURL(blob))
  }

  const onScreenshot = () => {
    if (!renderer.current) return
    download(`coastal-ruins-${state.station}-s${state.seed}-${Date.now()}.png`, renderer.current.domElement.toDataURL('image/png'))
  }

  const focused = state.station === 'district' ? layout.districts.find((district) => district.id === state.focusDistrict) : undefined
  const creatureFraction = focused
    ? creatureViewportFraction(
        layout.creatureHeight * layout.creatureScale,
        focused.cameraChord * state.camera.dolly,
        STATIONS.district.fitWidth ?? 0.75,
        aspect,
        state.camera.pitchDeg,
      )
    : null

  return (
    <div className="lab" data-pixel={state.pixel} data-biome="coastal-ruins">
      <Panel
        layout={layout}
        state={state}
        onProgress={(id, value) => setState((current) => ({ ...current, progress: { ...current.progress, [id]: value } }))}
        onAllProgress={(value) => setState((current) => ({
          ...current,
          progress: Object.fromEntries(layout.districts.map((district) => [district.id, value])),
          residents: Math.round(value * 18),
        }))}
        onPatch={patch}
        onStation={onStation}
        onFocusDistrict={snapTo}
        onCamera={(camera) => setState((current) => ({ ...current, camera: { ...current.camera, ...camera } }))}
        onDive={() => setState((current) => ({
          ...current,
          markerMode: false,
          diving: true,
          station: 'arrival',
          camera: defaultOverride(STATIONS.arrival),
          focusDistrict: null,
        }))}
        onCatastrophe={(districtId) => setState((current) => ({
          ...current,
          catastrophe: { districtId, phase: 'squall', startedAt: performance.now() },
        }))}
        onRecover={() => setState((current) => ({
          ...current,
          catastrophe: { ...current.catastrophe, phase: 'recovering', startedAt: performance.now() },
        }))}
        onExport={onExport}
        onScreenshot={onScreenshot}
      />
      <div className="lab-canvas">
        <Canvas
          shadows
          dpr={state.pixel ? 1 : [1, 2]}
          gl={{ antialias: !state.pixel, preserveDrawingBuffer: true, alpha: false }}
          onCreated={({ gl, size }) => {
            renderer.current = gl
            setAspect(size.width / size.height)
          }}
        >
          <BiomeScene layout={layout} state={state} onDiveEnd={() => patch({ diving: false })} />
        </Canvas>
        {referenceMode && (
          <aside className="reference-board">
            <span className="lab-kicker">Plan v2 · implementation comparison</span>
            <img src="/reference/coastal-ruins-plan-v2.svg" alt="Coastal Ruins plan v2" />
            <p>Direction A: fixed catchments and water routes, distinct 48 px anchors, north-only skyline, east/west islets, open front sea.</p>
          </aside>
        )}
        <div className="lab-hud">
          <span>{state.pixel ? `${PIXEL_PROFILE.pixelSize} px fixed pass` : 'full resolution'} · {layout.direction}</span>
          <span>{creatureFraction === null ? 'front diorama · panel yaw ±35° · dolly 0.72–1.55×' : `creature ${(creatureFraction * 100).toFixed(1)}% of viewport · rule ≥ 6%`}</span>
        </div>
      </div>
    </div>
  )
}
