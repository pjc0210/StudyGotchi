'use client'

import { Maximize2, Minus, Plus } from 'lucide-react'
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
        <Minus size={13} aria-hidden />
      </button>
      <span aria-hidden />
      <button type="button" onClick={onZoomIn} aria-label="Zoom in">
        <Plus size={13} aria-hidden />
      </button>
      <span aria-hidden />
      <button type="button" onClick={onFit} aria-label="Fit graph to view">
        <Maximize2 size={12} aria-hidden />
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
