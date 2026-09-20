import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AssetsContext, type AssetMode } from './lib/assets'
import { preloadRoster } from './components/GlbCreature'
import { buildWorld, conceptState, type Cluster, type Concept } from './lib/world'
import { PLANET_R, PLANET_SKY, buildPlanet, creatureCount, isTopic, type Course, type Topic } from './lib/galaxy'
import { PlanetScene } from './scenes/Planet'
import { IslandScene, type IslandCamera } from './scenes/Island'
import { P2_FOV, Planet2Scene, type MapApi, type Planet2Level, type ScrollMode, type ZoomVariant } from './scenes/Planet2'
import { GAME_MODEL_COUNT, SketchfabCycle } from './scenes/SketchfabCycle'
import { GAME_MODELS } from './data/game-models'
import { courseFraction } from './components/MapMarker'
import { SitePage } from './site/SitePage'
import { useSystemNight } from './lib/night'
import type { CatastrophePhase, CatastropheState } from './components/Growth'
import { GoldenPage } from './golden/GoldenPage'
import { ChromePage } from './chrome/ChromePage'
import { InteractPage } from './interact/InteractPage'
import { ArtPage } from './art/ArtPage'
import { CameraGlobePage } from './golden/CameraGlobePage'
import { isMuted, nowPlaying, playSfx, setLabScene, setMuted, subscribeAudio, unlockAudio } from './lib/audio'
import './App.css'

export type Selection =
  | { kind: 'concept'; concept: Concept }
  | { kind: 'creature'; index: number; cluster: Cluster; course?: Course }
  | { kind: 'cluster'; cluster: Cluster }
  /** a course patch on the multi-course planet; treated as a zoom request, not shown as a card */
  | { kind: 'course'; course: Course }

type Shape = 'planet' | 'island' | 'planet2' | 'cycle' | 'site' | 'golden' | 'camera' | 'chrome' | 'interact' | 'art'

// a new default camera is created whenever these change, so each mode starts from its own pose
const CAMERA: Record<Shape, { position: [number, number, number]; fov: number }> = {
  planet: { position: [0, 8, 19], fov: 40 },
  island: { position: [0, 19, 27], fov: 40 },
  // narrower fov: less perspective lean on props at the frame edges when looking down at a biome
  planet2: { position: [0, 2.2 * PLANET_R, 6.0 * PLANET_R], fov: P2_FOV },
  cycle: { position: [0, 0.35, 3.1], fov: 40 },
  site: { position: [0, 2.2 * PLANET_R, 6.0 * PLANET_R], fov: P2_FOV },
  golden: { position: [10.5, 8.5, 13.5], fov: 28 },
  camera: { position: [0, 3.2, 17], fov: 24 },
  chrome: { position: [10.5, 8.5, 13.5], fov: 28 },
  interact: { position: [10.5, 8.5, 13.5], fov: 28 },
  art: { position: [10.5, 8.5, 13.5], fov: 28 },
}

/** deep links for side-by-side comparison, e.g. ?mode=planet2&zoom=swap&course=6.1210&progress=0.6 */
const PARAMS = new URLSearchParams(window.location.search)
const isShape = (s: string | null): s is Shape => s === 'planet' || s === 'island' || s === 'planet2' || s === 'cycle' || s === 'site' || s === 'golden' || s === 'camera' || s === 'chrome' || s === 'interact' || s === 'art'
const isMode = (s: string | null): s is AssetMode => s === 'glb' || s === 'primitive'
const CROWD = Math.max(1, Math.min(6, parseInt(PARAMS.get('crowd') ?? '1', 10) || 1))
/** `?detail=1`: old level 1 with every structure on the sphere, for comparison with the map */
const DETAIL = PARAMS.get('detail') === '1'

