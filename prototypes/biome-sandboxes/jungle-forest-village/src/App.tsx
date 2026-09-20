import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { STATIONS, clampBiomeYaw, defaultOverride, type StationId } from './camera/stations'
import {
  JUNGLE_LAYOUT as L,
  buildJungleExport,
  type DistrictId,
} from './layout/jungle-layout'
import { CATASTROPHE_SECONDS, type JungleCatastrophePhase, type JungleState } from './jungle-state'
import { PIXEL_PROFILE } from './render/PixelComposer'
import { JungleScene } from './scene/JungleScene'
import { JunglePanel } from './ui/JunglePanel'
import './app.css'

const DISTRICT_IDS = new Set<DistrictId>(L.districts.map((district) => district.id))

function queryInitial(): JungleState {
  const query = new URLSearchParams(window.location.search)
  const progressValue = Math.min(1, Math.max(0, Number(query.get('progress') ?? 0.75)))
  const districtParam = query.get('district') as DistrictId | null
  const focusDistrict = districtParam && DISTRICT_IDS.has(districtParam) ? districtParam : null
  const stationParam = query.get('station') as StationId | null
  const station: StationId = focusDistrict ? 'district' : stationParam && stationParam in STATIONS ? stationParam : 'overview'
  const seed = Math.min(99, Math.max(1, Number(query.get('seed') ?? 7)))
  const catastropheParam = query.get('catastrophe') as DistrictId | null
  const catastropheDistrict = catastropheParam && DISTRICT_IDS.has(catastropheParam) ? catastropheParam : null
  const camera = defaultOverride(STATIONS[station])
  if (query.has('yaw')) camera.azimuthDeg = clampBiomeYaw(Number(query.get('yaw')))
  if (query.has('azimuth')) camera.azimuthDeg = clampBiomeYaw(Number(query.get('azimuth')))
  if (query.has('dolly')) camera.dolly = Math.min(1.55, Math.max(0.6, Number(query.get('dolly'))))
  if (query.has('pitch')) camera.pitchDeg = Math.min(40, Math.max(34, Number(query.get('pitch'))))
  return {
    progress: Object.fromEntries(L.districts.map((district) => [district.id, progressValue])),
    residents: Number(query.get('residents') ?? 10),
    seed,
    night: query.get('night') === '1',
    mist: query.get('mist') !== '0',
    birds: query.get('birds') !== '0',
    waterEvent: query.get('water') !== '0',
    pixel: query.get('pixel') !== '0',
    station,
    focusDistrict,
    camera,
    catastrophe: catastropheDistrict
      ? { districtId: catastropheDistrict, phase: 'overgrowth', startedAt: 0 }
      : { districtId: null, phase: 'calm', startedAt: 0 },
    diving: false,
    comparison: query.get('board') === '1',
  }
}

const NEXT_PHASE: Partial<Record<JungleCatastrophePhase, JungleCatastrophePhase>> = {
  monsoon: 'strike',
  strike: 'overgrowth',
  recovering: 'calm',
}

function download(name: string, href: string) {
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = name
  anchor.click()
}

