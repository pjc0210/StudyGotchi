import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PLANET_R, buildPlanet, creatureCount, isTopic, type Course, type Topic } from '../lib/galaxy'
import { conceptState } from '../lib/world'
import { AssetsContext } from '../lib/assets'
import { preloadRoster } from '../components/GlbCreature'
import { courseFraction } from '../components/MapMarker'
import { Planet2Scene, type MapApi, type Planet2Level, type ScrollMode, type ScrollSource } from '../scenes/Planet2'
import { VIEWING_DEFAULTS, VIEWING_RANGES, setViewing, useViewing, viewing, viewingQuery, type Viewing } from '../lib/viewing'
import { playSfx, setLabScene, unlockAudio } from '../lib/audio'
import type { Selection } from '../App'
import './site.css'

/**
 * `?mode=site`: the world on a realistic product page (structure after frontend/components/layout:
 * 52 px top bar, 196 px section nav, content column, in the toy palette from the style bible). The
 * page scrolls; the canvas is sticky on the right and the scroll drives the level-1 orbit through
 * a window-scroll `ScrollSource`. Enter dives to level 2 full-bleed with Back in the top bar.
 */

const PARAMS = new URLSearchParams(window.location.search)
const NAV = ['World', 'Knowledge', 'Files', 'Gaps', 'Study Plan']

const LABELS: Record<keyof Viewing, string> = {
  ax: 'planet anchor x',
  ay: 'anchor y',
  dist: 'camera distance (R)',
  fov: 'FOV',
  pitch: 'pitch (°)',
  marker: 'marker scale',
  share: 'canvas width (%)',
}

