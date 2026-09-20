import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  BIOMES,
  BUTTON_SIZES,
  BUTTON_STATES,
  BUTTON_TREATMENTS,
  COPY,
  PIXEL_MODES,
  SECTIONS,
  SHEET_SIZES,
  SHEET_SPRITES,
  SPRITES,
  SPRITE_IDS,
  THEMES,
  THREAD_PLACES,
  TINT_STEPS,
  cellsFor,
  readArtParams,
  writeArtParams,
  type ArtParams,
  type ArtTheme,
  type BiomeId,
  type ButtonState,
  type ButtonTreatment,
  type PixelMode,
  type SectionId,
  type SpriteId,
} from './art-spec'
import { BakedSprite, SpriteBakery, SpriteCanvas } from './sprites'
import { downloadPng, useBaked, type BakeJob } from './bake'
import './art.css'

interface ArtPageProps {
  onBack: () => void
}

/* ---------- small shared pieces ---------- */

function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={`art-eyebrow${className ? ` ${className}` : ''}`}>{children}</span>
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  onChange: (next: T) => void
}) {
  return (
    <div className="art-group" role="group" aria-label={label}>
      <Eyebrow>{label}</Eyebrow>
      <div className="art-seg">
        {options.map((option) => (
          <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function SectionHead({ id, children }: { id: SectionId; children?: ReactNode }) {
  const section = SECTIONS.find((s) => s.id === id)!
  return (
    <header className="art-section-head">
      <div>
        <Eyebrow>
          Section {section.letter} · {id}
        </Eyebrow>
        <h2 className="art-h2">{section.title}</h2>
      </div>
      {children}
    </header>
  )
}

function Caption({ children }: { children: ReactNode }) {
  return <p className="art-caption">{children}</p>
}

/* ---------- A. sprites ---------- */

function SheetCell({ id, size, mode }: { id: SpriteId; size: number; mode: PixelMode }) {
  const live = size === 192
  const cells = cellsFor(size, mode)
  const wrap = useRef<HTMLDivElement>(null)
  const baked = useBaked(id, cells)
  const save = () => {
    const canvas = wrap.current?.querySelector('canvas')
    if (live && canvas) downloadPng(canvas, `${id}-${size}`)
    else if (baked) downloadPng(baked, `${id}-${size}`, size)
  }
  return (
    <div className="art-sheet-cell" ref={wrap}>
      <div className="art-sheet-stage" style={{ width: size, height: size }}>
        {live ? <SpriteCanvas id={id} size={size} motion={id === 'observatory' ? 'bob' : 'still'} /> : <BakedSprite id={id} size={size} mode={mode} />}
      </div>
      <Eyebrow className="art-sheet-caption">
        {size} · {cells} cells
      </Eyebrow>
      <button type="button" className="art-mini" onClick={save}>
        Download PNG
      </button>
    </div>
  )
}

function StateCard({ kind, sprite, title, body, action, motion }: { kind: string; sprite: SpriteId; title: string; body: string; action?: string; motion?: 'pace' }) {
  return (
    <div className="art-card art-state" data-kind={kind}>
      <div className="art-state-art">
        {motion ? <SpriteCanvas id={sprite} size={96} motion={motion} /> : <BakedSprite id={sprite} size={96} />}
      </div>
      <Eyebrow>{kind}</Eyebrow>
      <h3 className="art-h3">{title}</h3>
      <p className="art-body">{body}</p>
      {action ? (
        <button type="button" className="art-btn art-btn-ink" style={{ '--btn-h': '32px' } as CSSProperties}>
          {action}
        </button>
      ) : (
        <span className="art-ellipsis-line">
          <span className="art-ellipsis" aria-hidden="true">
            ...
          </span>
        </span>
      )}
    </div>
  )
}

function SectionSprites({ pixel, setPixel }: { pixel: PixelMode; setPixel: (p: PixelMode) => void }) {
  return (
    <section className="art-section" id="sprites" aria-labelledby="sprites-title">
      <SectionHead id="sprites">
        <Segmented<PixelMode> label="Cells" value={pixel} options={PIXEL_MODES} onChange={setPixel} />
      </SectionHead>
      <p className="art-lede" id="sprites-title">
        Every sprite here is rendered in the browser through the world's own pixel pass, on a transparent canvas, from the overview camera's angle, under the same warm key light. The paper is the ground.
      </p>

      <div className="art-sheet" role="table" aria-label="Sprite sheet">
        <div className="art-sheet-row art-sheet-header" role="row">
          <Eyebrow>Sprite</Eyebrow>
          {SHEET_SIZES.map((size) => (
            <Eyebrow key={size}>{size} px</Eyebrow>
          ))}
        </div>
        {SHEET_SPRITES.map((id) => (
          <div className="art-sheet-row" role="row" key={id}>
            <div className="art-sheet-name">
              <strong>{SPRITES[id].name}</strong>
              <Eyebrow>{SPRITES[id].kind}</Eyebrow>
            </div>
            {SHEET_SIZES.map((size) => (
              <SheetCell key={size} id={id} size={size} mode={pixel} />
            ))}
          </div>
        ))}
      </div>
      <Caption>
        Fixed cells keep the world's pixel size, four screen pixels per cell, at every size. 192 reads as a portrait: Pip's beak, Mochi's hat, Glyph's two books, five windows. 96 reads as a character: the silhouette and two colours survive, the eyes go. 48 does not read at fixed cells: twelve cells make Pip a pale lump with a coral dot and the observatory a mushroom. Switch to scaled cells and 48 reads again, because the browser shrinks a 48 cell sprite rather than the pass drawing a 12 cell one. Use scaled below 96, fixed at 96 and above.
      </Caption>

      <h3 className="art-h3 art-sub">In use</h3>
      <div className="art-states">
        <StateCard kind="Empty" sprite="mochi" title={COPY.empty.title} body={COPY.empty.body} action={COPY.empty.action} />
        <StateCard kind="Loading" sprite="pip" title={COPY.loading.title} body={COPY.loading.body} motion="pace" />
        <StateCard kind="Error" sprite="glyph" title={COPY.error.title} body={COPY.error.body} action={COPY.error.action} />
      </div>
      <Caption>
        Mochi holds the empty state because a snow blob on paper is a world waiting for ground. Pip paces while a page is read; the world has no walk cycle yet, so this is the idle bob with a turn. Glyph carries the error because Glyph carries the example everyone keeps forgetting.
      </Caption>

      <div className="art-divider" role="separator" aria-label="Section break">
        <span className="art-divider-line" />
        <BakedSprite id="pine" size={48} />
        <BakedSprite id="pine" size={64} mode="scaled" />
        <BakedSprite id="pine" size={48} />
        <span className="art-divider-line" />
      </div>
      <Caption>A divider made of three pines. The middle one is 64 px with scaled cells, so it is the same tree one step closer.</Caption>

      <div className="art-margins">
        <div className="art-marginalia" aria-hidden="true">
          <BakedSprite id="crystal" size={40} className="art-prop" mode="scaled" />
          <BakedSprite id="lamp" size={48} className="art-prop" mode="scaled" />
          <BakedSprite id="pine" size={40} className="art-prop" mode="scaled" />
        </div>
        <article className="art-reading">
          <Eyebrow>Notes · 6.1210 · Sorting and recurrences</Eyebrow>
          <h3 className="art-h3">What the ground remembers</h3>
          <p className="art-body">
            A touched concept is a sprout. A demonstrated concept is a landmark, and the ground rises under it. Nothing in the world is placed by hand: each thing stands where a page put it, and each thing can say which page.
          </p>
          <p className="art-body">
            The margins are for props. They never carry meaning, and they never overlap the reading column. A crystal, a lamp post, a pine: the same objects the world scatters, scattered here at the same density, which is to say sparsely.
          </p>
        </article>
        <div className="art-marginalia art-marginalia-right" aria-hidden="true">
          <BakedSprite id="mochi" size={48} className="art-prop" mode="scaled" />
          <BakedSprite id="crystal" size={32} className="art-prop" mode="scaled" />
        </div>
      </div>
      <Caption>Marginalia the way the Untitled Goose Game site does it: small props in the gutters, never inside the column, never many.</Caption>

      <div className="art-favicon">
        <div className="art-favicon-tab">
          <BakedSprite id="pip" size={32} mode="scaled" />
          <span>StudyGotchi · 6.1210</span>
        </div>
        <div className="art-favicon-tab">
          <BakedSprite id="pip" size={32} />
          <span>StudyGotchi · fixed cells</span>
        </div>
      </div>
      <Caption>A 32 px Pip for the favicon. Scaled cells on the left reads as a bird. Fixed cells on the right, eight cells across, reads as a marshmallow. Ship the left one.</Caption>
    </section>
  )
}

/* ---------- B. buttons ---------- */

function ArtButton({
  treatment,
  size,
  state,
  lit,
  children,
}: {
  treatment: ButtonTreatment
  size: number
  state: ButtonState
  lit?: boolean
  children: ReactNode
}) {
  const forced = state === 'hover' || state === 'focus' || state === 'active' ? state : undefined
  const loading = state === 'loading'
  const label = loading ? (
    <span className="art-ellipsis" aria-label="Loading">
      ...
    </span>
  ) : (
    <>
      {treatment === 'sticker' && <span className="art-dot" aria-hidden="true" />}
      {children}
    </>
  )
  return (
    <button
      type="button"
      className={`art-btn art-btn-${treatment}`}
      style={{ '--btn-h': `${size}px` } as CSSProperties}
      data-size={size}
      data-force={forced}
      data-lit={lit ? '' : undefined}
      disabled={state === 'disabled'}
      aria-busy={loading || undefined}
    >
      {treatment === 'pixel' ? (
        <>
          <span className="art-px-shadow" aria-hidden="true" />
          <span className="art-px-face">
            <span className="art-px-inner">{label}</span>
          </span>
        </>
      ) : (
        label
      )}
    </button>
  )
}

const STATE_LABEL: Record<ButtonState, string> = {
  idle: 'Idle',
  hover: 'Hover',
  focus: 'Focus visible',
  active: 'Active',
  disabled: 'Disabled',
  loading: 'Loading',
}

function SectionButtons() {
  const [lit, setLit] = useState(true)
  return (
    <section className="art-section" id="buttons" aria-labelledby="buttons-title">
      <SectionHead id="buttons">
        <div className="art-group" role="group" aria-label="Lamp">
          <Eyebrow>Lamp · data-lit</Eyebrow>
          <div className="art-seg">
            <button type="button" aria-pressed={lit} onClick={() => setLit(true)}>
              lit
            </button>
            <button type="button" aria-pressed={!lit} onClick={() => setLit(false)}>
              unlit
            </button>
          </div>
        </div>
      </SectionHead>
      <p className="art-lede" id="buttons-title">
        Seven treatments, six states, four heights. Every button is real: hover it, hold it. Press is 75 ms in on the standard curve and 220 ms out on the spring. Disabled never moves. Loading is a three-pixel ellipsis stepping in Departure Mono.
      </p>
      <div className="art-treatments">
        {BUTTON_TREATMENTS.map((t) => (
          <article className="art-treatment" key={t.id} data-treatment={t.id}>
            <header className="art-treatment-head">
              <h3 className="art-h3">{t.name}</h3>
              <Eyebrow>{t.lineage}</Eyebrow>
              <p className="art-body art-dim">{t.use}</p>
            </header>
            <div className="art-btn-grid" role="table" aria-label={`${t.name} states`}>
              <div className="art-btn-row art-btn-header" role="row">
                <Eyebrow>px</Eyebrow>
                {BUTTON_STATES.map((s) => (
                  <Eyebrow key={s}>{STATE_LABEL[s]}</Eyebrow>
                ))}
              </div>
              {BUTTON_SIZES.map((size) => (
                <div className="art-btn-row" role="row" key={size}>
                  <Eyebrow>{size}</Eyebrow>
                  {BUTTON_STATES.map((s) => (
                    <div key={s} className="art-btn-slot">
                      <ArtButton treatment={t.id} size={size} state={s} lit={t.id === 'lamp' && lit}>
                        {t.id === 'lamp' ? 'Mastered' : t.id === 'sticker' ? 'Demonstrated' : 'Show the page'}
                      </ArtButton>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
      <Caption>
        Ink is the one to ship as the primary: it is the direction's own token, it survives every theme by swapping foreground for paper, and it needs no shadow to explain itself. Clay is kept for one button, Start your world, because the one thing on the site that should feel like a key is the first one you press. Keycap belongs to the shortcuts strip. Pixel is for controls that touch the window. Sticker is a chip, not a button. Lamp lights once, when something is mastered, and is otherwise Ink with a warm label.
      </Caption>
    </section>
  )
}

/* ---------- C. colour ---------- */

function MockCards({ lamp }: { lamp?: boolean }) {
  return (
    <div className="art-mock-cards">
      {['Merge sort invariant', 'Master theorem', 'Recurrence trees'].map((name, i) => (
        <div className="art-mock-card" key={name} data-lit={lamp && i === 0 ? '' : undefined}>
          <span className="art-mock-window" aria-hidden="true" />
          <strong>{name}</strong>
          <Eyebrow>{i === 0 ? 'Pset 2 · p.3' : i === 1 ? 'Lecture 4 · p.12' : 'Recitation 3 · p.2'}</Eyebrow>
        </div>
      ))}
    </div>
  )
}

function MockSection({ style, className, label, hairline }: { style?: CSSProperties; className?: string; label: string; hairline?: 'alpha' | 'tinted' }) {
  return (
    <div className={`art-mock${className ? ` ${className}` : ''}`} style={style} data-hairline={hairline}>
      <Eyebrow className="art-mock-label">{label}</Eyebrow>
      <h4 className="art-mock-h">Sorting and recurrences</h4>
      <p className="art-body">Three concepts touched this week, two demonstrated. The observatory lit its third window on Thursday.</p>
      <p className="art-body art-dim">Every card below can name its page. Open one and the resident who lives there will tell you what it remembers.</p>
      <MockCards />
    </div>
  )
}

function biomeVar(id: BiomeId) {
  return `var(--w-${id})`
}

function SectionColour() {
  return (
    <section className="art-section" id="colour" aria-labelledby="colour-title">
      <SectionHead id="colour" />
      <p className="art-lede" id="colour-title">
        Four ways to let colour through a page without inventing any. Each is shown on the same mock section: a heading, two paragraphs, a card row.
      </p>

      <h3 className="art-h3 art-sub">1. Biome tint</h3>
      <Caption>The section ground is the paper mixed toward the course's biome ground with color-mix. Rows are 8, 12 and 18 percent; columns are ice, meadow and sand.</Caption>
      <div className="art-tint-grid">
        {TINT_STEPS.map((pct) =>
          BIOMES.map((b) => (
            <MockSection
              key={`${pct}-${b.id}`}
              className="art-mock-tinted"
              label={`${b.name} · ${pct}%`}
              style={{ '--biome': biomeVar(b.id), '--tint': `${pct}%` } as CSSProperties}
            />
          )),
        )}
      </div>
      <Caption>8 percent is a hint the eye reads as warmth or coolness and cannot name. 12 percent names the biome without arguing with the ink. 18 percent is a place, and the cards start to float on it. Use 12 for a course section and 18 only for the visit postcard.</Caption>

      <h3 className="art-h3 art-sub">2. Accent thread</h3>
      <div className="art-thread">
        <div className="art-mock art-thread-page">
          <nav className="art-mock-nav" aria-label="Mock navigation">
            <span className="art-mock-brand">STUDYGOTCHI</span>
            <span className="art-mock-tabs">
              <span>Overview</span>
              <span className="art-thread-tab" data-thread="3">
                Residents
              </span>
              <span>Visits</span>
            </span>
            <span className="art-live-badge" data-thread="4">
              <span className="art-live-dot" aria-hidden="true" />
              Eddy is visiting
            </span>
          </nav>
          <Eyebrow className="art-thread-eyebrow" data-thread="1">
            <span className="art-thread-dot" aria-hidden="true" />
            6.1210 · Sorting and recurrences
          </Eyebrow>
          <h4 className="art-mock-h">Three residents. One of them is new.</h4>
          <p className="art-body">
            Mochi arrived when pset 4 came in. The recursion landmark is on{' '}
            <a className="art-thread-link" data-thread="2" href="#colour">
              page 3 of that file
            </a>
            , which is where Mochi will point if asked.
          </p>
          <div className="art-thread-bubble" data-thread="5">
            <span className="art-thread-tab-name">Mochi</span>
            <p>Understands recursion. Refuses to explain it.</p>
            <svg className="art-thread-tail" viewBox="0 0 24 12" aria-hidden="true">
              <path d="M0 0 L12 12 L24 0" />
            </svg>
          </div>
          <MockCards />
        </div>
        <aside className="art-legend" aria-label="Where coral appears">
          <Eyebrow>Coral · 5 of 5</Eyebrow>
          <ol className="art-legend-list">
            {THREAD_PLACES.map((place) => (
              <li key={place}>{place}</li>
            ))}
          </ol>
          <p className="art-body art-dim">Nowhere else on the page. Not the cards, not the headline, not the button. One thread, five stitches, so the eye can follow it and so coral keeps meaning "now".</p>
        </aside>
      </div>

      <h3 className="art-h3 art-sub">3. Lamp progress</h3>
      <div className="art-lamp-row">
        <div className="art-card">
          <Eyebrow>Stepper</Eyebrow>
          <ol className="art-stepper">
            {['Touched', 'Demonstrated', 'Mastered', 'Revisited'].map((step, i) => (
              <li key={step} data-lit={i < 2 ? '' : undefined}>
                <span className="art-step-dot" aria-hidden="true" />
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div className="art-card">
          <Eyebrow>Table</Eyebrow>
          <table className="art-table">
            <thead>
              <tr>
                <th>Concept</th>
                <th>Source</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              <tr data-lit="">
                <td>Merge sort invariant</td>
                <td>Pset 2, problem 3</td>
                <td>Mastered</td>
              </tr>
              <tr>
                <td>Master theorem, case 2</td>
                <td>Lecture 4 notes</td>
                <td>Demonstrated</td>
              </tr>
              <tr>
                <td>Counting sort stability</td>
                <td>Lecture 5 notes</td>
                <td>Touched</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="art-card">
          <Eyebrow>Card</Eyebrow>
          <MockCards lamp />
        </div>
      </div>
      <Caption>Lamp means done. It is the observatory's lit window, so it marks a position that has been reached and nothing else: a step passed, a row mastered, a card whose window is lit. It is never a warning, never a highlight, never text.</Caption>

      <h3 className="art-h3 art-sub">4. Tinted hairlines</h3>
      <div className="art-hair-row">
        <MockSection className="art-mock-tinted" label="Ink at 10.5 percent alpha" hairline="alpha" style={{ '--biome': biomeVar('ice'), '--tint': '12%' } as CSSProperties} />
        <MockSection className="art-mock-tinted" label="Ink mixed with the tinted ground" hairline="tinted" style={{ '--biome': biomeVar('ice'), '--tint': '12%' } as CSSProperties} />
      </div>
      <Caption>Alpha hairlines are right on plain paper and on anything that moves or overlaps, because they stay correct over whatever is behind them. Mixed hairlines are right inside a tinted section, where they pick up the biome and read as drawn on that ground rather than laid over it. Never mix a hairline for a floating element.</Caption>
    </section>
  )
}

/* ---------- D. themes ---------- */

function MockPage({ theme }: { theme: ArtTheme }) {
  return (
    <div className="art-theme art-mock-page" data-theme={theme}>
      <nav className="art-mock-nav" aria-label={`${theme} navigation`}>
        <span className="art-mock-brand">STUDYGOTCHI</span>
        <span className="art-mock-tabs">
          <span className="art-thread-tab">Overview</span>
          <span>Residents</span>
          <span>Visits</span>
        </span>
        <button type="button" className="art-btn art-btn-paper" style={{ '--btn-h': '28px' } as CSSProperties}>
          Sign in
        </button>
      </nav>
      <div className="art-mock-hero">
        <div className="art-mock-window-field">
          <BakedSprite id="observatory" size={96} className="art-hero-observatory" />
          <BakedSprite id="pip" size={48} className="art-hero-pip" mode="scaled" />
          <BakedSprite id="pine" size={40} className="art-hero-pine" mode="scaled" />
        </div>
        <div className="art-mock-hero-copy">
          <Eyebrow>6.1210 · Sorting and recurrences</Eyebrow>
          <h4 className="art-mock-h art-mock-hero-h">Turn in a problem set. Someone moves in.</h4>
          <p className="art-body art-dim">The window is the world's sky in this theme. The paper is derived; the ink stays ink or becomes cream.</p>
          <div className="art-mock-actions">
            <button type="button" className="art-btn art-btn-ink" style={{ '--btn-h': '36px' } as CSSProperties}>
              Start your world
            </button>
            <button type="button" className="art-btn art-btn-paper" style={{ '--btn-h': '36px' } as CSSProperties}>
              Visit a world
            </button>
            <button type="button" className="art-btn art-btn-lamp" data-lit="" style={{ '--btn-h': '36px' } as CSSProperties}>
              Mastered
            </button>
          </div>
        </div>
      </div>
      <table className="art-table">
        <thead>
          <tr>
            <th>Concept</th>
            <th>Source</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          <tr data-lit="">
            <td>Merge sort invariant</td>
            <td>Pset 2, problem 3</td>
            <td>Mastered</td>
          </tr>
          <tr>
            <td>Master theorem, case 2</td>
            <td>Lecture 4 notes</td>
            <td>Demonstrated</td>
          </tr>
          <tr>
            <td>Radix sort bounds</td>
            <td>Lecture 5 notes</td>
            <td>Touched</td>
          </tr>
        </tbody>
      </table>
      <div className="art-mock-buttons">
        {(['paper', 'ink', 'clay', 'keycap', 'pixel', 'sticker'] as ButtonTreatment[]).map((t) => (
          <ArtButton key={t} treatment={t} size={32} state="idle">
            {t === 'sticker' ? 'Demonstrated' : 'Show the page'}
          </ArtButton>
        ))}
      </div>
      <div className="art-swatches" aria-label="Derived tokens">
        {(['paper', 'sheet', 'raised', 'window', 'fg', 'fg-dim', 'hair', 'live', 'lamp'] as const).map((token) => (
          <span key={token} className="art-swatch" style={{ '--swatch': `var(--${token})` } as CSSProperties}>
            <span className="art-swatch-chip" aria-hidden="true" />
            <Eyebrow>{token}</Eyebrow>
          </span>
        ))}
      </div>
    </div>
  )
}

function SectionThemes() {
  return (
    <section className="art-section" id="themes" aria-labelledby="themes-title">
      <SectionHead id="themes" />
      <p className="art-lede" id="themes-title">
        Two themes derived from the day paper, shown side by side and fixed, so they can be compared while the switch above re-skins everything else. Stone is an overcast day: the paper goes neutral, the ink and the accents stay. Night is dusk: the page is ink with a little sky in it, the text is cream, and the accents are pulled toward the page so they sit in the dark instead of on it.
      </p>
      <div className="art-theme-pair">
        <div className="art-theme-col">
          <Eyebrow>stone · grey daytime</Eyebrow>
          <MockPage theme="stone" />
        </div>
        <div className="art-theme-col">
          <Eyebrow>night · dusk</Eyebrow>
          <MockPage theme="night" />
        </div>
      </div>
      <Caption>
        Recommendation: follow the student's local time the way the game already does, day paper by day and night after sunset, with a manual override in the account menu that sticks until it is cleared. Stone is not a time of day; it is a preference, offered in the same menu for anyone who finds cream too warm to read on for long. The chrome gallery now has both under ?palette=stone and ?palette=night.
      </Caption>
    </section>
  )
}

/* ---------- page ---------- */

const BAKE_CELLS = [48, 24, 16, 12, 10, 8]

export function ArtPage({ onBack }: ArtPageProps) {
  const [params, setParams] = useState<ArtParams>(() => readArtParams(window.location.search))
  const root = useRef<HTMLDivElement>(null)
  const pinned = useRef<SectionId | null>(params.section)

  useEffect(() => {
    window.history.replaceState(null, '', writeArtParams(params, window.location.search))
  }, [params])

  const patch = useCallback((next: Partial<ArtParams>) => setParams((current) => ({ ...current, ...next })), [])

  const jump = useCallback(
    (section: SectionId, smooth = true) => {
      pinned.current = section
      patch({ section })
      document.getElementById(section)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' })
    },
    [patch],
  )

  /* deep link: land on the section once the first sprites exist, then let scrolling own the param */
  useEffect(() => {
    const target = pinned.current
    if (!target) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: 'instant', block: 'start' })
      pinned.current = null
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const scroller = root.current
    if (!scroller) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const id = visible.target.id as SectionId
        if (pinned.current && pinned.current !== id) return
        pinned.current = null
        patch({ section: id })
      },
      { root: scroller, rootMargin: '-72px 0px -55% 0px', threshold: [0, 0.1, 0.25] },
    )
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [patch])

  const jobs = useMemo<BakeJob[]>(() => SPRITE_IDS.flatMap((id) => BAKE_CELLS.map((cells) => ({ id, cells }))), [])

  return (
    <div className="art-page" data-theme={params.theme} ref={root}>
      <SpriteBakery jobs={jobs}>
        <header className="art-strip">
          <button type="button" className="art-back" onClick={onBack}>
            Back to lab
          </button>
          <div className="art-title">
            <Eyebrow>Art and systems lab</Eyebrow>
            <strong>Made from the world</strong>
          </div>
          <nav className="art-jumps" aria-label="Sections">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                aria-current={params.section === s.id ? 'true' : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  jump(s.id)
                }}
              >
                <span className="art-jump-letter">{s.letter}</span>
                {s.title}
              </a>
            ))}
          </nav>
          <Segmented<ArtTheme> label="Theme" value={params.theme} options={THEMES} onChange={(theme) => patch({ theme })} />
        </header>

        <main className="art-main">
          <SectionSprites pixel={params.pixel} setPixel={(pixel) => patch({ pixel })} />
          <SectionButtons />
          <SectionColour />
          <SectionThemes />
        </main>
      </SpriteBakery>
    </div>
  )
}
