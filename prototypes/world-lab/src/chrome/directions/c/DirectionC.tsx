import type { CSSProperties, ReactNode } from 'react'
import { COURSE, EVIDENCE, OTHER_COURSES, type DirectionProps } from '../../chrome-spec'
import { GOLDEN_RESIDENTS, progressState, type GoldenView } from '../../../golden/golden-spec'
import { WorldCanvas } from '../../WorldCanvas'
import './c.css'

type Stage = 'touched' | 'demonstrated' | 'mastered'

const STAGE_LABEL: Record<Stage, string> = {
  touched: 'Touched',
  demonstrated: 'Demonstrated',
  mastered: 'Mastered',
}

const STAGE_PROGRESS: Record<Stage, number> = { touched: 0.2, demonstrated: 0.5, mastered: 0.9 }
const STAGES: Stage[] = ['touched', 'demonstrated', 'mastered']

const WORLD_HREF = '?mode=chrome&dir=c&screen=world'
const LANDING_HREF = '?mode=chrome&dir=c&screen=landing'
const VISIT_HREF = '?mode=chrome&dir=c&screen=visit'

/* ---------- atoms ---------- */

interface Segment {
  label: string
  href?: string
}

/** The stamp: label, breadcrumb and citation at once. Segments narrow left to right. */
function Stamp({
  segments,
  back,
  className,
}: {
  segments: Segment[]
  back?: string
  className?: string
}) {
  return (
    <p className={`c-stamp${className ? ` ${className}` : ''}`}>
      {back && (
        <a className="c-stamp-back" href={back} aria-label="Back">
          {'<'}
        </a>
      )}
      {segments.map((s, i) => (
        <span key={`${s.label}-${i}`} className="c-stamp-seg">
          {i > 0 && <span className="c-stamp-dot">·</span>}
          {s.href ? (
            <a className="c-stamp-link" href={s.href}>
              {s.label}
            </a>
          ) : (
            s.label
          )}
        </span>
      ))}
    </p>
  )
}

/** One sticker, progressively inked: outline, coral, solid ink. */
function Sticker({
  stage,
  pressed,
  dim,
  onClick,
  pop,
}: {
  stage: Stage
  pressed?: boolean
  dim?: boolean
  onClick?: () => void
  pop?: boolean
}) {
  const cls = `c-sticker${dim ? ' is-dim' : ''}${pop ? ' c-pop' : ''}`
  if (onClick) {
    return (
      <button type="button" className={cls} data-stage={stage} aria-pressed={pressed} onClick={onClick}>
        {STAGE_LABEL[stage]}
      </button>
    )
  }
  return (
    <span className={cls} data-stage={stage}>
      {STAGE_LABEL[stage]}
    </span>
  )
}

/** The one primary per screen. Ink face on an ink-20 ledge; only transform moves on press. */
function Primary({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <button type="button" className={`c-primary${wide ? ' is-wide' : ''}`}>
      <span className="c-primary-face">{children}</span>
    </button>
  )
}

function Secondary({
  children,
  onClick,
  small,
  href,
}: {
  children: ReactNode
  onClick?: () => void
  small?: boolean
  href?: string
}) {
  const cls = `c-secondary${small ? ' is-small' : ''}`
  if (href) {
    return (
      <a className={cls} href={href}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  )
}

const GLYPHS = {
  sprout: ['...#...', '.#.#.#.', '.#####.', '..###..', '...#...', '...#...', '#######'],
  tower: ['...#...', '..###..', '.#####.', '..#.#..', '..###..', '..#.#..', '.#####.'],
  bird: ['..###..', '.##.##.', '.######', '.#####.', '.#####.', '..###..', '.#...#.'],
  blob: ['.......', '..###..', '.#####.', '##.#.##', '#######', '.#####.', '.......'],
  beetle: ['#.....#', '.#####.', '##.#.##', '#######', '##.#.##', '.#####.', '#.....#'],
} as const

type GlyphKind = keyof typeof GLYPHS

/** A 7 by 7 ink pixel glyph at 4 px per pixel, the same grid as the world's pixel pass. */
function Glyph({ kind, className }: { kind: GlyphKind; className?: string }) {
  const rows = GLYPHS[kind]
  return (
    <svg
      className={`c-glyph${className ? ` ${className}` : ''}`}
      viewBox="0 0 7 7"
      width={28}
      height={28}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rows.flatMap((row, y) =>
        row.split('').map((cell, x) =>
          cell === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null,
        ),
      )}
    </svg>
  )
}

