'use client'

import { useMemo } from 'react'
import {
  GRAPH_EDGES,
  GRAPH_NODES,
  layoutGraph,
} from '@/lib/knowledge'

const VIEW_W = 1400
const VIEW_H = 780

function hash(id: string, salt = 0): number {
  let value = 2166136261 ^ salt
  for (let i = 0; i < id.length; i += 1) {
    value ^= id.charCodeAt(i)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

function starProfile(id: string, importance: number) {
  const variation = 0.76 + (hash(id, 19) % 250) / 1000
  const core = Math.max(1.6, (1.85 + importance * 3.1) * variation)
  return {
    core,
    glow: core * 6.2,
    rays: core > 3.6,
  }
}

export function NeuralMap({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { positions } = useMemo(() => layoutGraph(VIEW_W, VIEW_H), [])
  const profiles = useMemo(() => {
    const next = new Map<string, ReturnType<typeof starProfile>>()
    for (const node of GRAPH_NODES) {
      next.set(node.id, starProfile(node.id, node.importance))
    }
    return next
  }, [])

  return (
    <div className="neural-map" aria-label="Knowledge map">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        onClick={() => onSelect(null)}
      >
        <defs>
          <radialGradient id="star-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e7f5fc" stopOpacity="0.95" />
            <stop offset="12%" stopColor="#b5daf2" stopOpacity="0.7" />
            <stop offset="42%" stopColor="#7ebce6" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#7ebce6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="star-glow-active" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f4fbff" stopOpacity="1" />
            <stop offset="12%" stopColor="#c5e6f6" stopOpacity="0.82" />
            <stop offset="42%" stopColor="#6aaee0" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#6aaee0" stopOpacity="0" />
          </radialGradient>
        </defs>
        {GRAPH_EDGES.map((edge) => {
          const from = positions.get(edge.source)
          const to = positions.get(edge.target)
          const a = profiles.get(edge.source)
          const b = profiles.get(edge.target)
          if (!from || !to || !a || !b) return null
          const active =
            selectedId === edge.source || selectedId === edge.target
          const angle = Math.atan2(to.y - from.y, to.x - from.x)
          const ax = from.x + Math.cos(angle) * (a.core + 1)
          const ay = from.y + Math.sin(angle) * (a.core + 1)
          const bx = to.x - Math.cos(angle) * (b.core + 1)
          const by = to.y - Math.sin(angle) * (b.core + 1)
          const curve =
            ((hash(`${edge.source}|${edge.target}`, 7) % 1000) / 1000 - 0.5) * 32
          const cx = (ax + bx) / 2 - Math.sin(angle) * curve
          const cy = (ay + by) / 2 + Math.cos(angle) * curve
          return (
            <path
              key={`${edge.source}-${edge.target}`}
              d={`M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`}
              className={active ? 'map-edge is-active' : 'map-edge'}
            />
          )
        })}
        {GRAPH_NODES.map((node) => {
          const pos = positions.get(node.id)
          const star = profiles.get(node.id)
          if (!pos || !star) return null
          const selected = selectedId === node.id
          const glow = star.glow * (selected ? 1.22 : 1)
          const rayAngle = ((hash(node.id, 41) % 1000) / 1000) * Math.PI
          const rayLength = star.glow * 0.85
          return (
            <g
              key={node.id}
              transform={`translate(${pos.x} ${pos.y})`}
              className={selected ? 'map-node is-selected' : 'map-node'}
              onClick={(event) => {
                event.stopPropagation()
                onSelect(node.id)
              }}
            >
              <circle r={glow * 0.55 + 10} className="map-node-hit" />
              <circle r={glow} className="map-node-glow" />
              {star.rays
                ? [rayAngle, rayAngle + Math.PI / 2].map((angle) => (
                    <line
                      key={angle}
                      className="map-node-ray"
                      x1={-Math.cos(angle) * rayLength}
                      y1={-Math.sin(angle) * rayLength}
                      x2={Math.cos(angle) * rayLength}
                      y2={Math.sin(angle) * rayLength}
                    />
                  ))
                : null}
              <circle r={star.core} className="map-node-core" />
              <text x={glow * 0.56 + 5} y={1}>
                {node.name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
