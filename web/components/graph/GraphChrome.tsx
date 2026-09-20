'use client'

import { LENSES, type Lens, type GraphModelNode } from '@/lib/kg/graphModel'
import {
  ARTIFACT_LABEL,
  ORIGIN_LABEL,
  STATE_LABEL,
} from '@/lib/kg/graphTheme'
import { formatScore } from '@/lib/kg/graph'

export function GraphLenses({
  lens,
  onChange,
}: {
  lens: Lens
  onChange: (l: Lens) => void
}) {
  return (
    <div className="kg-lenses" role="group" aria-label="Graph lens">
      {LENSES.map((l) => (
        <button
          key={l.id}
          type="button"
          aria-pressed={lens === l.id}
          title={l.hint}
          onClick={() => onChange(l.id)}
          className={lens === l.id ? 'is-active' : undefined}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function GraphControls({
  onFit,
  onZoomIn,
  onZoomOut,
}: {
  onFit: () => void
  onZoomIn: () => void
  onZoomOut: () => void
}) {
  return (
    <div className="kg-controls">
      <button type="button" onClick={onZoomOut} aria-label="Zoom out">
        <Icon>
          <path d="M5 12h14" />
        </Icon>
      </button>
      <span aria-hidden />
      <button type="button" onClick={onZoomIn} aria-label="Zoom in">
        <Icon>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </Icon>
      </button>
      <span aria-hidden />
      <button type="button" onClick={onFit} aria-label="Fit graph to view">
        <Icon>
          <path d="M15 3h6v6" />
          <path d="M9 21H3v-6" />
          <path d="M21 3l-7 7" />
          <path d="M3 21l7-7" />
        </Icon>
      </button>
    </div>
  )
}

const TOOLTIP_W = 220
const TOOLTIP_H = 78

export function GraphTooltip({
  node,
  x,
  y,
  connectedCount,
}: {
  node: GraphModelNode
  x: number
  y: number
  connectedCount: number
}) {
  const flipX =
    typeof window !== 'undefined' && x + 18 + TOOLTIP_W > window.innerWidth
  const flipY =
    typeof window !== 'undefined' && y + 26 + TOOLTIP_H > window.innerHeight

  return (
    <div
      role="tooltip"
      className="kg-tooltip"
      style={{
        width: TOOLTIP_W,
        left: flipX ? x - TOOLTIP_W - 14 : x + 18,
        top: flipY ? y - TOOLTIP_H - 12 : y + 26,
      }}
    >
      <p className="kg-tooltip-title">{node.label}</p>
      {node.kind === 'concept' ? (
        <>
          <p>Understanding {formatScore(node.concept.understanding)}</p>
          <p className="kg-tooltip-state">{STATE_LABEL[node.state]}</p>
        </>
      ) : (
        <>
          <p>
            {ORIGIN_LABEL[node.origin]} · {ARTIFACT_LABEL[node.artifactType]}
          </p>
          <p className="kg-tooltip-state">
            {connectedCount} connected concept{connectedCount === 1 ? '' : 's'}
          </p>
        </>
      )}
    </div>
  )
}
