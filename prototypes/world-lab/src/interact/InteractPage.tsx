import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { GoldenIceScene, type HighlightMode } from '../golden/GoldenIceScene'
import { CAMERA_POSES, GOLDEN_PALETTE, rendererProfile } from '../golden/golden-spec'
import { AnchorRegistry } from './anchors'
import { ScreenAnchors } from './ScreenAnchors'
import {
  HIGHLIGHT_MODES,
  LABEL_MODES,
  MOTION_MODES,
  PANEL_MODES,
  STATES,
  TARGETS,
  TARGET_BY_ID,
  anchorPoint,
  objectState,
  readInteractParams,
  stateOf,
  writeInteractParams,
  type InteractId,
  type InteractParams,
  type InteractTarget,
  type LabelMode,
  type MotionMode,
  type PanelMode,
  type StateKey,
} from './interact-spec'
import './interact.css'

interface InteractPageProps {
  onBack: () => void
}

const DISMISS_MS = 100
const STATE_LABEL: Record<StateKey, string> = {
  touched: 'Touched',
  demonstrated: 'Demonstrated',
  mastered: 'Mastered',
}

/* ---------- controls ---------- */

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
    <div className="ix-group" role="group" aria-label={label}>
      <span className="ix-eyebrow">{label}</span>
      <div className="ix-seg">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function StateChip({ state }: { state: StateKey }) {
  return (
    <span className="ix-chip" data-state={state}>
      {STATE_LABEL[state]}
    </span>
  )
}

/* ---------- labels ---------- */

function accentStyle(target: InteractTarget): CSSProperties | undefined {
  return target.accent ? ({ '--ix-accent': target.accent } as CSSProperties) : undefined
}

function Tail() {
  return (
    <svg className="ix-tail" viewBox="0 0 24 12" aria-hidden="true">
      <path d="M0 0 L12 12 L24 0" className="ix-tail-fill" />
      <path d="M0 0 L12 12 L24 0" className="ix-tail-edge" />
    </svg>
  )
}

function Bubble({
  target,
  children,
  panel = false,
}: {
  target: InteractTarget
  children?: ReactNode
  panel?: boolean
}) {
  return (
    <div
      className={`ix-bubble${panel ? ' is-panel ix-enter' : ' ix-fade'}`}
      style={accentStyle(target)}
      data-speaker={target.kind}
    >
      <span className="ix-tab">{target.name}</span>
      {panel ? children : <p className="ix-bubble-line">{target.line}</p>}
      <Tail />
    </div>
  )
}

function Tag({ target }: { target: InteractTarget }) {
  return <span className="ix-tag ix-fade">{target.name}</span>
}

function CalloutLabel({ target }: { target: InteractTarget }) {
  return (
    <div className="ix-callout-label ix-fade" data-callout-label="" style={accentStyle(target)}>
      <span className="ix-eyebrow">
        {target.kind} · {target.kindLabel}
      </span>
      <strong>{target.name}</strong>
      <span>{target.line}</span>
    </div>
  )
}

/* ---------- the detail shown when something is open ---------- */

function Detail({
  target,
  state,
  onClose,
  compact = false,
}: {
  target: InteractTarget
  state: StateKey
  onClose: () => void
  compact?: boolean
}) {
  return (
    <div className={`ix-detail${compact ? ' is-compact' : ''}`} style={accentStyle(target)}>
      <div className="ix-detail-head">
        <span className="ix-detail-kind">
          <span className="ix-card-dot" aria-hidden="true" />
          <span className="ix-eyebrow">
            {target.kind} · {target.kindLabel}
          </span>
        </span>
        <button type="button" className="ix-close" onClick={onClose} aria-label="Close">
          Close
        </button>
      </div>
      <h2 className="ix-detail-name">{target.name}</h2>
      <p className="ix-detail-line">{target.line}</p>
      <dl className="ix-evidence">
        <dt className="ix-eyebrow">Evidence</dt>
        <dd>{target.evidence}</dd>
        <dd className="ix-source">{target.source}</dd>
      </dl>
      <div className="ix-detail-actions">
        <button type="button" className="ix-primary">
          Open page {target.page}
        </button>
        <StateChip state={state} />
      </div>
    </div>
  )
}

/* ---------- page ---------- */