const RESIDENT_GLYPH: Record<string, GlyphKind> = { pip: 'bird', mochi: 'blob', glyph: 'beetle' }

/* ---------- world window ---------- */

function Window({
  progress,
  view,
  setView,
  className,
}: {
  progress: number
  view: GoldenView
  setView: (v: GoldenView) => void
  className?: string
}) {
  return (
    <div className={`c-window${className ? ` ${className}` : ''}`}>
      <WorldCanvas progress={progress} view={view} onResidentFocus={() => setView('resident')} />
    </div>
  )
}

/* ---------- landing ---------- */

function Landing({ progress, view, setView }: DirectionProps) {
  return (
    <>
      <header className="c-bar">
        <Stamp
          segments={[{ label: 'StudyGotchi' }, { label: COURSE.id, href: WORLD_HREF }, { label: 'Ice' }]}
        />
        <a className="c-link" href={WORLD_HREF}>
          Sign in
        </a>
      </header>

      <section className="c-hero">
        <Window progress={progress} view={view} setView={setView} className="c-hero-window" />
        <div className="c-sheet c-hero-card c-pop">
          <Stamp segments={[{ label: COURSE.id, href: WORLD_HREF }, { label: COURSE.topic }]} />
          <h1 className="c-display-56">Something moved into your problem set.</h1>
          <p className="c-body">
            Lecture PDFs, problem sets and exam feedback become a world. Touched ideas sprout,
            demonstrated ideas become landmarks, finished problem sets bring residents. Each thing in
            it opens to the page it came from.
          </p>
          <div className="c-actions">
            <Primary>Add a file</Primary>
            <Secondary href="#how">Look around</Secondary>
          </div>
        </div>
      </section>

      <section className="c-section" id="how">
        <Stamp segments={[{ label: COURSE.id }, { label: 'How the ground fills in' }]} />
        <h2 className="c-display-40">Three things can happen to an idea.</h2>
        <div className="c-states">
          <article className="c-card">
            <Stamp segments={[{ label: 'Touched' }, { label: 'Sprout' }]} />
            <div className="c-card-row">
              <Glyph kind="sprout" />
              <Sticker stage="touched" />
            </div>
            <p className="c-ui">You opened the idea. A sprout appears where it lives.</p>
          </article>
          <article className="c-card">
            <Stamp segments={[{ label: 'Demonstrated' }, { label: 'Landmark' }]} />
            <div className="c-card-row">
              <Glyph kind="tower" />
              <Sticker stage="demonstrated" />
            </div>
            <p className="c-ui">You used it and it held. The ground rises and a window lights.</p>
          </article>
          <article className="c-card">
            <Stamp segments={[{ label: 'Mastered' }, { label: 'Resident' }]} />
            <div className="c-card-row">
              <Glyph kind="bird" />
              <Sticker stage="mastered" />
            </div>
            <p className="c-ui">You finished the set. Someone moves in.</p>
          </article>
        </div>
      </section>

      <section className="c-section c-visit-teaser">
        <div>
          <Stamp segments={[{ label: 'Visit a world' }]} />
          <h2 className="c-display-28">Other students can look at your world. Nobody can touch it.</h2>
        </div>
        <form
          className="c-code-row"
          onSubmit={(e) => {
            e.preventDefault()
          }}
        >
          <label className="c-code-field">
            <span className="c-visually-hidden">Share code</span>
            <input className="c-code-input" defaultValue="6P2K 41NW" spellCheck={false} />
          </label>
          <Secondary href={VISIT_HREF}>Visit a world</Secondary>
        </form>
      </section>

      <footer className="c-footer">
        <Stamp
          segments={[
            { label: 'StudyGotchi' },
            { label: 'Sign in', href: WORLD_HREF },
            { label: 'Visit a world', href: VISIT_HREF },
          ]}
        />
      </footer>
    </>
  )
}

