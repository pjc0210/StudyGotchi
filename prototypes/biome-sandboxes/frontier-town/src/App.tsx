import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { FRONTIER_LAYOUT as L, buildLayoutExport, creatureViewportFraction } from './layout/biome-layout'
import { defaultOverride, STATIONS, type StationId } from './camera/stations'
import { PIXEL_PROFILE } from './render/PixelComposer'
import { FrontierScene } from './scene/FrontierScene'
import type { LabState } from './state'
import { Panel } from './ui/Panel'
import './app.css'

const params = new URLSearchParams(window.location.search)
const showReferenceBoard = params.get('board') === '1'
const captureMode = params.get('capture') === '1'
const initialProgress = Number(params.get('progress') ?? 1)
const initialStation = (params.get('station') as StationId | null) ?? 'overview'
const initialFocus = params.get('focus') ?? null
const initialCatastrophe = params.get('catastrophe')
const initialCamera = {
  ...defaultOverride(initialStation),
  azimuthDeg: Number(params.get('yaw') ?? params.get('azimuth') ?? STATIONS[initialStation].azimuthDeg),
  pitchDeg: Number(params.get('pitch') ?? STATIONS[initialStation].pitchDeg),
  dolly: Number(params.get('dolly') ?? STATIONS[initialStation].dolly),
}

const INITIAL: LabState = {
  progress: Object.fromEntries(L.districts.map((district) => [district.id, initialProgress])),
  residents: Number(params.get('residents') ?? 12),
  seed: Number(params.get('seed') ?? 7),
  night: params.get('night') === '1',
  dust: params.get('dust') !== '0',
  train: params.get('train') !== '0',
  wildlife: params.get('wildlife') !== '0',
  pixel: params.get('pixel') !== '0',
  station: initialStation,
  focusDistrict: initialFocus,
  camera: initialCamera,
  catastrophe: initialCatastrophe === 'ruin' || initialCatastrophe === 'recovering'
    ? { districtId: params.get('focus') ?? 'main-town', phase: initialCatastrophe }
    : { districtId: null, phase: 'calm' },
}

function download(name: string, href: string) {
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = name
  anchor.click()
}

