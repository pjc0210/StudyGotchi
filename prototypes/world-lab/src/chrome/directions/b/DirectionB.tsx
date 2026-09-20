import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { COURSE, EVIDENCE, OTHER_COURSES, type DirectionProps } from '../../chrome-spec'
import { WorldCanvas } from '../../WorldCanvas'
import { GOLDEN_PALETTE, GOLDEN_RESIDENTS, progressState } from '../../../golden/golden-spec'
import './b.css'

type Stage = ReturnType<typeof progressState>['stage']
type SheetTab = 'evidence' | 'landmarks' | 'residents'
type LandingTab = 'grows' | 'worlds'
type Subject = { kind: 'evidence'; index: number } | { kind: 'resident'; index: number }

const STAGES: Stage[] = ['touched', 'demonstrated', 'mastered']
const STAGE_PROGRESS: Record<Stage, number> = { touched: 0.2, demonstrated: 0.5, mastered: 0.9 }
const STAGE_LABEL: Record<Stage, string> = {
  touched: 'Touched',
  demonstrated: 'Demonstrated',
  mastered: 'Mastered',
}
const STAGE_STORY: Record<Stage, string> = {
  touched: 'A sprout appears where the concept was first met.',
  demonstrated: 'The sprout becomes a landmark and the ground rises.',
  mastered: 'The landmark lights, and a finished problem set brings a resident.',
}
const STAGE_RECEIPT: Record<Stage, string> = {
  touched: 'A sprout marks where this was first met.',
  demonstrated: 'The sprout became a landmark and the ground rose.',
  mastered: 'The landmark is lit, and a finished problem set brought someone to live here.',
}
const BEACON_LINE: Record<Stage, string> = {
  touched: 'The beacon is dark.',
  demonstrated: 'The beacon glows.',
  mastered: 'The beacon is lit.',
}

const TOPICS = [
  { name: COURSE.topic, count: EVIDENCE.length },
  { name: 'Hashing', count: 0 },
  { name: 'Graphs', count: 0 },
  { name: 'Dynamic programming', count: 0 },
]

const SHEET_TABS: { value: SheetTab; label: string }[] = [
  { value: 'evidence', label: 'Evidence' },
  { value: 'landmarks', label: 'Landmarks' },
  { value: 'residents', label: 'Residents' },
]

const LANDING_TABS: { value: LandingTab; label: string }[] = [
  { value: 'grows', label: 'How it grows' },
  { value: 'worlds', label: 'Worlds to visit' },
]

const OPENED_KEY = 'dir-b-opened'
const NARROW = '(max-width: 640px)'

