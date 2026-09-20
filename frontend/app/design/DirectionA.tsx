'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { COURSE, EVIDENCE, OTHER_COURSES, type DirectionProps } from './chrome-spec'
import { GOLDEN_RESIDENTS, progressState, type GoldenView } from '@/components/world/golden/golden-spec'
import type { CopyTreatment, DesignTheme } from './page'

/* WebGL only exists in the browser; the canvas mounts after hydration, as the rest of the site does. */
const WorldCanvas = dynamic(() => import('@/components/world/golden/WorldCanvas'), { ssr: false })

type Stage = ReturnType<typeof progressState>['stage']
type Evidence = (typeof EVIDENCE)[number]
type Resident = (typeof GOLDEN_RESIDENTS)[number]

/* The three evidence states, in the order they happen. progress values map through progressState. */
const STAGES: {
  stage: Stage
  progress: number
  label: string
  event: string
  effect: string
}[] = [
  {
    stage: 'touched',
    progress: 0.2,
    label: 'Touched',
    event: 'Lecture opened.',
    effect: 'A sprout appears where the idea landed.',
  },
  {
    stage: 'demonstrated',
    progress: 0.5,
    label: 'Demonstrated',
    event: 'Problem solved.',
    effect: 'A landmark stands on it. The ground rises.',
  },
  {
    stage: 'mastered',
    progress: 0.9,
    label: 'Mastered',
    event: 'Assessment confirmed.',
    effect: 'The beacon holds.',
  },
]

const STATE_NOTE: Record<Stage, string> = {
  touched: 'Opened, not yet worked. A sprout marks the spot.',
  demonstrated: 'Solved in the file named below. A landmark stands on it.',
  mastered: 'Confirmed by assessment. The beacon holds while this stays true.',
}

/* Each resident moved in with one piece of evidence; the bubble reads its page from here. */
const RESIDENT_EVIDENCE: Record<Resident['id'], number> = { pip: 0, mochi: 1, glyph: 2 }

const HERO_COPY: Record<CopyTreatment, { headline: string; body: string; action: string }> = {
  direct: {
    headline: 'Turn in a problem set. Someone moves in.',
    body: 'Your course work becomes a place you can inspect. Ideas sprout, landmarks rise, and every resident can name the page it came from.',
    action: 'Start your world',
  },
  world: {
    headline: 'Your course work, grown into a world.',
    body: 'Lecture notes shape the land. Solved problems light the observatory. The work you already do becomes somewhere you can return to.',
    action: 'Grow your world',
  },
  diagnostic: {
    headline: 'See what you know. Find what needs work.',
    body: 'One view connects your files, evidence, knowledge gaps, and study route. The island makes the pattern visible before the numbers explain it.',
    action: 'See your course',
  },
}

const WORLD_TREATMENT: Record<DesignTheme, { sky: string; lightScale: number }> = {
  graphite: { sky: '#d9dbde', lightScale: 0.9 },
  biome: { sky: '#dce5ee', lightScale: 1 },
  night: { sky: '#736c82', lightScale: 0.48 },
}

type DirectionAProps = DirectionProps & {
  theme: DesignTheme
  copy: CopyTreatment
}

/* True on the first mount per session for this key. Server render and hydration both answer
   false so the markup matches; the layout effect reads sessionStorage before the first paint
   and flips to true, which is when the cut starts. A double-invoked effect (StrictMode) finds
   the key already set and leaves the answer alone. */
function useOnce(key: string) {
  const [first, setFirst] = useState(false)
  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      /* storage unavailable; the cut simply plays again */
    }
    setFirst(true)
  }, [key])
  return first
}

/* ---------- Small parts ---------- */

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`a-eyebrow${className ? ` ${className}` : ''}`}>{children}</span>
}

function Chip({ state, large }: { state: Stage; large?: boolean }) {
  const label = STAGES.find((s) => s.stage === state)?.label ?? state
  return (
    <span className={`a-chip${large ? ' a-chip-lg' : ''}`} data-state={state}>
      {label}
    </span>
  )
}