export function InteractPage({ onBack }: InteractPageProps) {
  const [params, setParams] = useState<InteractParams>(() => readInteractParams(window.location.search))
  const [pointerHover, setPointerHover] = useState<InteractId | null>(null)
  /* the panel stays mounted for the Dismiss fade after `open` clears */
  const [displayed, setDisplayed] = useState<InteractId | null>(params.open)
  const closeTimer = useRef<number | null>(null)
  const registry = useMemo(() => new AnchorRegistry(), [])
  const systemReduced = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    [],
  )

  useEffect(() => writeInteractParams(params), [params])
  useEffect(() => {
    const root = document.documentElement
    if (params.reduced) root.dataset.reducedMotion = 'true'
    else delete root.dataset.reducedMotion
    return () => {
      delete root.dataset.reducedMotion
    }
  }, [params.reduced])

  const patch = useCallback(
    (next: Partial<InteractParams>) => setParams((current) => ({ ...current, ...next })),
    [],
  )
  const setOpen = useCallback(
    (open: InteractId | null) => {
      patch({ open })
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
      closeTimer.current = null
      if (open !== null) setDisplayed(open)
      else closeTimer.current = window.setTimeout(() => setDisplayed(null), DISMISS_MS)
    },
    [patch],
  )
  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current)
    },
    [],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setOpen])

  const hovered = params.hover ?? pointerHover
  const hoveredTarget = hovered ? TARGET_BY_ID[hovered] : null
  const closing = params.open === null && displayed !== null
  const displayedTarget = displayed ? TARGET_BY_ID[displayed] : null
  const stage = stateOf(params.state)
  const reduced = params.reduced || systemReduced
  const isOpen = params.open !== null
  const anchored = params.panel === 'anchored'

  const onHover = useCallback((id: string | null) => setPointerHover(id as InteractId | null), [])
  const onSelect = useCallback((id: string) => setOpen(id as InteractId), [setOpen])
  const noop = useCallback(() => {}, [])

  const points = useMemo(
    () => Object.fromEntries(TARGETS.map((target) => [target.id, anchorPoint(target)])),
    [],
  )
  const profile = rendererProfile('pixel')

  const showHoverLabel =
    hoveredTarget && params.label !== 'none' && !(anchored && displayed === hoveredTarget.id)
  const panelBody = (target: InteractTarget, compact = false) => (
    <Detail
      key={target.id}
      target={target}
      state={objectState(target, stage.value)}
      onClose={() => setOpen(null)}
      compact={compact}
    />
  )

  return (
    <div
      className="ix-root"
      data-motion={params.motion}
      data-reduced-motion={reduced ? 'true' : undefined}
    >
      <header className="ix-strip">
        <button type="button" className="ix-back" onClick={onBack}>
          Back to lab
        </button>
        <div className="ix-title">
          <span className="ix-eyebrow">Interaction lab</span>
          <strong>How the world talks back</strong>
        </div>
        <Segmented<LabelMode>
          label="Label"
          value={params.label}
          options={LABEL_MODES}
          onChange={(label) => patch({ label })}
        />
        <Segmented<HighlightMode>
          label="Highlight"
          value={params.highlight}
          options={HIGHLIGHT_MODES}
          onChange={(highlight) => patch({ highlight })}
        />
        <Segmented<PanelMode>
          label="Panel"
          value={params.panel}
          options={PANEL_MODES}
          onChange={(panel) => patch({ panel })}
        />
        <Segmented<MotionMode>
          label="Motion"
          value={params.motion}
          options={MOTION_MODES}
          onChange={(motion) => patch({ motion })}
        />
        <Segmented<StateKey>
          label="State"
          value={params.state}
          options={STATES.map((stage) => stage.key)}
          onChange={(state) => patch({ state })}
        />
        <div className="ix-group">
          <span className="ix-eyebrow">Motion pref</span>
          <div className="ix-seg">
            <button
              type="button"
              aria-pressed={params.reduced}
              onClick={() => patch({ reduced: !params.reduced })}
            >
              reduced
            </button>
          </div>
        </div>
        {params.hover && (
          <div className="ix-group">
            <span className="ix-eyebrow">Pinned hover</span>
            <div className="ix-seg">
              <button type="button" aria-pressed onClick={() => patch({ hover: null })}>
                {TARGET_BY_ID[params.hover].name} · unpin
              </button>
            </div>
          </div>
        )}
      </header>

      <div
        className="ix-stage"
        data-panel={params.panel}
        data-open={displayed !== null ? 'true' : undefined}
      >
        <div className="ix-world">
          <Canvas
            shadows="basic"
            dpr={1}
            camera={{
              position: CAMERA_POSES.overview.position,
              fov: CAMERA_POSES.overview.fov,
              near: 0.1,
              far: 80,
            }}
            gl={{ antialias: profile.antialias, powerPreference: 'high-performance', alpha: false }}
            onCreated={({ gl, camera }) => {
              gl.setClearColor(GOLDEN_PALETTE.sky)
              camera.lookAt(...CAMERA_POSES.overview.target)
              camera.updateMatrixWorld()
            }}
            onPointerMissed={(event) => {
              if (event.type === 'click') setOpen(null)
            }}
          >
            <GoldenIceScene
              variant="pixel"
              view="overview"
              progress={stage.value}
              onResidentFocus={noop}
              hoveredId={hovered}
              highlight={params.highlight}
              reducedMotion={reduced}
              onHover={onHover}
              onSelect={onSelect}
            />
            <ScreenAnchors registry={registry} points={points} />
          </Canvas>

          <div className="ix-overlay">
            {showHoverLabel && hoveredTarget && params.label === 'callout' && (
              <div className="ix-callout" ref={registry.attach(hoveredTarget.id, 'callout')}>
                <svg className="ix-leader" aria-hidden="true">
                  <line data-seg="rise" />
                  <line data-seg="run" />
                  <rect width="4" height="4" />
                </svg>
                <CalloutLabel target={hoveredTarget} />
              </div>
            )}
            {showHoverLabel && hoveredTarget && params.label !== 'callout' && (
              <div className="ix-anchor" ref={registry.attach(hoveredTarget.id, 'point')}>
                {params.label === 'tag' ? <Tag target={hoveredTarget} /> : <Bubble target={hoveredTarget} />}
              </div>
            )}
            {anchored && displayedTarget && (
              <div
                className={`ix-anchor ix-anchor-panel${closing ? ' is-closing' : ''}`}
                ref={registry.attach(displayedTarget.id, 'point')}
              >
                <Bubble key={displayedTarget.id} target={displayedTarget} panel>
                  {panelBody(displayedTarget)}
                </Bubble>
              </div>
            )}
          </div>

          <p className="ix-postmark">
            {params.label} · {params.highlight} · {params.panel} · {params.motion} ·{' '}
            {params.state}
          </p>
        </div>

        {params.panel === 'side' && displayedTarget && (
          <aside className={`ix-side ix-enter${closing ? ' is-closing' : ''}`} aria-label="Detail">
            {panelBody(displayedTarget)}
          </aside>
        )}

        {params.panel === 'sheet' && displayedTarget && (
          <aside className={`ix-sheet ix-enter${closing ? ' is-closing' : ''}`} aria-label="Detail">
            {panelBody(displayedTarget, true)}
            <div className="ix-cards" aria-label="Everything in the world">
              {TARGETS.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  className="ix-card"
                  style={accentStyle(target)}
                  aria-pressed={params.open === target.id}
                  data-hovered={hovered === target.id ? 'true' : undefined}
                  onClick={() => setOpen(target.id)}
                  onPointerEnter={() => setPointerHover(target.id)}
                  onPointerLeave={() => setPointerHover(null)}
                  onFocus={() => setPointerHover(target.id)}
                  onBlur={() => setPointerHover(null)}
                >
                  <span className="ix-card-dot" aria-hidden="true" />
                  <strong>{target.name}</strong>
                  <span className="ix-eyebrow">{target.kindLabel}</span>
                  <StateChip state={objectState(target, stage.value)} />
                </button>
              ))}
            </div>
          </aside>
        )}

        {params.panel === 'split' && (
          <aside className="ix-split" aria-label="Everything in the world">
            <div className="ix-split-head">
              <span className="ix-eyebrow">The ice observatory · {TARGETS.length} objects</span>
              <h2>Everything here came from a page.</h2>
            </div>
            <ul className="ix-rows">
              {TARGETS.map((target) => {
                const expanded = params.open === target.id
                return (
                  <li key={target.id} className="ix-row-item" data-expanded={expanded ? 'true' : undefined}>
                    <button
                      type="button"
                      className="ix-row"
                      style={accentStyle(target)}
                      aria-expanded={expanded}
                      data-hovered={hovered === target.id ? 'true' : undefined}
                      onClick={() => setOpen(expanded ? null : target.id)}
                      onPointerEnter={() => setPointerHover(target.id)}
                      onPointerLeave={() => setPointerHover(null)}
                      onFocus={() => setPointerHover(target.id)}
                      onBlur={() => setPointerHover(null)}
                    >
                      <span className="ix-card-dot" aria-hidden="true" />
                      <strong>{target.name}</strong>
                      <span className="ix-eyebrow">
                        {target.kind} · {target.kindLabel}
                      </span>
                      <StateChip state={objectState(target, stage.value)} />
                    </button>
                    {expanded && <div className="ix-row-detail ix-enter">{panelBody(target)}</div>}
                  </li>
                )
              })}
            </ul>
            <p className="ix-split-note">
              Hover a row to find it in the world. Hover the world to find it here. {isOpen ? 'Escape closes.' : 'Click either side to open.'}
            </p>
          </aside>
        )}
      </div>
    </div>
  )
}