function ProgressRing({ value, color }: { value: number; color: string }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <svg className="ring" viewBox="0 0 64 64" aria-label={`${Math.round(value * 100)}% demonstrated`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="#e9dce6" strokeWidth="7" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * value} ${c}`} transform="rotate(-90 32 32)" />
      <text x="32" y="36" textAnchor="middle" fontSize="13" fontWeight="800" fill="#3a2f45">
        {Math.round(value * 100)}%
      </text>
    </svg>
  )
}

function ViewingPanel({ onClose }: { onClose: () => void }) {
  const v = useViewing()
  const [copied, setCopied] = useState(false)
  return (
    <div className="viewing sticker">
      <div className="viewing-head">
        <b>Viewing</b>
        <span className="muted">press v to hide</span>
        <button className="ghost" onClick={onClose} aria-label="close">
          ×
        </button>
      </div>
      {(Object.keys(VIEWING_RANGES) as (keyof Viewing)[]).map((k) => {
        const [min, max, step] = VIEWING_RANGES[k]
        return (
          <label key={k}>
            <span>
              {LABELS[k]} <em>{Math.round(v[k] * 100) / 100}</em>
            </span>
            <input type="range" min={min} max={max} step={step} value={v[k]} onChange={(e) => setViewing({ [k]: parseFloat(e.target.value) } as Partial<Viewing>)} />
          </label>
        )
      })}
      <div className="row">
        <button
          className="primary"
          onClick={() => {
            const q = window.location.origin + window.location.pathname + viewingQuery()
            navigator.clipboard?.writeText(q).catch(() => {})
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1400)
          }}
        >
          {copied ? 'copied' : 'copy settings'}
        </button>
        <button onClick={() => setViewing(VIEWING_DEFAULTS)}>reset</button>
      </div>
      <code className="query">{viewingQuery()}</code>
    </div>
  )
}

export function SitePage() {
  const seed = PARAMS.get('seed') ?? 'philote/6.1210'
  const planet = useMemo(() => buildPlanet(seed), [seed])
  const progress = useMemo(() => {
    const p = parseFloat(PARAMS.get('progress') ?? '')
    return Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0.62
  }, [])
  const [selection, setSelection] = useState<Selection | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [level, setLevel] = useState<Planet2Level>('planet')
  const [stop, setStop] = useState(0)
  const [showViewing, setShowViewing] = useState(PARAMS.get('v') === '1')
  const scrollMode: ScrollMode = PARAMS.get('scroll') === 'continuous' ? 'continuous' : 'stops'
  const mapApi = useRef<MapApi | null>(null)
  const canvasBox = useRef<HTMLDivElement>(null)
  const v = useViewing()
  const N = planet.courses.length

  useEffect(() => {
    viewing.active = true
    preloadRoster()
    return () => {
      viewing.active = false
      viewing.paneAx = undefined
      viewing.paneAy = undefined
    }
  }, [])

  useEffect(() => {
    if (level === 'biome' && course) setLabScene('biome', course.family, false)
    else setLabScene('planet', null, false)
  }, [level, course])

  // the panel's anchors are viewport fractions (world bible: disc centre at 72% of the viewport width);
  // the scene needs them as fractions of the canvas pane, which is flush right (or a top band on phones)
  useEffect(() => {
    const update = () => {
      const box = canvasBox.current?.getBoundingClientRect()
      if (!box || box.width < 1 || box.height < 1) return
      if (window.innerWidth < 900) {
        // phone: the canvas is a full-width top band, so the disc is simply centred in it
        viewing.paneAx = 0.5
        viewing.paneAy = 0.5
        return
      }
      viewing.paneAx = (v.ax * window.innerWidth - box.left) / box.width
      viewing.paneAy = (v.ay * window.innerHeight - box.top) / box.height
    }
    update()
    window.addEventListener('resize', update)
    const t = window.setTimeout(update, 300)
    return () => {
      window.removeEventListener('resize', update)
      window.clearTimeout(t)
    }
  }, [v.ax, v.ay, v.share, level])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'v' && !(e.target instanceof HTMLInputElement)) setShowViewing((s) => !s)
      if (e.key === 'Escape' && course) setCourse(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [course])

  // the page's sections are the scroll stops: hero = home pose, then one 100 vh section per course
  const source = useMemo<ScrollSource>(
    () => ({
      top: () => window.scrollY,
      span: () => window.innerHeight * N,
      scrollTo: (top, smooth) => window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' }),
      get el() {
        return canvasBox.current ?? document.body
      },
      onScroll: (fn) => {
        window.addEventListener('scroll', fn, { passive: true })
        return () => window.removeEventListener('scroll', fn)
      },
    }),
    [N],
  )

  const select = (s: Selection | null) => {
    if (s?.kind === 'course') {
      setCourse(s.course)
      setTopic(null)
      setSelection(null)
      return
    }
    setSelection(s)
    if (s?.kind === 'cluster' && isTopic(s.cluster)) setTopic(s.cluster)
  }
  const enter = (c: Course) => {
    unlockAudio()
    playSfx('camera-dive')
    setCourse(c)
    setTopic(null)
    setSelection(null)
  }
  const back = () => {
    playSfx('camera-rise')
    setCourse(null)
    setTopic(null)
    setSelection(null)
  }

  const inWorld = level !== 'planet'
  const active = planet.courses[stop]
  const assets = useMemo(() => ({ creatures: 'glb' as const, landmarks: 'glb' as const, seed, progress, crowd: 1 }), [seed, progress])
  const canvasStyle = { ['--share' as string]: `${v.share}%` } as React.CSSProperties

  return (
    <div className={'site' + (inWorld ? ' in-world' : '')} style={canvasStyle}>
      <header className="topbar">
        <div className="brand">
          <span className="mark" aria-hidden>
            S
          </span>
          <span>StudyGotchi</span>
        </div>
        <span className="divider" aria-hidden />
        <span className="course-name">{active ? `${active.code} ${active.name}` : 'Your courses'}</span>
        <nav className="nav" aria-label="Sections">
          {NAV.map((n, i) => (
            <a key={n} className={i === 0 ? 'on' : ''} href="#">
              {n}
            </a>
          ))}
        </nav>
        {inWorld ? (
          <button className="primary" onClick={back}>
            ← Back to planet
          </button>
        ) : (
          <>
            <div className="search">
              <input placeholder="Search concepts" aria-label="Search concepts" readOnly />
              <kbd>⌘K</kbd>
            </div>
            <button className="primary">Upload Files</button>
          </>
        )}
      </header>

      <div className="body">
        <nav className="sidebar" aria-label="Sections">
          {NAV.map((n, i) => (
            <a key={n} className={i === 0 ? 'on' : ''} href="#">
              <span className="dot" aria-hidden />
              {n}
            </a>
          ))}
          <p className="muted small">Your personal graph, not the syllabus.</p>
        </nav>

        <main className="column">
          <section className="hero">
            <p className="eyebrow">Your world</p>
            <h1>Your notes become a world.</h1>
            <p className="sub">Every course is a biome; every graded idea builds something on it.</p>
            <div className="row">
              <button className="primary big" onClick={() => enter(planet.courses[0])}>
                Enter {planet.courses[0].code}
              </button>
              <button className="big" onClick={() => mapApi.current?.scrollTo(0)}>
                Tour the courses ↓
              </button>
            </div>
          </section>

          {planet.courses.map((c, i) => {
            const frac = courseFraction(c, progress)
            const n = creatureCount(c, progress)
            const spots = c.topics.flatMap((t) => t.spots)
            const last = [...spots].filter((s) => conceptState(s, progress) === 2).sort((a, b) => b.buildAt - a.buildAt)[0]
            return (
              <section key={c.index} className={'course' + (i === stop ? ' active' : '')} id={`course-${c.code}`}>
                <article className="card sticker">
                  <header>
                    <span className="swatch" style={{ background: c.biome.ground, borderColor: c.biome.accent }} />
                    <div>
                      <p className="eyebrow">
                        {c.code} · {c.biome.id} biome
                      </p>
                      <h2>{c.name}</h2>
                    </div>
                    <ProgressRing value={frac} color={c.biome.accent} />
                  </header>
                  <p className="body-text">
                    {c.topics.length} topics · {spots.length} concepts · {n} creature{n === 1 ? '' : 's'} living here
                  </p>
                  <p className="evidence muted">Last evidence: {last ? `${last.name} graded correct (${last.source})` : 'nothing graded yet'}</p>
                  <div className="row">
                    <button className="primary" onClick={() => enter(c)}>
                      Enter {c.code}
                    </button>
                    <button onClick={() => mapApi.current?.scrollTo(i)}>Face it</button>
                  </div>
                </article>
              </section>
            )
          })}

          <footer className="footer">
            <span>StudyGotchi · world-lab site page</span>
            <span className="muted">Scroll to tour the planet · press v for viewing controls</span>
          </footer>
        </main>

        <div className="canvas-box" ref={canvasBox}>
          <Canvas camera={{ position: [0, 2.2 * PLANET_R, 6.0 * PLANET_R], fov: viewing.fov }} dpr={[1, 2]}>
            <AssetsContext value={assets}>
              <Suspense fallback={null}>
                <Planet2Scene
                  planet={planet}
                  progress={progress}
                  variant="continuous"
                  focusCourse={course}
                  focusTopic={topic}
                  selection={selection}
                  onSelect={select}
                  onLevel={setLevel}
                  onFade={() => {}}
                  scrollMode={scrollMode}
                  onStop={setStop}
                  mapApi={mapApi}
                  scrollSource={source}
                />
              </Suspense>
            </AssetsContext>
          </Canvas>
          {inWorld && course && (
            <div className="topics sticker">
              <button className={!topic ? 'on' : ''} onClick={() => setTopic(null)}>
                whole biome
              </button>
              {course.topics.map((t) => (
                <button key={t.index} className={topic?.index === t.index ? 'on' : ''} onClick={() => setTopic(t)}>
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showViewing && <ViewingPanel onClose={() => setShowViewing(false)} />}
    </div>
  )
}