function ComparisonBoard() {
  const rows = [
    {
      title: 'Great Canopy Village',
      reference: '/references/04-forest-village-concept.jpg',
      capture: '/comparisons/canopy.png',
      take: 'expansive civic core · stacked galleries · giant trunks',
      leave: 'wall-to-wall human density · orange dominance',
    },
    {
      title: 'Falls Terraces',
      reference: '/references/05-artstation-forest-village.jpg',
      capture: '/comparisons/falls.png',
      take: 'river logic · stepped land · bridge hierarchy',
      leave: 'floating-island edge · exact settlement plan',
    },
    {
      title: 'Lagoon Quarter',
      reference: '/references/01-jungle-treehouse-village.jpg',
      capture: '/comparisons/lagoon.png',
      take: 'broad water space · reeds · linked inhabited decks',
      leave: 'Minecraft block language · copied composition',
    },
    {
      title: 'Ruin Commons',
      reference: '/references/03-fantasy-forest-village.jpg',
      capture: '/comparisons/ruins.png',
      take: 'root framing · warm accents · strong small-scale anchor',
      leave: 'repeated kit islands · neon whole buildings',
    },
    {
      title: 'Riverworks',
      reference: '/references/02-low-poly-treehouse-pack.jpg',
      capture: '/comparisons/riverworks.png',
      take: 'simple materials · ladders · mixed platform scales',
      leave: 'asset-pack lineup · repeated treehouse module',
    },
  ]
  return (
    <section className="comparison-board reference-board" aria-label="Reference comparison board">
      <header>
        <span className="lab-kicker">Reference fidelity board · ledger sources</span>
        <h2>Take the spatial cues. Leave the copied composition.</h2>
      </header>
      <div className="reference-rows">
        {rows.map((row, index) => (
          <article key={row.title} className="reference-row">
            <span className="reference-index">{String(index + 1).padStart(2, '0')}</span>
            <strong>{row.title}</strong>
            <figure>
              <img src={row.reference} alt={`${row.title} source reference`} />
              <figcaption>ledger reference</figcaption>
            </figure>
            <figure>
              <img src={row.capture} alt={`${row.title} sandbox capture`} />
              <figcaption>sandbox match</figcaption>
            </figure>
            <div className="reference-notes">
              <p><b>Take</b>{row.take}</p>
              <p><b>Leave</b>{row.leave}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default function App() {
  const [state, setState] = useState<JungleState>(queryInitial)
  const glRef = useRef<THREE.WebGLRenderer | null>(null)
  const patch = useCallback((next: Partial<JungleState>) => setState((current) => ({ ...current, ...next })), [])

  useEffect(() => {
    const next = NEXT_PHASE[state.catastrophe.phase]
    if (!next) return
    const timeout = window.setTimeout(() => {
      setState((current) => ({
        ...current,
        catastrophe:
          next === 'calm'
            ? { districtId: null, phase: 'calm', startedAt: 0 }
            : { ...current.catastrophe, phase: next, startedAt: performance.now() },
      }))
    }, CATASTROPHE_SECONDS[state.catastrophe.phase] * 1000)
    return () => window.clearTimeout(timeout)
  }, [state.catastrophe.phase, state.catastrophe.startedAt])

  const districtCamera = (id: DistrictId) => {
    const district = L.districts.find((candidate) => candidate.id === id)
    return {
      ...defaultOverride(STATIONS.district),
      azimuthDeg: clampBiomeYaw(district?.stationAzimuth ?? STATIONS.district.azimuthDeg),
    }
  }

  const onStation = (station: StationId) =>
    setState((current) => {
      const focusDistrict = station === 'district' || station === 'resident' ? current.focusDistrict ?? 'canopy' : current.focusDistrict
      const camera = station === 'district' && focusDistrict ? districtCamera(focusDistrict) : defaultOverride(STATIONS[station])
      return { ...current, station, focusDistrict, camera }
    })

  const snapTo = (id: DistrictId) =>
    setState((current) => ({ ...current, focusDistrict: id, station: 'district', camera: districtCamera(id), comparison: false }))

  const onExport = () => {
    const data = buildJungleExport(state.seed, state.progress, {
      station: state.station,
      focusDistrict: state.focusDistrict,
      ...state.camera,
    })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    download('jungle-forest-village-layout.json', URL.createObjectURL(blob))
  }

  const onScreenshot = () => {
    const renderer = glRef.current
    if (!renderer) return
    download(`jungle-${state.station}-seed-${state.seed}-${Date.now()}.png`, renderer.domElement.toDataURL('image/png'))
  }

  const focused = L.districts.find((district) => district.id === state.focusDistrict)
  const creatureFraction =
    state.station === 'district' && focused
      ? (L.creature.height *
          L.creature.scale *
          Math.cos((state.camera.pitchDeg * Math.PI) / 180)) /
        (2 * 74 * state.camera.dolly * Math.tan((state.camera.fov * Math.PI) / 360))
      : null

  return (
    <div className="lab" data-pixel={state.pixel}>
      <JunglePanel
        state={state}
        onProgress={(id, value) => setState((current) => ({ ...current, progress: { ...current.progress, [id]: value } }))}
        onAllProgress={(value) =>
          setState((current) => ({
            ...current,
            progress: Object.fromEntries(L.districts.map((district) => [district.id, value])),
          }))
        }
        onPatch={patch}
        onStation={onStation}
        onDistrict={snapTo}
        onCamera={(camera) =>
          setState((current) => ({
            ...current,
            camera: {
              ...current.camera,
              ...camera,
              azimuthDeg: camera.azimuthDeg === undefined ? current.camera.azimuthDeg : clampBiomeYaw(camera.azimuthDeg),
              pitchDeg:
                camera.pitchDeg === undefined ? current.camera.pitchDeg : Math.min(40, Math.max(34, camera.pitchDeg)),
            },
          }))
        }
        onYaw={(azimuthDeg) =>
          setState((current) => ({
            ...current,
            station: 'overview',
            focusDistrict: null,
            camera: { ...defaultOverride(STATIONS.overview), azimuthDeg: clampBiomeYaw(azimuthDeg) },
          }))
        }
        onDive={() =>
          setState((current) => ({
            ...current,
            diving: true,
            station: 'arrival',
            focusDistrict: null,
            camera: defaultOverride(STATIONS.arrival),
          }))
        }
        onCatastrophe={(districtId) =>
          setState((current) => ({
            ...current,
            catastrophe: { districtId, phase: 'monsoon', startedAt: performance.now() },
          }))
        }
        onRecover={() =>
          setState((current) => ({
            ...current,
            catastrophe: { ...current.catastrophe, phase: 'recovering', startedAt: performance.now() },
          }))
        }
        onExport={onExport}
        onScreenshot={onScreenshot}
      />
      <main className="lab-canvas">
        <Canvas
          shadows
          dpr={state.pixel ? 1 : [1, 2]}
          gl={{ antialias: !state.pixel, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            glRef.current = gl
            gl.outputColorSpace = THREE.SRGBColorSpace
          }}
        >
          <JungleScene state={state} onDiveEnd={() => patch({ diving: false })} />
        </Canvas>
        {state.comparison && <ComparisonBoard />}
        <div className="lab-hud">
          <span>
            {state.pixel
              ? `${PIXEL_PROFILE.pixelSize} px DS pass · fixed all stations · toon ramp`
              : 'Full resolution · toon ramp'}
            {creatureFraction !== null && ` · creature ${(creatureFraction * 100).toFixed(1)}% viewport (rule ≥ 6%)`}
          </span>
          <span>Drag yaw ±35° · wheel dolly · click district</span>
        </div>
      </main>
    </div>
  )
}