/* At 390 the hinge keeps the beacon, the course code, and two tabs, as the plan draws it. */
function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches)
  useEffect(() => {
    const mq = window.matchMedia(NARROW)
    const onChange = () => setNarrow(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return narrow
}

/* Segmented control with one thumb that settles on the spring. Equal cells, so the thumb
   is a fraction of the track and only transform moves. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  const style = { '--n': options.length, '--i': index } as CSSProperties
  return (
    <div className={`b-seg ${className ?? ''}`} role="group" aria-label={label} style={style}>
      <span className="b-seg-thumb" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Badge({ stage }: { stage: Stage }) {
  return (
    <span className="b-badge" data-stage={stage}>
      {STAGE_LABEL[stage]}
    </span>
  )
}

function Beacon({ strength }: { strength: number }) {
  const level = strength >= 1 ? 'full' : strength > 0 ? 'part' : 'off'
  return <span className="b-beacon" data-level={level} aria-hidden="true" />
}

/* The lab shell hides overflow on the document, so the page itself is the scroller. The hinge is
   the only sticky element; it is pinned once the world has scrolled out. */
function usePinned(scroller: RefObject<HTMLElement | null>, hinge: RefObject<HTMLElement | null>) {
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    const root = scroller.current
    if (!root) return
    const onScroll = () => {
      const el = hinge.current
      if (!el) return
      const top = root.getBoundingClientRect().top
      setPinned(root.scrollTop > 0 && el.getBoundingClientRect().top <= top + 0.5)
    }
    onScroll()
    root.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      root.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [scroller, hinge])
  return pinned
}

export function DirectionB({ screen, progress, setProgress, view, setView }: DirectionProps) {
  const state = progressState(progress)
  const mainRef = useRef<HTMLElement>(null)
  const hingeRef = useRef<HTMLDivElement>(null)
  const worldsRef = useRef<HTMLElement>(null)
  const growsRef = useRef<HTMLElement>(null)
  const pinned = usePinned(mainRef, hingeRef)
  const narrow = useNarrow()
  const scrollToTop = () => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })

  const [tab, setTab] = useState<SheetTab>('evidence')
  const [landingTab, setLandingTab] = useState<LandingTab>('grows')
  const [topic, setTopic] = useState(0)
  const [subject, setSubject] = useState<Subject>({ kind: 'evidence', index: 0 })
  const [detailOpen, setDetailOpen] = useState(false)
  const [coursesOpen, setCoursesOpen] = useState(false)

  /* Aperture with one blade: runs once per session on the student's own world only. */
  const [opening, setOpening] = useState(() => {
    if (screen !== 'world') return false
    try {
      return !window.sessionStorage.getItem(OPENED_KEY)
    } catch {
      return false
    }
  })
  useEffect(() => {
    if (!opening) return
    try {
      window.sessionStorage.setItem(OPENED_KEY, '1')
    } catch {
      /* private mode: the moment simply plays again next time */
    }
    const t = window.setTimeout(() => setOpening(false), 720)
    return () => window.clearTimeout(t)
  }, [opening])

  /* A click on a resident in the canvas arrives as a view change; the sheet follows it. */
  const [seenView, setSeenView] = useState(view)
  if (view !== seenView) {
    setSeenView(view)
    if (view === 'resident') {
      setSubject({ kind: 'resident', index: 0 })
      setDetailOpen(true)
    }
  }

  useEffect(() => {
    const root = mainRef.current
    if (screen !== 'landing' || !root) return
    const onScroll = () => {
      const w = worldsRef.current
      if (!w) return
      setLandingTab(w.getBoundingClientRect().top < window.innerHeight * 0.45 ? 'worlds' : 'grows')
    }
    onScroll()
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => root.removeEventListener('scroll', onScroll)
  }, [screen])

  useEffect(() => {
    if (!coursesOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCoursesOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [coursesOpen])

  const readOnly = screen === 'visit'
  const residents = GOLDEN_RESIDENTS.length
  const counters = `Windows ${state.litWindows}/5 · Crystals ${state.crystalCount}/5 · Residents ${residents}`
  const eyebrow = readOnly
    ? narrow
      ? `${COURSE.visitor}'s ${COURSE.id}`
      : `Visiting · ${COURSE.visitor}'s ${COURSE.id}`
    : narrow
      ? COURSE.id
      : `${COURSE.id} · ${COURSE.topic}`
  const sheetTabs = narrow ? SHEET_TABS.filter((t) => t.value !== 'landmarks') : SHEET_TABS
  const activeTab: SheetTab = narrow && tab === 'landmarks' ? 'evidence' : tab

  const jumpTo = (t: LandingTab) => {
    setLandingTab(t)
    const target = t === 'worlds' ? worldsRef.current : growsRef.current
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const rows = EVIDENCE.map((e, index) => ({ ...e, index })).filter((e) =>
    activeTab === 'landmarks' ? e.state !== 'touched' : true,
  )

  const pickEvidence = (index: number) => {
    setSubject({ kind: 'evidence', index })
    setDetailOpen(true)
  }
  const pickResident = (index: number) => {
    setSubject({ kind: 'resident', index })
    setDetailOpen(true)
    if (index === 0) setView('resident')
  }
  const backToOverview = () => {
    setView('overview')
    setSubject({ kind: 'evidence', index: 0 })
    setDetailOpen(false)
  }

  return (
    <main className="dir-b" ref={mainRef} data-screen={screen} data-pinned={pinned || undefined}>
      <header className="b-header">
        <span className="b-wordmark">StudyGotchi</span>
        <span className="b-grow" />
        {screen === 'landing' && (
          <button type="button" className="b-text">
            Sign in
          </button>
        )}
        {screen === 'world' && (
          <>
            <button type="button" className="b-text">
              Share world
            </button>
            <span className="b-avatar" aria-label={COURSE.student}>
              {COURSE.student[0]}
            </span>
          </>
        )}
        {screen === 'visit' && (
          <button type="button" className="b-primary b-h28">
            Start your world
          </button>
        )}
      </header>

      <section className="b-upper" aria-label="The world" data-opening={opening || undefined}>
        <div className="b-world">
          <WorldCanvas
            progress={progress}
            view={view}
            onResidentFocus={() => setView('resident')}
            clear={GOLDEN_PALETTE.sky}
          />
        </div>
        {opening && <div className="b-blade" aria-hidden="true" />}
      </section>

      <div className="b-hinge" ref={hingeRef}>
        <div className="b-hinge-lead">
          <button type="button" className="b-chip b-back" onClick={scrollToTop}>
            Back to world
          </button>
          <span className="b-hinge-wordmark">StudyGotchi</span>
          {screen === 'world' ? (
            <button
              type="button"
              className="b-eyebrow b-eyebrow-button"
              onClick={() => setCoursesOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={coursesOpen}
            >
              <Beacon strength={state.beaconStrength} />
              <span className="b-mono">{eyebrow}</span>
            </button>
          ) : (
            <span className="b-eyebrow">
              <Beacon strength={state.beaconStrength} />
              <span className="b-mono">{eyebrow}</span>
            </span>
          )}
        </div>
        <div className="b-hinge-tabs">
          {screen === 'landing' ? (
            <Segmented options={LANDING_TABS} value={landingTab} onChange={jumpTo} label="Sheet sections" />
          ) : (
            <Segmented options={sheetTabs} value={activeTab} onChange={setTab} label="What the sheet shows" />
          )}
        </div>
        <div className="b-hinge-trail">
          {view === 'resident' && (
            <button type="button" className="b-chip" onClick={backToOverview}>
              Overview
            </button>
          )}
          {screen === 'landing' ? (
            <span className="b-mono b-hinge-stage">{STAGE_LABEL[state.stage]}</span>
          ) : (
            <span className="b-mono b-counters" key={counters}>
              {counters}
            </span>
          )}
        </div>
      </div>

      {screen === 'landing' ? (
        <section className="b-sheet b-sheet-landing">
          <div className="b-sheet-firstrow b-mono">{STAGE_LABEL[state.stage]}</div>
          <div className="b-hero">
            <div className="b-thesis">
              <h1 className="b-display">Every landmark up there was a problem set once.</h1>
              <p className="b-body">
                Drop lecture PDFs, problem sets, and exam feedback. What you demonstrate becomes a
                place. What you finish brings someone to live there. Click anything to see the page
                that earned it.
              </p>
              <button type="button" className="b-primary b-h36">
                Start your world
              </button>
            </div>
            <section className="b-grows" ref={growsRef} aria-labelledby="b-grows-title">
              <h2 className="b-title" id="b-grows-title">
                How a world grows
              </h2>
              <ol className="b-steps">
                {STAGES.map((s, i) => (
                  <li key={s}>
                    <button
                      type="button"
                      className="b-step"
                      aria-pressed={state.stage === s}
                      onClick={() => setProgress(STAGE_PROGRESS[s])}
                    >
                      <span className="b-mono b-step-n">{i + 1}</span>
                      <Badge stage={s} />
                      <span className="b-body b-step-text">{STAGE_STORY[s]}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <p className="b-ui b-dim b-step-hint">Press a step. The world above follows it.</p>
            </section>
          </div>
          <section className="b-worlds" ref={worldsRef} aria-labelledby="b-worlds-title">
            <h2 className="b-h2" id="b-worlds-title">
              Worlds you can visit
            </h2>
            <div className="b-tiles">
              {OTHER_COURSES.map((c) => (
                <CourseTile key={c.id} course={c} shown={c.id === COURSE.id} />
              ))}
            </div>
          </section>
        </section>
      ) : (
        <section className="b-sheet b-sheet-work">
          <div className="b-sheet-firstrow b-mono">{counters}</div>
          <div className="b-work">
            <nav className="b-topics" aria-label="Topics">
              <span className="b-mono b-col-head">Topics</span>
              <div className="b-topic-list">
                {TOPICS.map((t, i) => (
                  <button
                    key={t.name}
                    type="button"
                    className="b-tile b-topic"
                    aria-pressed={i === topic}
                    onClick={() => setTopic(i)}
                  >
                    <span className="b-ui">{t.name}</span>
                    <span className="b-mono">{t.count ? `${t.count} concepts` : 'No files yet'}</span>
                  </button>
                ))}
                {!readOnly && (
                  <button
                    type="button"
                    className="b-tile b-tile-add"
                    onClick={() => setCoursesOpen(true)}
                  >
                    <span className="b-ui">Add a course</span>
                  </button>
                )}
              </div>
            </nav>

            <div className="b-main motion-view-enter" key={`${activeTab}-${topic}`}>
              {TOPICS[topic].count === 0 ? (
                <div className="b-empty">
                  <p className="b-title">No files yet, so no ground yet.</p>
                  <p className="b-body b-dim">
                    Drop a lecture PDF or a problem set. The first concept you touch becomes a
                    sprout.
                  </p>
                </div>
              ) : activeTab === 'residents' ? (
                <div className="b-table b-table-residents">
                  <div className="b-thead b-mono">
                    <span>Resident</span>
                    <span>Says</span>
                  </div>
                  {GOLDEN_RESIDENTS.map((r, i) => (
                    <button
                      key={r.id}
                      type="button"
                      className="b-row b-row-resident"
                      aria-pressed={subject.kind === 'resident' && subject.index === i}
                      onClick={() => pickResident(i)}
                    >
                      <span className="b-cell-name">
                        <span className="b-swatch" style={{ background: r.accent }} aria-hidden="true" />
                        {r.name}
                      </span>
                      <span className="b-dim b-cell-line">{r.line}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="b-table">
                  <div className="b-thead b-mono">
                    <span>Concept</span>
                    <span>State</span>
                    <span>Source</span>
                    <span>Page</span>
                  </div>
                  {rows.map((r) => (
                    <button
                      key={r.concept}
                      type="button"
                      className="b-row"
                      aria-pressed={subject.kind === 'evidence' && subject.index === r.index}
                      onClick={() => pickEvidence(r.index)}
                    >
                      <span className="b-cell-concept">{r.concept}</span>
                      <Badge stage={r.state} />
                      <span className="b-dim b-cell-source">{r.source}</span>
                      <span className="b-mono b-cell-page">p.{r.page}</span>
                      <span className="b-dim b-row-sub">
                        {STAGE_LABEL[r.state]} · {r.source}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {readOnly ? (
                <p className="b-note b-body b-dim">
                  {COURSE.visitor}'s world is read-only. Open any page; nothing here can change.
                </p>
              ) : (
                <div className="b-drop">
                  <div className="b-drop-zone">
                    <span className="b-ui">Drop files here.</span>
                    <span className="b-ui b-dim">Lecture PDFs, problem sets, exam feedback.</span>
                  </div>
                  <div className="b-stage">
                    <span className="b-mono">Preview a stage</span>
                    <Segmented
                      options={STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }))}
                      value={state.stage}
                      onChange={(s) => setProgress(STAGE_PROGRESS[s])}
                      label="Preview a stage"
                    />
                  </div>
                  <p className="b-status b-ui motion-rise" key={state.stage}>
                    {state.litWindows} of 5 windows lit. {state.crystalCount} of 5 crystals shown.{' '}
                    {BEACON_LINE[state.stage]}
                  </p>
                </div>
              )}
            </div>

            <aside className="b-detail" data-open={detailOpen || undefined} aria-label="Detail">
              <div className="b-card motion-reveal" key={`${subject.kind}-${subject.index}`}>
                <button
                  type="button"
                  className="b-chip b-card-close"
                  onClick={() => setDetailOpen(false)}
                >
                  Close
                </button>
                {subject.kind === 'resident' ? (
                  <ResidentDetail index={subject.index} onBack={backToOverview} />
                ) : (
                  <EvidenceDetail
                    index={subject.index}
                    readOnly={readOnly}
                    onShow={() => pickResident(0)}
                  />
                )}
              </div>
            </aside>
          </div>

          {coursesOpen && (
            <div className="b-overlay" role="dialog" aria-modal="true" aria-label="Your courses">
              <button
                type="button"
                className="b-overlay-scrim"
                aria-label="Close"
                onClick={() => setCoursesOpen(false)}
              />
              <div className="b-overlay-panel motion-reveal">
                <div className="b-overlay-head">
                  <h2 className="b-title">Your courses</h2>
                  <button type="button" className="b-chip" onClick={() => setCoursesOpen(false)}>
                    Close
                  </button>
                </div>
                <div className="b-tiles">
                  {OTHER_COURSES.map((c) => (
                    <CourseTile
                      key={c.id}
                      course={c}
                      shown={c.id === COURSE.id}
                      onPick={() => setCoursesOpen(false)}
                    />
                  ))}
                  <button type="button" className="b-tile b-course b-tile-add">
                    <span className="b-ui">Add a course</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  )
}

function CourseTile({
  course,
  shown,
  onPick,
}: {
  course: (typeof OTHER_COURSES)[number]
  shown: boolean
  onPick?: () => void
}) {
  const s = progressState(course.progress)
  return (
    <button
      type="button"
      className="b-tile b-course"
      aria-current={shown ? 'true' : undefined}
      onClick={onPick}
    >
      <span className="b-mono">
        {course.biome} · {course.id}
      </span>
      <span className="b-title b-course-name">{course.name}</span>
      <span className="b-course-foot">
        <span className="b-windows" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <i key={i} data-lit={i < s.litWindows || undefined} data-stage={s.stage} />
          ))}
        </span>
        <span className="b-mono">{shown ? 'Shown above' : STAGE_LABEL[s.stage]}</span>
      </span>
    </button>
  )
}

function EvidenceDetail({
  index,
  readOnly,
  onShow,
}: {
  index: number
  readOnly: boolean
  onShow: () => void
}) {
  const e = EVIDENCE[index]
  return (
    <>
      <span className="b-mono">
        {COURSE.topic} · p.{e.page}
      </span>
      <h3 className="b-title">{e.concept}</h3>
      <Badge stage={e.state} />
      <p className="b-body">
        {e.source}, page {e.page}. {STAGE_RECEIPT[e.state]}
      </p>
      <div className="b-actions">
        <button type="button" className="b-primary b-h32">
          Open page {e.page}
        </button>
        {!readOnly && e.state === 'mastered' && (
          <button type="button" className="b-secondary b-h32" onClick={onShow}>
            Show in world
          </button>
        )}
      </div>
    </>
  )
}

/* A resident speaks rather than tabulates: the name sits on a tab at the card's top edge and
   the line reads under it. Species is never shown. */
function ResidentDetail({ index, onBack }: { index: number; onBack: () => void }) {
  const r = GOLDEN_RESIDENTS[index]
  const home = EVIDENCE[0]
  return (
    <>
      <span className="b-name-tab">
        <span className="b-swatch" style={{ background: r.accent }} aria-hidden="true" />
        {r.name}
      </span>
      <p className="b-line">{r.line}</p>
      <span className="b-mono">
        Lives at · {home.concept}
      </span>
      <p className="b-body b-dim">
        {home.source}, page {home.page}, brought {r.name} here.
      </p>
      <div className="b-actions">
        <button type="button" className="b-primary b-h32">
          Open page {home.page}
        </button>
        <button type="button" className="b-secondary b-h32" onClick={onBack}>
          Back to overview
        </button>
      </div>
    </>
  )
}