/* ---------- world and visit ---------- */

function TopicCard({ owner }: { owner: 'self' | 'visitor' }) {
  return (
    <div className="c-sheet c-topic-card">
      <Stamp segments={[{ label: COURSE.id, href: WORLD_HREF }, { label: COURSE.topic }]} />
      {owner === 'self' ? (
        <>
          <h1 className="c-display-28">Your work keeps the observatory awake.</h1>
          <p className="c-ui c-muted">
            Demonstrated ideas light windows, reveal crystals and strengthen the beacon. Nothing is
            built to fill space.
          </p>
        </>
      ) : (
        <>
          <h1 className="c-display-28">{COURSE.visitor} has kept the observatory awake since pset 2.</h1>
          <p className="c-ui c-muted">Five ideas so far. Three residents. The beacon is at half strength.</p>
        </>
      )}
    </div>
  )
}

function ResidentCard({ readOnly, onBack }: { readOnly: boolean; onBack: () => void }) {
  const pip = GOLDEN_RESIDENTS[0]
  const ev = EVIDENCE[0]
  return (
    <div className="c-sheet c-topic-card c-pop">
      <Stamp
        segments={[{ label: COURSE.id, href: WORLD_HREF }, { label: 'Pset 2' }, { label: `Page ${ev.page}` }]}
      />
      <div className="c-resident-head">
        <Glyph kind={RESIDENT_GLYPH[pip.id]} className="c-bob" />
        <h1 className="c-display-28">{pip.name}</h1>
      </div>
      <p className="c-ui">{pip.line}</p>
      <p className="c-ui c-muted">Arrived with {ev.source.toLowerCase()}, {ev.concept.toLowerCase()}.</p>
      <div className="c-actions">
        {!readOnly && <Secondary>Open page {ev.page}</Secondary>}
        <Secondary onClick={onBack}>Back to overview</Secondary>
      </div>
    </div>
  )
}

function StageBand({
  progress,
  setProgress,
  readOnly,
}: {
  progress: number
  setProgress: (p: number) => void
  readOnly: boolean
}) {
  const { stage } = progressState(progress)
  return (
    <div className="c-band">
      <Stamp segments={[{ label: 'Stage' }, { label: STAGE_LABEL[stage] }]} />
      <div className="c-sticker-row" role={readOnly ? undefined : 'group'} aria-label="Stage">
        {STAGES.map((s) => (
          <Sticker
            key={s === stage ? `${s}-on` : s}
            stage={s}
            pressed={s === stage}
            dim={s !== stage}
            pop={s === stage}
            onClick={readOnly ? undefined : () => setProgress(STAGE_PROGRESS[s])}
          />
        ))}
      </div>
    </div>
  )
}

function Counters({ progress }: { progress: number }) {
  const s = progressState(progress)
  return (
    <dl className="c-counters">
      <div>
        <dt className="c-stamp">Windows</dt>
        <dd className="c-mono-22">{s.litWindows}/5</dd>
      </div>
      <div>
        <dt className="c-stamp">Crystals</dt>
        <dd className="c-mono-22">{s.crystalCount}/5</dd>
      </div>
      <div>
        <dt className="c-stamp">Residents</dt>
        <dd className="c-mono-22">{GOLDEN_RESIDENTS.length}</dd>
      </div>
    </dl>
  )
}