function Counters({
  progress,
  size,
  residents = GOLDEN_RESIDENTS.length,
  className,
}: {
  progress: number
  size: 11 | 22
  residents?: number
  className?: string
}) {
  const s = progressState(progress)
  const items: [string, string][] = [
    ['Windows', `${s.litWindows}/5`],
    ['Crystals', `${s.crystalCount}/5`],
    ['Residents', `${residents}`],
  ]
  return (
    <dl className={`a-counters a-counters-${size}${className ? ` ${className}` : ''}`} aria-live="polite">
      {items.map(([k, v]) => (
        <div key={k} className="a-counter">
          <dt>{k}</dt>
          <dd key={v} className="a-rise">
            {v}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function StageControl({
  progress,
  setProgress,
  className,
}: {
  progress: number
  setProgress: (p: number) => void
  className?: string
}) {
  const current = progressState(progress).stage
  const index = STAGES.findIndex((s) => s.stage === current)
  return (
    <div
      className={`a-seg${className ? ` ${className}` : ''}`}
      role="radiogroup"
      aria-label="Evidence state shown in the world"
      style={{ '--i': index } as CSSProperties}
    >
      <span className="a-seg-thumb" aria-hidden="true" />
      {STAGES.map((s) => (
        <button
          key={s.stage}
          type="button"
          role="radio"
          aria-checked={s.stage === current}
          className="a-seg-item"
          onClick={() => setProgress(s.progress)}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

function NameTab({
  resident,
  onClick,
  pressed,
  as = 'button',
}: {
  resident: Resident
  onClick?: () => void
  pressed?: boolean
  as?: 'button' | 'span'
}) {
  const style = { '--tab-accent': resident.accent } as CSSProperties
  if (as === 'span') {
    return (
      <span className="a-tab" style={style}>
        {resident.name}
      </span>
    )
  }
  return (
    <button
      type="button"
      className="a-tab"
      style={style}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {resident.name}
    </button>
  )
}

function ResidentStrip({
  residents,
  onPick,
  active,
  label = 'Residents',
}: {
  residents: readonly Resident[]
  onPick?: (i: number) => void
  active?: number
  label?: string
}) {
  return (
    <div className="a-strip">
      <Eyebrow>{label}</Eyebrow>
      <div className="a-strip-tabs">
        {residents.map((r, i) => (
          <NameTab
            key={r.id}
            resident={r}
            pressed={active === i}
            onClick={onPick ? () => onPick(i) : undefined}
          />
        ))}
      </div>
    </div>
  )
}

function Tail() {
  return (
    <svg className="a-tail" width="24" height="12" viewBox="0 0 24 12" aria-hidden="true">
      <path d="M0 0 L12 12 L24 0 Z" className="a-tail-fill" />
      <path d="M0 0 L12 12 L24 0" className="a-tail-edge" />
    </svg>
  )
}

/* The signature: a resident names the page it came from. Tail direction is set by the layout
   through data-tail; the tail is the one shape allowed to cross into the window. */
function Bubble({
  resident,
  evidence,
  canOpen,
  onClose,
  closeLabel = 'Back to overview',
  autoFocus,
  delayMs = 0,
  className,
}: {
  resident: Resident
  evidence: Evidence
  canOpen: boolean
  onClose?: () => void
  closeLabel?: string
  autoFocus?: boolean
  delayMs?: number
  className?: string
}) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (autoFocus) ref.current?.focus()
  }, [autoFocus])
  const ref2 = `P.${evidence.page} · ${evidence.source}`
  return (
    <aside
      ref={ref}
      className={`a-bubble a-reveal${className ? ` ${className}` : ''}`}
      style={{ animationDelay: `${delayMs}ms` }}
      aria-label={`${resident.name} says`}
      tabIndex={-1}
    >
      <Tail />
      <NameTab resident={resident} as="span" />
      <p className="a-bubble-line">{resident.line}</p>
      <p className="a-bubble-ref">{ref2.toUpperCase()}</p>
      <div className="a-bubble-actions">
        {canOpen ? (
          <button type="button" className="a-btn a-btn-primary a-btn-sm">
            Open page {evidence.page}
          </button>
        ) : (
          <span className="a-bubble-note">The page is {COURSE.visitor}'s to open.</span>
        )}
        {onClose && (
          <button type="button" className="a-btn a-btn-text" onClick={onClose}>
            {closeLabel}
          </button>
        )}
      </div>
    </aside>
  )
}

/* The recessed lilac window. First paint per screen per session cuts it open (Aperture). */
function Window({
  progress,
  view,
  onResident,
  cut,
  theme,
  className,
}: {
  progress: number
  view: GoldenView
  onResident: () => void
  cut: boolean
  theme: DesignTheme
  className?: string
}) {
  const treatment = WORLD_TREATMENT[theme]
  return (
    <div className={`a-window${className ? ` ${className}` : ''}`}>
      <div className="a-window-stage" data-cut={cut}>
        <WorldCanvas
          progress={progress}
          view={view}
          onResidentFocus={onResident}
          skyColor={treatment.sky}
          lightScale={treatment.lightScale}
        />
      </div>
    </div>
  )
}

function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, onEscape])
}

/* ---------- Evidence sheet (B's lower screen, laid on the paper under the window) ---------- */

function EvidenceSheet({
  readOnly,
  owner,
}: {
  readOnly: boolean
  owner: string
}) {
  const [selected, setSelected] = useState(0)
  const row = EVIDENCE[selected]
  const counts = EVIDENCE.reduce<Record<string, number>>((acc, e) => {
    acc[e.state] = (acc[e.state] ?? 0) + 1
    return acc
  }, {})
  const summary = STAGES.map((s) => `${counts[s.stage] ?? 0} ${s.label.toLowerCase()}`).join(' · ')

  return (
    <section className="a-sheet" aria-labelledby="a-sheet-title">
      <header className="a-sheet-head">
        <h2 id="a-sheet-title" className="a-label">
          {readOnly ? `${owner}'s evidence` : 'Evidence'}
        </h2>
        <p className="a-muted">
          {EVIDENCE.length} concepts · {summary}
        </p>
      </header>

      <div className="a-sheet-body">
        <div className="a-table" role="listbox" aria-label="Concepts with evidence">
          <div className="a-row a-row-head" aria-hidden="true">
            <span>Concept</span>
            <span>State</span>
            <span>Source</span>
            <span className="a-row-page">Page</span>
          </div>
          {EVIDENCE.map((e, i) => (
            <div
              key={e.concept}
              role="option"
              aria-selected={i === selected}
              tabIndex={0}
              className="a-row"
              onClick={() => setSelected(i)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault()
                  setSelected(i)
                }
              }}
            >
              <span className="a-row-concept">{e.concept}</span>
              <span>
                <Chip state={e.state} />
              </span>
              <span className="a-row-source">{e.source}</span>
              <span className="a-row-page">
                {readOnly ? (
                  <span className="a-muted">p. {e.page}</span>
                ) : (
                  <button
                    type="button"
                    className="a-btn a-btn-text a-btn-xs"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      setSelected(i)
                    }}
                  >
                    Open page {e.page}
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>

        <aside className="a-pane" aria-live="polite">
          {readOnly ? (
            <>
              <Eyebrow>Visiting</Eyebrow>
              <h3 className="a-title">What you can do here</h3>
              <ul className="a-list">
                <li>Look around. The camera is yours.</li>
                <li>Click a resident. It will name its page.</li>
                <li>Read this list.</li>
              </ul>
              <Eyebrow>What stays with {owner}</Eyebrow>
              <ul className="a-list a-list-off">
                <li>Opening any page.</li>
                <li>Dropping a file.</li>
                <li>Changing anything at all.</li>
              </ul>
            </>
          ) : (
            <>
              <Eyebrow>Selected</Eyebrow>
              <h3 className="a-title">{row.concept}</h3>
              <div className="a-pane-state">
                <Chip state={row.state} large />
              </div>
              <p className="a-body">{STATE_NOTE[row.state]}</p>
              <dl className="a-facts">
                <div>
                  <dt>Source</dt>
                  <dd>{row.source}</dd>
                </div>
                <div>
                  <dt>Page</dt>
                  <dd>{row.page}</dd>
                </div>
              </dl>
              <button type="button" className="a-btn a-btn-primary a-btn-sm">
                Open page {row.page}
              </button>
            </>
          )}
        </aside>
      </div>
    </section>
  )
}

function DropZone() {
  const [over, setOver] = useState(false)
  return (
    <div
      className="a-drop"
      data-over={over}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
      }}
    >
      <svg className="a-drop-edge" aria-hidden="true">
        <rect x="0.5" y="0.5" rx="12" ry="12" />
      </svg>
      <span className="a-label">Drop a file anywhere</span>
      <span className="a-muted">Lecture, problem set, or exam feedback. PDF.</span>
    </div>
  )
}

/* ---------- Screens ---------- */

function Landing({ progress, setProgress, view, setView, theme, copy }: DirectionAProps) {
  const cut = useOnce('dir-a-cut-landing')
  const [speaking, setSpeaking] = useState(true)
  const pip = GOLDEN_RESIDENTS[0]
  const evidence = EVIDENCE[RESIDENT_EVIDENCE[pip.id]]
  const show = speaking || view === 'resident'
  const stage = progressState(progress).stage
  const words = HERO_COPY[copy]

  const close = () => {
    setSpeaking(false)
    setView('overview')
  }
  useEscape(show, close)

  return (
    <>
      <header className="a-bar a-bar-landing">
        <span className="a-wordmark">StudyGotchi</span>
        <nav className="a-bar-nav" aria-label="Site">
          <button type="button" className="a-btn a-btn-text">
            Visit a world
          </button>
          <button type="button" className="a-btn">
            Sign in
          </button>
        </nav>
      </header>

      <section className="a-hero">
        <div className="a-hero-copy">
          <Eyebrow>
            {COURSE.id} · {COURSE.topic}
          </Eyebrow>
          <h1 className="a-display">{words.headline}</h1>
          <p className="a-body a-hero-sub">{words.body}</p>
          <div className="a-hero-actions">
            <button type="button" className="a-btn a-btn-primary">
              {words.action}
            </button>
            <button type="button" className="a-btn a-btn-text">
              Visit a world
            </button>
          </div>
        </div>

        <Window
          className="a-hero-window"
          progress={progress}
          view={view}
          cut={cut}
          theme={theme}
          onResident={() => {
            setSpeaking(true)
            setView('resident')
          }}
        />

        <div className="a-hero-bubble">
          {show ? (
            <Bubble
              resident={pip}
              evidence={evidence}
              canOpen
              onClose={close}
              closeLabel={view === 'resident' ? 'Back to overview' : 'Close'}
              delayMs={cut ? 880 : 0}
            />
          ) : (
            <p className="a-muted a-hero-hint a-fade">Click a resident. It will name its page.</p>
          )}
        </div>
      </section>

      <section className="a-section a-states" aria-labelledby="a-states-title">
        <div className="a-section-head">
          <Eyebrow>How the map fills in</Eyebrow>
          <h2 id="a-states-title" className="a-title">
            Three states. Each one is a thing you did.
          </h2>
          <p className="a-muted">Pick one and the world above takes that state.</p>
        </div>
        <ol className="a-state-cards">
          {STAGES.map((s, i) => (
            <li key={s.stage}>
              <button
                type="button"
                className="a-card a-state-card"
                data-stage={s.stage}
                aria-pressed={s.stage === stage}
                onClick={() => setProgress(s.progress)}
              >
                <span className="a-state-num">{i + 1}</span>
                <Chip state={s.stage} large />
                <span className="a-state-event a-label">{s.event}</span>
                <span className="a-state-effect a-body">{s.effect}</span>
                <span className="a-state-fact a-eyebrow">
                  {progressState(s.progress).litWindows} of 5 windows lit ·{' '}
                  {progressState(s.progress).crystalCount} of 5 crystals
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="a-section a-visit-teaser" aria-labelledby="a-visit-title">
        <div className="a-section-head">
          <Eyebrow>Visiting</Eyebrow>
          <h2 id="a-visit-title" className="a-title">
            Classmates can look. They cannot touch.
          </h2>
        </div>
        <article className="a-postcard">
          <div className="a-postcard-message">
            <p className="a-label">
              {COURSE.visitor}'s Ice Observatory
            </p>
            <p className="a-body">
              {COURSE.id} · {COURSE.name}. Four residents, five windows lit. Every page in it stays
              with {COURSE.visitor}.
            </p>
            <p className="a-live-line a-muted">
              <span className="a-live-dot" aria-hidden="true" />
              {COURSE.visitor} is there now.
            </p>
          </div>
          <div className="a-postcard-address">
            <span className="a-eyebrow a-postmark">Read only · Visited 20 Sep</span>
            <span className="a-address-line" />
            <span className="a-address-line a-address-short" />
            <button type="button" className="a-btn">
              Visit a world
            </button>
          </div>
        </article>
      </section>

      <section className="a-section a-cta" aria-labelledby="a-cta-title">
        <h2 id="a-cta-title" className="a-title">
          Your world starts with a file.
        </h2>
        <p className="a-body">
          Drop a lecture, a problem set, or exam feedback. The first sprout comes from the first
          file.
        </p>
        <button type="button" className="a-btn a-btn-primary">
          Start your world
        </button>
      </section>

      <footer className="a-footer">
        <span className="a-eyebrow">StudyGotchi · 2026</span>
        <ul className="a-footer-courses">
          {OTHER_COURSES.map((c) => (
            <li key={c.id} className="a-eyebrow">
              {c.id} {c.name}
            </li>
          ))}
        </ul>
      </footer>
    </>
  )
}

function World({ progress, setProgress, view, setView, theme }: DirectionAProps) {
  const cut = useOnce('dir-a-cut-world')
  const [speaker, setSpeaker] = useState(0)
  const resident = GOLDEN_RESIDENTS[speaker]
  const evidence = EVIDENCE[RESIDENT_EVIDENCE[resident.id]]
  const open = view === 'resident'
  const close = () => setView('overview')
  useEscape(open, close)

  const pick = (i: number) => {
    setSpeaker(i)
    setView('resident')
  }

  return (
    <>
      <header className="a-bar a-bar-pinned">
        <div className="a-bar-lead">
          <button type="button" className="a-btn a-btn-text a-back">
            Courses
          </button>
          <Eyebrow className="a-bar-eyebrow">
            {COURSE.id} · {COURSE.topic}
          </Eyebrow>
        </div>
        <StageControl progress={progress} setProgress={setProgress} className="a-bar-seg" />
        <div className="a-bar-trail">
          <Counters progress={progress} size={22} className="a-bar-counters" />
          <button type="button" className="a-btn">
            Share
          </button>
        </div>
      </header>

      <div className="a-page">
        <div className="a-page-head">
          <h1 className="a-title">The Ice Observatory</h1>
          <p className="a-muted">
            {COURSE.student}'s world · {COURSE.name}
          </p>
        </div>

        <div className="a-world-grid">
          <Window
            className="a-world-window"
            progress={progress}
            view={view}
            cut={cut}
            theme={theme}
            onResident={() => pick(0)}
          />
          <div className="a-margin">
            <StageControl progress={progress} setProgress={setProgress} className="a-margin-seg" />
            {open && (
              <Bubble
                resident={resident}
                evidence={evidence}
                canOpen
                onClose={close}
                autoFocus
                className="a-margin-bubble"
              />
            )}
            <ResidentStrip residents={GOLDEN_RESIDENTS} onPick={pick} active={open ? speaker : -1} />
            <Counters progress={progress} size={22} className="a-margin-counters" />
            <DropZone />
          </div>
        </div>

        <EvidenceSheet readOnly={false} owner={COURSE.student} />
      </div>
    </>
  )
}

function Visit({ progress, view, setView, theme }: DirectionAProps) {
  const cut = useOnce('dir-a-cut-visit')
  const [speaker, setSpeaker] = useState(0)
  const resident = GOLDEN_RESIDENTS[speaker]
  const evidence = EVIDENCE[RESIDENT_EVIDENCE[resident.id]]
  const open = view === 'resident'
  const close = () => setView('overview')
  useEscape(open, close)
  const host = COURSE.visitor

  const pick = (i: number) => {
    setSpeaker(i)
    setView('resident')
  }

  return (
    <>
      <header className="a-bar a-bar-pinned">
        <div className="a-bar-lead">
          <button type="button" className="a-btn a-btn-text a-back">
            Back to your world
          </button>
          <Eyebrow className="a-bar-eyebrow">
            {host}'s world · {COURSE.id}
          </Eyebrow>
        </div>
        <span className="a-readonly a-label">Read only</span>
      </header>

      <div className="a-page a-page-visit">
        <div className="a-page-head">
          <h1 className="a-title">{host}'s Ice Observatory</h1>
          <p className="a-muted">You can look. Nothing here is yours to change.</p>
        </div>

        <Window
          className="a-visit-window"
          progress={progress}
          view={view}
          cut={cut}
          theme={theme}
          onResident={() => pick(0)}
        />

        {open && (
          <Bubble
            resident={resident}
            evidence={evidence}
            canOpen={false}
            onClose={close}
            autoFocus
            className="a-visit-bubble"
          />
        )}

        <div className="a-postmark-row">
          <div className="a-postmark-stack">
            <span className="a-eyebrow a-postmark">
              {host}'s Ice Observatory · {COURSE.id} · Visited 20 Sep
            </span>
            <Counters progress={progress} size={22} residents={4} />
          </div>
          <ResidentStrip
            residents={GOLDEN_RESIDENTS}
            onPick={pick}
            active={open ? speaker : -1}
            label={`${host}'s residents`}
          />
        </div>

        <EvidenceSheet readOnly owner={host} />
      </div>
    </>
  )
}

export function DirectionA(props: DirectionAProps) {
  const { screen } = props
  return (
    <main className="dir-a" data-screen={screen}>
      {screen === 'landing' && <Landing {...props} />}
      {screen === 'world' && <World {...props} />}
      {screen === 'visit' && <Visit {...props} />}
    </main>
  )
}