export default function App() {
  const [state, setState] = useState(INITIAL)
  const renderer = useRef<THREE.WebGLRenderer | null>(null)
  const patch = useCallback((next: Partial<LabState>) => setState((current) => ({ ...current, ...next })), [])

  useEffect(() => {
    if (state.catastrophe.phase === 'dust') {
      const timer = window.setTimeout(() => setState((current) => ({ ...current, catastrophe: { ...current.catastrophe, phase: 'impact' } })), 1500)
      return () => window.clearTimeout(timer)
    }
    if (state.catastrophe.phase === 'impact') {
      const timer = window.setTimeout(() => setState((current) => ({ ...current, catastrophe: { ...current.catastrophe, phase: 'ruin' } })), 650)
      return () => window.clearTimeout(timer)
    }
    if (state.catastrophe.phase === 'recovering') {
      const timer = window.setTimeout(() => setState((current) => ({ ...current, catastrophe: { districtId: null, phase: 'calm' } })), 2200)
      return () => window.clearTimeout(timer)
    }
  }, [state.catastrophe.phase])

  const onStation = (station: StationId) => setState((current) => ({
    ...current,
    station,
    focusDistrict: station === 'district' ? current.focusDistrict ?? 'main-town' : current.focusDistrict,
    camera: defaultOverride(station),
  }))

  const onFocus = (focusDistrict: string) => {
    setState((current) => ({
      ...current,
      focusDistrict,
      station: 'district',
      camera: defaultOverride('district'),
    }))
  }

  const focused = L.districts.find((district) => district.id === state.focusDistrict)
  const creatureFraction = focused
    ? creatureViewportFraction(L.creatureHeight * L.creatureScale, focused.stationChord * state.camera.dolly, 0.75, 16 / 9, state.camera.pitchDeg)
    : null

  return (
    <main className="app" data-pixel={state.pixel} data-capture={captureMode} data-ready="true">
      <Panel
        state={state}
        onPatch={patch}
        onProgress={(id, value) => setState((current) => ({ ...current, progress: { ...current.progress, [id]: value } }))}
        onAllProgress={(value) => setState((current) => ({ ...current, progress: Object.fromEntries(L.districts.map((district) => [district.id, value])) }))}
        onStation={onStation}
        onFocus={onFocus}
        onCamera={(key, value) => setState((current) => ({ ...current, camera: { ...current.camera, [key]: value } }))}
        onBreak={(districtId) => setState((current) => ({ ...current, catastrophe: { districtId, phase: 'dust' }, dust: true }))}
        onRecover={() => setState((current) => ({ ...current, catastrophe: { ...current.catastrophe, phase: 'recovering' } }))}
        onExport={() => {
          const json = JSON.stringify(buildLayoutExport(state.seed, state.progress, { station: state.station, focusDistrict: state.focusDistrict, ...state.camera }), null, 2)
          download(`frontier-town-seed-${state.seed}.json`, URL.createObjectURL(new Blob([json], { type: 'application/json' })))
        }}
        onScreenshot={() => {
          if (renderer.current) download(`frontier-town-${state.station}-seed-${state.seed}.png`, renderer.current.domElement.toDataURL('image/png'))
        }}
      />
      <div className="viewport">
        <Canvas
          shadows
          dpr={1}
          gl={{ antialias: !state.pixel, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => { renderer.current = gl }}
        >
          <FrontierScene state={state} onPickDistrict={onFocus} />
        </Canvas>
        <div className="hud top">
          <span>FRONTIER BASIN // {state.station.toUpperCase()}</span>
          <span>YAW {state.camera.azimuthDeg.toFixed(0)}° · EL {state.camera.pitchDeg.toFixed(0)}° · FRONT CAMERA</span>
        </div>
        <div className="hud bottom">
          <span>{PIXEL_PROFILE.pixelSize} PX DS PASS · FIXED ALL DISTANCES</span>
          <span>{creatureFraction ? `CREATURE ${(creatureFraction * 100).toFixed(1)}% · RULE ≥6%` : 'YAW ±35° · DOLLY 1–1.35× · CLICK DISTRICT'}</span>
        </div>
      </div>
      {showReferenceBoard && (
        <div className="reference-board">
          <div className="board-heading">
            <span>Reference comparison · plan v4 art pass</span>
            <strong>Built from observed working places</strong>
          </div>
          {[
            {
              ref: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bodie_streets.jpg?width=900',
              source: 'https://commons.wikimedia.org/wiki/File:Bodie_streets.jpg',
              shot: '/comparisons/main-town.png',
              title: 'Main Town',
              take: 'Bodie street wall: uneven false fronts, porch rhythm, civic vertical',
            },
            {
              ref: 'https://commons.wikimedia.org/wiki/Special:FilePath/Grand_Canyon_Village-Grand_Canyon_Railroad_Depot-1901-1.jpg?width=900',
              source: 'https://commons.wikimedia.org/wiki/File:Grand_Canyon_Village-Grand_Canyon_Railroad_Depot-1901-1.jpg',
              shot: '/comparisons/railway.png',
              title: 'Grand Railway',
              take: 'long working platform, deep canopy, depot mass and trackside equipment',
            },
            {
              ref: 'https://commons.wikimedia.org/wiki/Special:FilePath/Little_Boquillas_Ranch_Corral_Fairbank_Arizona_2015.JPG?width=900',
              source: 'https://commons.wikimedia.org/wiki/File:Little_Boquillas_Ranch_Corral_Fairbank_Arizona_2015.JPG',
              shot: '/comparisons/ranch.png',
              title: 'Broad Ranch',
              take: 'large linked corrals, weathered rails, open animal runs and barn yard',
            },
            {
              ref: 'https://commons.wikimedia.org/wiki/Special:FilePath/Anselmo_Mine_headframe_(Butte,_Montana,_USA)_1.jpg?width=900',
              source: 'https://commons.wikimedia.org/wiki/File:Anselmo_Mine_headframe_(Butte,_Montana,_USA)_1.jpg',
              shot: '/comparisons/mine.png',
              title: 'Mine Works',
              take: 'towering braced headframe, twin sheaves, hoist house and ore handling',
            },
            {
              ref: 'https://commons.wikimedia.org/wiki/Special:FilePath/Excavations_at_Burrough_Hill,_2011.jpg?width=900',
              source: 'https://commons.wikimedia.org/wiki/File:Excavations_at_Burrough_Hill,_2011.jpg',
              shot: '/comparisons/dig.png',
              title: 'Frontier Dig',
              take: 'square trenches, baulks, string grids, spoil heaps and active work tables',
            },
            {
              ref: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tecolote_Camp_Pinacate_Cholla.jpg?width=900',
              source: 'https://commons.wikimedia.org/wiki/File:Tecolote_Camp_Pinacate_Cholla.jpg',
              shot: '/comparisons/reserve.png',
              title: 'Desert Reserve',
              take: 'varied cactus fields, habitat pockets, rock stacks and open desert cadence',
            },
          ].map((row) => (
            <article className="comparison-row" key={row.title}>
              <figure><img src={row.ref} alt={`${row.title} real-world reference`} /><figcaption><a href={row.source}>Actual reference · Wikimedia Commons</a></figcaption></figure>
              <div className="comparison-notes"><h2>{row.title}</h2><p>{row.take}</p></div>
              <figure><img src={row.shot} alt={`${row.title} prototype district`} /><figcaption>Procedural district · seed 7</figcaption></figure>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