function ResidentsSheet({ onPick }: { onPick: () => void }) {
  return (
    <div className="c-card c-residents">
      <Stamp segments={[{ label: 'Residents' }, { label: String(GOLDEN_RESIDENTS.length) }]} />
      <ul className="c-resident-list">
        {GOLDEN_RESIDENTS.map((r, i) => (
          <li key={r.id}>
            <button type="button" className="c-row c-resident-row" onClick={onPick} style={{ '--i': i } as CSSProperties}>
              <Glyph kind={RESIDENT_GLYPH[r.id]} className="c-bob" />
              <span className="c-resident-text">
                <span className="c-ui c-resident-name">
                  {r.name}
                  {i === 0 && <span className="c-live-dot" aria-label="Arrived this session" />}
                </span>
                <span className="c-caption c-muted">{r.line}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CourseTiles() {
  return (
    <div className="c-band">
      <Stamp segments={[{ label: 'Courses' }, { label: String(OTHER_COURSES.length) }]} />
      <ul className="c-tiles">
        {OTHER_COURSES.map((c) => (
          <li key={c.id}>
            <a className="c-tile" href={WORLD_HREF} aria-current={c.id === COURSE.id ? 'page' : undefined}>
              <span className="c-stamp">{c.id}</span>
              <span className="c-ui c-tile-name">{c.name}</span>
              <span className="c-chip" data-biome={c.biome}>
                {c.biome}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function EvidenceList({ readOnly }: { readOnly: boolean }) {
  return (
    <section className="c-evidence">
      <Stamp segments={[{ label: COURSE.id }, { label: 'Evidence' }, { label: String(EVIDENCE.length) }]} />
      <ul className="c-evidence-list">
        {EVIDENCE.map((e) => (
          <li key={e.concept} className="c-evidence-row">
            <span className="c-ui c-evidence-concept">{e.concept}</span>
            <Sticker stage={e.state} />
            <span className="c-caption c-muted c-evidence-source">{e.source}</span>
            {readOnly ? (
              <span className="c-caption c-muted c-evidence-page">Page {e.page}</span>
            ) : (
              <Secondary small>Open page {e.page}</Secondary>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Segmented({ view, setView }: { view: GoldenView; setView: (v: GoldenView) => void }) {
  return (
    <div className="c-seg" data-view={view} role="group" aria-label="Camera">
      <span className="c-seg-thumb" aria-hidden="true" />
      <button type="button" aria-pressed={view === 'overview'} onClick={() => setView('overview')}>
        Overview
      </button>
      <button type="button" aria-pressed={view === 'resident'} onClick={() => setView('resident')}>
        Resident
      </button>
    </div>
  )
}

function WorldScreen({ progress, setProgress, view, setView, readOnly }: DirectionProps & { readOnly: boolean }) {
  return (
    <>
      {!readOnly && (
        <header className="c-bar">
          <Stamp back={LANDING_HREF} segments={[{ label: COURSE.id }, { label: 'World' }]} />
          <div className="c-bar-tools">
            <Segmented view={view} setView={setView} />
            <Secondary>Share</Secondary>
            <Primary>Add a file</Primary>
          </div>
        </header>
      )}

      <div className="c-world-grid">
        <div className="c-world-main">
          <Window progress={progress} view={view} setView={setView} />
          {view === 'resident' ? (
            <ResidentCard readOnly={readOnly} onBack={() => setView('overview')} />
          ) : (
            <TopicCard owner={readOnly ? 'visitor' : 'self'} />
          )}
        </div>
        <aside className="c-margin">
          <StageBand progress={progress} setProgress={setProgress} readOnly={readOnly} />
          <Counters progress={progress} />
          <ResidentsSheet onPick={() => setView('resident')} />
          {!readOnly && <CourseTiles />}
        </aside>
      </div>

      <EvidenceList readOnly={readOnly} />
    </>
  )
}

/** The visit screen's one bar: stamp, the read-only sentence, camera control and the primary. */
function VisitBanner({ view, setView }: { view: GoldenView; setView: (v: GoldenView) => void }) {
  return (
    <header className="c-banner c-pop">
      <div>
        <Stamp segments={[{ label: 'Visiting' }, { label: COURSE.visitor }, { label: COURSE.id }]} />
        <p className="c-display-28">
          You are looking at {COURSE.visitor}'s world. You can look. You cannot touch.
        </p>
      </div>
      <div className="c-actions">
        <Segmented view={view} setView={setView} />
        <Secondary href={LANDING_HREF}>Visit another world</Secondary>
        <Primary>Add a file</Primary>
      </div>
    </header>
  )
}

export function DirectionC(props: DirectionProps) {
  const { screen } = props
  return (
    <main className="dir-c" data-screen={screen}>
      {screen === 'landing' && <Landing {...props} />}
      {screen === 'world' && <WorldScreen {...props} readOnly={false} />}
      {screen === 'visit' && (
        <>
          <VisitBanner view={props.view} setView={props.setView} />
          <WorldScreen {...props} readOnly />
        </>
      )}
    </main>
  )
}