/** renderer.info + fps, exposed on window.__stats for headless measurement and shown in the panel */
export interface RenderStats {
  fps: number
  calls: number
  triangles: number
  programs: number
}
function StatsProbe({ onStats }: { onStats: (s: RenderStats) => void }) {
  const gl = useThree((s) => s.gl)
  const cam = useThree((s) => s.camera)
  const accRef = useRef({ frames: 0, t: 0 })
  useFrame((_, dt) => {
    const acc = accRef.current
    acc.frames++
    acc.t += dt
    if (acc.t >= 1) {
      const s = { fps: Math.round(acc.frames / acc.t), calls: gl.info.render.calls, triangles: gl.info.render.triangles, programs: gl.info.programs?.length ?? 0 }
      ;(window as unknown as { __stats?: RenderStats }).__stats = s
      ;(window as unknown as { __cam?: number[] }).__cam = [...cam.position.toArray().map((v) => Math.round(v)), ...cam.up.toArray().map((v) => Math.round(v * 100) / 100)]
      onStats(s)
      acc.frames = 0
      acc.t = 0
    }
  })
  return null
}

export default function App() {
  const [creatureMode, setCreatureMode] = useState<AssetMode>(() => (isMode(PARAMS.get('creatures')) ? (PARAMS.get('creatures') as AssetMode) : 'glb'))
  const [landmarkMode, setLandmarkMode] = useState<AssetMode>(() => (isMode(PARAMS.get('landmarks')) ? (PARAMS.get('landmarks') as AssetMode) : 'glb'))
  const [stats, setStats] = useState<RenderStats | null>(null)
  useEffect(() => {
    if (creatureMode === 'glb') preloadRoster()
  }, [creatureMode])
  const [shape, setShape] = useState<Shape>(() => (isShape(PARAMS.get('mode')) ? PARAMS.get('mode') as Shape : 'planet2'))
  const [seed, setSeed] = useState(() => PARAMS.get('seed') ?? 'philote/6.1210')
  const [progress, setProgress] = useState(() => {
    const p = parseFloat(PARAMS.get('progress') ?? '')
    return Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0.45
  })
  const [selection, setSelection] = useState<Selection | null>(null)
  const [cameraMode, setCameraMode] = useState<IslandCamera>('snap')
  const [focus, setFocus] = useState<Cluster | null>(null)

  const world = useMemo(() => buildWorld(seed), [seed])
  const planet = useMemo(() => buildPlanet(seed), [seed])

  // Planet 2-zoom
  // continuous (stay on the planet) is primary; `?zoom=swap` keeps the rejected flat-diorama variant around for comparison
  const [zoom, setZoom] = useState<ZoomVariant>(() => (PARAMS.get('zoom') === 'swap' ? 'swap' : 'continuous'))
  const [scrollMode, setScrollMode] = useState<ScrollMode>(() => (PARAMS.get('scroll') === 'continuous' ? 'continuous' : 'stops'))
  // map level 1: `?course=` scrolls to that course's stop; add `&enter=1` (or `?detail=1`) to fly straight into it
  const [p2Course, setP2Course] = useState<Course | null>(() =>
    DETAIL || PARAMS.get('enter') === '1' ? (planet.courses.find((c) => c.code === PARAMS.get('course')) ?? null) : null,
  )
  const initialStop = useMemo(() => Math.max(0, planet.courses.findIndex((c) => c.code === PARAMS.get('course'))), [planet])
  const [mapStop, setMapStop] = useState(initialStop)
  const mapApi = useRef<MapApi | null>(null)

  // night: prefers-color-scheme unless the manual toggle (or ?night=1|0) overrides it
  const systemNight = useSystemNight()
  const [nightOverride, setNightOverride] = useState<boolean | null>(() => (PARAMS.get('night') === '1' ? true : PARAMS.get('night') === '0' ? false : null))
  const night = nightOverride ?? systemNight

  // catastrophe (debug trigger on the focused topic); the ruin phase saddens that topic's creatures
  const [catastrophe, setCatastrophe] = useState<CatastropheState | null>(null)
  const [catPhase, setCatPhase] = useState<CatastrophePhase>('gather')
  const sadTopics = useMemo(() => (catastrophe && (catPhase === 'ruin' || catPhase === 'scaffold') ? new Set([catastrophe.topic.index]) : new Set<number>()), [catastrophe, catPhase])
  const triggerCatastrophe = (topic: Topic) => {
    setP2Topic(topic)
    setCatPhase('gather')
    setCatastrophe({ topic, startedAt: performance.now() })
  }
  const onCatPhase = (p: CatastrophePhase) => {
    setCatPhase(p)
    if (p === 'done') setCatastrophe(null)
  }
  const [p2Topic, setP2Topic] = useState<Topic | null>(null)
  const [p2Level, setP2Level] = useState<Planet2Level>('planet')
  const [fade, setFade] = useState(0)
  const [cycleIndex, setCycleIndex] = useState(0)
  const [credit, setCredit] = useState(() => nowPlaying()?.credit ?? null)
  const [musicOff, setMusicOff] = useState(() => isMuted())
  useEffect(() => subscribeAudio(() => {
    setCredit(nowPlaying()?.credit ?? null)
    setMusicOff(isMuted())
  }), [])
  useEffect(() => {
    if (shape === 'planet2' || shape === 'site') {
      if (p2Level === 'biome' && p2Course) setLabScene('biome', p2Course.family, night)
      else setLabScene('planet', null, night)
    } else if (shape === 'cycle') {
      setLabScene('none', null, night)
    } else {
      setLabScene('planet', null, night)
    }
  }, [shape, p2Level, p2Course, night])
  useEffect(() => {
    if (shape !== 'cycle' || GAME_MODEL_COUNT < 1) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setCycleIndex((i) => (i + 1) % GAME_MODEL_COUNT)
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setCycleIndex((i) => (i - 1 + GAME_MODEL_COUNT) % GAME_MODEL_COUNT)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shape])

  const isP2 = shape === 'planet2'
  const concepts = isP2 ? planet.spots : world.concepts
  const built = concepts.filter((c) => conceptState(c, progress) === 2).length
  const sprouted = concepts.filter((c) => conceptState(c, progress) === 1).length
  const creatures = isP2
    ? planet.courses.reduce((n, c) => n + creatureCount(c, progress), 0)
    : Math.floor(progress * world.psets + 1e-6)

  const select = (s: Selection | null) => {
    if (s?.kind === 'course') {
      setP2Course(s.course)
      setP2Topic(null)
      setSelection(null)
      return
    }
    setSelection(s)
    if (s?.kind === 'cluster' && shape === 'island') setFocus(s.cluster)
    if (s?.kind === 'cluster' && isP2 && isTopic(s.cluster)) setP2Topic(s.cluster)
  }

  const switchShape = (next: Shape) => {
    setShape(next)
    setSelection(null)
    setFocus(null)
    setP2Course(null)
    setP2Topic(null)
    setP2Level('planet')
    setFade(0)
  }

  const changeSeed = (value: string) => {
    setSeed(value)
    setSelection(null)
    setFocus(null)
    setP2Course(null)
    setP2Topic(null)
  }

  const goCourse = (c: Course | null) => {
    unlockAudio()
    playSfx(c ? 'camera-dive' : 'camera-rise')
    setP2Course(c)
    setP2Topic(null)
    setSelection(null)
  }

  const mapMode = isP2 && !DETAIL && p2Level === 'planet'

  const levelText =
    p2Level === 'planet' ? 'Level 1 · whole planet' : p2Level === 'flying' ? 'Level 1 → 2 · flying' : `Level 2 · ${p2Course?.code ?? ''} (${p2Course?.family ?? ''})`

  const assets = useMemo(() => ({ creatures: creatureMode, landmarks: landmarkMode, seed, progress, crowd: CROWD, sadTopics, night }), [creatureMode, landmarkMode, seed, progress, sadTopics, night])

  const cycleItem = GAME_MODELS[cycleIndex]

  // the site page owns its own canvas and layout; the lab chrome below is not rendered for it
  if (shape === 'site') {
    return (
      <div className="app">
        <SitePage />
        <div className="panel" style={{ position: 'fixed', top: 60, right: 14, padding: '6px 10px', zIndex: 40 }}>
          <div className="row">
            <button onClick={() => switchShape('planet2')}>← lab</button>
          </div>
        </div>
      </div>
    )
  }

  if (shape === 'golden') {
    return (
      <GoldenPage
        onBack={() => switchShape('planet2')}
        onCameraProof={() => switchShape('camera')}
      />
    )
  }

  if (shape === 'camera') {
    return <CameraGlobePage onBack={() => switchShape('golden')} />
  }

  if (shape === 'chrome') {
    return <ChromePage onBack={() => switchShape('golden')} />
  }

  if (shape === 'interact') {
    return <InteractPage onBack={() => switchShape('golden')} />
  }

  if (shape === 'art') return <ArtPage onBack={() => switchShape('golden')} />

  return (
    <div className="app">
      {shape === 'cycle' ? (
        <SketchfabCycle index={cycleIndex} />
      ) : (
      <Canvas shadows camera={CAMERA[shape]} dpr={[1, 2]}>
        <StatsProbe onStats={setStats} />
        <AssetsContext value={assets}>
        <Suspense fallback={null}>
          {shape === 'planet' && <PlanetScene world={world} progress={progress} onSelect={select} selection={selection} />}
          {shape === 'island' && (
            <IslandScene
              world={world}
              progress={progress}
              onSelect={select}
              selection={selection}
              cameraMode={cameraMode}
              focusCluster={focus}
            />
          )}
          {shape === 'planet2' && (
            <Planet2Scene
              key={zoom}
              planet={planet}
              progress={progress}
              variant={zoom}
              focusCourse={p2Course}
              focusTopic={p2Topic}
              selection={selection}
              onSelect={select}
              onLevel={setP2Level}
              onFade={setFade}
              detail={DETAIL}
              initialStop={initialStop}
              scrollMode={scrollMode}
              onStop={setMapStop}
              catastrophe={catastrophe}
              onCatastrophePhase={onCatPhase}
              night={night}
              mapApi={mapApi}
            />
          )}
        </Suspense>
        </AssetsContext>
      </Canvas>
      )}

      {isP2 && <div className="fade" style={{ opacity: fade, background: PLANET_SKY }} />}

      {mapMode && (
        <div className="panel map-column" onWheel={(e) => mapApi.current?.scrollBy(e.deltaY)}>
          <div className="eyebrow">courses · scroll or click to orbit</div>
          {planet.courses.map((c, i) => {
            const frac = courseFraction(c, progress)
            const n = creatureCount(c, progress)
            return (
              <div
                key={c.index}
                className={'course-card' + (i === mapStop ? ' active' : '')}
                style={{ borderColor: i === mapStop ? c.biome.accent : undefined }}
                onClick={() => mapApi.current?.scrollTo(i)}
              >
                <div className="course-head">
                  <span className="swatch" style={{ background: c.biome.ground, borderColor: c.biome.accent }} />
                  <b>{c.code}</b>
                  <span className="course-name">{c.name}</span>
                </div>
                <div className="course-meta">
                  <span>{c.biome.id}</span>
                  <span>{Math.round(frac * 100)}% demonstrated</span>
                  <span>{n} creature{n === 1 ? '' : 's'}</span>
                </div>
                <div className="bar">
                  <div style={{ width: `${Math.round(frac * 100)}%`, background: c.biome.accent }} />
                </div>
                {i === mapStop && (
                  <button
                    className="on"
                    onClick={(e) => {
                      e.stopPropagation()
                      goCourse(c)
                    }}
                  >
                    Enter {c.code}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="panel top-left">
        <div className="title">world-lab</div>
        <div className="row">
          <button className={shape === 'planet' ? 'on' : ''} onClick={() => switchShape('planet')}>Planet</button>
          <button className={shape === 'island' ? 'on' : ''} onClick={() => switchShape('island')}>Island</button>
          <button className={shape === 'planet2' ? 'on' : ''} onClick={() => switchShape('planet2')}>Planet 2-zoom</button>
          <button className={shape === 'cycle' ? 'on' : ''} onClick={() => switchShape('cycle')}>Cycle models</button>
          <button onClick={() => switchShape('site')}>Site page</button>
          <button onClick={() => switchShape('golden')}>Golden scene</button>
          <button onClick={() => switchShape('camera')}>Camera proof</button>
        </div>
        <label>
          Seed
          <input value={seed} onChange={(e) => changeSeed(e.target.value)} />
        </label>
        <label>
          Progress {Math.round(progress * 100)}%
          <input type="range" min={0} max={1} step={0.01} value={progress} onChange={(e) => setProgress(parseFloat(e.target.value))} />
        </label>
        <div className="stats">
          {creatures} creatures · {sprouted} sprouts · {built} landmarks · {concepts.length} concepts
        </div>
        <div className="row">
          <span className="eyebrow" style={{ alignSelf: 'center' }}>creatures</span>
          <button className={creatureMode === 'glb' ? 'on' : ''} onClick={() => setCreatureMode('glb')}>GLB</button>
          <button className={creatureMode === 'primitive' ? 'on' : ''} onClick={() => setCreatureMode('primitive')}>primitive</button>
          <span className="eyebrow" style={{ alignSelf: 'center' }}>landmarks</span>
          <button className={landmarkMode === 'glb' ? 'on' : ''} onClick={() => setLandmarkMode('glb')}>GLB</button>
          <button className={landmarkMode === 'primitive' ? 'on' : ''} onClick={() => setLandmarkMode('primitive')}>primitive</button>
          <button className={night ? 'on' : ''} onClick={() => setNightOverride(!night)} title="night follows prefers-color-scheme unless toggled">
            {night ? 'night' : 'day'}
          </button>
          <button className={musicOff ? '' : 'on'} onClick={() => { unlockAudio(); setMuted(!musicOff) }} title="mute music and sfx">
            {musicOff ? 'sound off' : 'sound'}
          </button>
        </div>
        {credit && (
          <div className="stats" title={credit}>
            ♪ {credit}
          </div>
        )}
        {stats && (
          <div className="stats">
            {stats.fps} fps · {stats.calls} draw calls · {(stats.triangles / 1000).toFixed(0)}k tris · {stats.programs} programs
          </div>
        )}
        {shape === 'island' && (
          <>
            <div className="row">
              <button className={cameraMode === 'snap' ? 'on' : ''} onClick={() => setCameraMode('snap')}>Snap levels</button>
              <button className={cameraMode === 'fixed' ? 'on' : ''} onClick={() => { setCameraMode('fixed'); setFocus(null) }}>Fixed diorama</button>
            </div>
            {cameraMode === 'snap' && (
              <div className="row wrap">
                <button className={!focus ? 'on' : ''} onClick={() => setFocus(null)}>Overview</button>
                {world.clusters.map((c) => (
                  <button key={c.index} className={focus?.index === c.index ? 'on' : ''} onClick={() => setFocus(c)} style={{ borderColor: c.biome.accent }}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {shape === 'cycle' && cycleItem && (
          <>
            <div className="title">{cycleItem.name}</div>
            <div className="stats">
              {cycleIndex + 1} / {GAME_MODEL_COUNT} · {cycleItem.game}
            </div>
            <div className="row">
              <button onClick={() => setCycleIndex((i) => (i - 1 + GAME_MODEL_COUNT) % GAME_MODEL_COUNT)}>Previous</button>
              <button className="on" onClick={() => setCycleIndex((i) => (i + 1) % GAME_MODEL_COUNT)}>Next</button>
            </div>
            <select value={cycleIndex} onChange={(e) => setCycleIndex(parseInt(e.target.value, 10))}>
              {GAME_MODELS.map((m, n) => (
                <option key={m.uid} value={n}>{m.name} — {m.game}</option>
              ))}
            </select>
            <div className="stats">
              {cycleItem.sketchfab}{cycleItem.author ? ` · ${cycleItem.author}` : ''}. Look-at only.
            </div>
          </>
        )}
        {isP2 && (
          <>
            <div className="row">
              <span className="eyebrow" style={{ alignSelf: 'center' }}>zoom</span>
              <button className={zoom === 'continuous' ? 'on' : ''} onClick={() => { setZoom('continuous'); goCourse(null) }}>On planet</button>
              <button className={zoom === 'swap' ? 'on' : ''} onClick={() => { setZoom('swap'); goCourse(null) }} title="rejected flat diorama, kept for comparison">Swap</button>
            </div>
            {mapMode && (
              <div className="row">
                <span className="eyebrow" style={{ alignSelf: 'center' }}>scroll</span>
                <button className={scrollMode === 'stops' ? 'on' : ''} onClick={() => setScrollMode('stops')}>{planet.courses.length} stops</button>
                <button className={scrollMode === 'continuous' ? 'on' : ''} onClick={() => setScrollMode('continuous')}>continuous</button>
              </div>
            )}
            <div className="stats">{levelText}</div>
            <div className="row wrap">
              <button className={!p2Course ? 'on' : ''} onClick={() => goCourse(null)} disabled={!p2Course && p2Level === 'planet'}>
                Back to planet
              </button>
              {!mapMode && planet.courses.map((c) => (
                <button
                  key={c.index}
                  className={p2Course?.index === c.index ? 'on' : ''}
                  style={{ borderColor: c.biome.accent }}
                  onClick={() => goCourse(c)}
                  title={`${c.name} · ${c.family}`}
                >
                  {c.code}
                </button>
              ))}
            </div>
            {p2Course && p2Level === 'biome' && (
              <div className="row wrap topics">
                <button className={!p2Topic ? 'on' : ''} onClick={() => setP2Topic(null)}>whole biome</button>
                {p2Topic && !catastrophe && (
                  <button style={{ borderColor: '#e0653a' }} onClick={() => triggerCatastrophe(p2Topic)}>
                    Trigger catastrophe on {p2Topic.name}
                  </button>
                )}
                {catastrophe && <span className="eyebrow" style={{ alignSelf: 'center' }}>catastrophe: {catPhase}</span>}
                {p2Course.topics.map((t) => (
                  <button key={t.index} className={p2Topic?.index === t.index ? 'on' : ''} onClick={() => setP2Topic(t)} title={t.kind.id}>
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <div className="legend">
          {mapMode
            ? null
            : isP2
            ? planet.courses.map((c) => (
                <div key={c.index}>
                  <span className="swatch" style={{ background: c.biome.ground, borderColor: c.biome.accent }} />
                  {c.code} {c.name} <em>{c.family} · {c.topics.length} topics</em>
                </div>
              ))
            : world.clusters.map((c) => (
                <div key={c.index}>
                  <span className="swatch" style={{ background: c.biome.ground, borderColor: c.biome.accent }} />
                  {c.name} <em>{c.biome.id}</em>
                </div>
              ))}
        </div>
      </div>

      {!mapMode && (
      <div className="panel bottom-left ledger">
        <div className="title">How the map fills in</div>
        <div>· concept touched (lecture read, pset attempted) → <b>sprout</b></div>
        <div>· concept demonstrated (graded item correct) → <b>landmark</b>, ground rises</div>
        <div>· pset finished → a <b>creature</b> appears in that topic's biome</div>
        <div>· click anything → where it came from</div>
      </div>
      )}

      {selection && (
        <div className="panel card">
          {selection.kind === 'concept' && (
            <>
              <div className="eyebrow">
                {isTopic(selection.concept.cluster) ? `${selection.concept.cluster.course.code} · ` : ''}
                {selection.concept.cluster.name}
              </div>
              <div className="title">{selection.concept.name}</div>
              <div>Evidence: {conceptState(selection.concept, progress) === 2 ? 'demonstrated (pset item graded correct)' : 'touched (lecture opened, practice attempted)'}</div>
              <div>Source: lecture notes {selection.concept.source}</div>
            </>
          )}
          {selection.kind === 'creature' && (
            <>
              <div className="eyebrow">
                {selection.course ? `${selection.course.code} · ` : ''}
                {selection.cluster.name}
              </div>
              <div className="title">Creature #{selection.index + 1}</div>
              <div>Arrived when pset {selection.index + 1} was finished.</div>
              <div>
                Lives in the {selection.cluster.biome.id} biome
                {isTopic(selection.cluster) ? `, ${selection.cluster.kind.id} sub-region` : ''}.
              </div>
            </>
          )}
          {selection.kind === 'cluster' && (
            <>
              <div className="eyebrow">{isTopic(selection.cluster) ? `topic of ${selection.cluster.course.code}` : 'topic cluster'}</div>
              <div className="title">{selection.cluster.name}</div>
              <div>Biome: {selection.cluster.biome.id}</div>
              {isTopic(selection.cluster) && (
                <div>
                  Terrain: {selection.cluster.kind.id} · {selection.cluster.spots.length} concepts
                </div>
              )}
            </>
          )}
          <button onClick={() => setSelection(null)}>close</button>
        </div>
      )}
    </div>
  )
}
