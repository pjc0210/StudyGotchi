import { useMemo, useState } from 'react'
import { edges, layoutForQuery, nodes, scoreNode } from '../mock'
import type { GraphNode } from '../types'

const kindColor: Record<string, string> = {
  slides: '#e4a44a',
  reading: '#8fd4b0',
  homework: '#7aa7e0',
  instructor: '#d7a0d2',
  notes: '#f0d9a6',
  practice: '#c86b5a',
}

type Props = {
  query: string
  compact?: boolean
  classroomOnly?: boolean
  owners?: string[]
  onSelect?: (node: GraphNode) => void
}

export function KnowledgeGraph({ query, compact, classroomOnly, owners, onSelect }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [zoom, setZoom] = useState(compact ? 0.72 : 1)

  const laid = useMemo(() => {
    let src = nodes
    if (classroomOnly) src = src.filter((n) => n.classroomShare)
    if (owners?.length) src = src.filter((n) => owners.includes(n.owner) || n.owner === 'you')
    return layoutForQuery(query, src)
  }, [query, classroomOnly, owners])

  const visibleIds = new Set(laid.map((n) => n.id))
  const visEdges = edges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to))
  const byId = Object.fromEntries(laid.map((n) => [n.id, n]))

  return (
    <div>
      {!compact && (
        <div className="search-row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn ghost small" type="button" onClick={() => setZoom((z) => Math.max(0.55, z - 0.12))}>
            − zoom
          </button>
          <button className="btn ghost small" type="button" onClick={() => setZoom((z) => Math.min(1.6, z + 0.12))}>
            + zoom
          </button>
        </div>
      )}
      <div className="graph-canvas" style={{ height: compact ? 240 : 520 }}>
        <svg viewBox="0 0 1000 640" role="img" aria-label="Knowledge graph">
          <g transform={`translate(500 320) scale(${zoom}) translate(-500 -320)`}>
            {visEdges.map((e) => {
              const a = byId[e.from]
              const b = byId[e.to]
              const w = (scoreNode(a, query) + scoreNode(b, query)) / 2
              return (
                <line
                  key={`${e.from}-${e.to}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={`rgba(143,212,176,${0.15 + w * 0.45})`}
                  strokeWidth={1.2 + w * 2}
                />
              )
            })}
            {laid.map((n) => {
              const s = scoreNode(n, query)
              const r = 8 + s * 10
              const on = selected === n.id
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x} ${n.y})`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelected(n.id)
                    onSelect?.(n)
                  }}
                >
                  <circle r={r + 6} fill={kindColor[n.kind]} opacity={0.18 + s * 0.25} />
                  <circle r={r} fill={kindColor[n.kind]} opacity={0.35 + s * 0.65} stroke={on ? '#fff' : 'transparent'} strokeWidth={2} />
                  <text
                    y={r + 16}
                    textAnchor="middle"
                    fill={s > 0.4 ? '#f4efe4' : 'rgba(244,239,228,0.45)'}
                    fontSize={11}
                    fontFamily="Outfit, sans-serif"
                  >
                    {n.label}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>
    </div>
  )
}
