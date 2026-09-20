'use client'

import { useMemo } from 'react'
import {
  GRAPH_EDGES,
  GRAPH_NODES,
  layoutGraph,
} from '@/lib/knowledge'

const VIEW_W = 1400
const VIEW_H = 780

export function NeuralMap({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string | null) => void
}) {
  const { positions } = useMemo(() => layoutGraph(VIEW_W, VIEW_H), [])

  return (
    <div className="neural-map" aria-label="Knowledge map">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        onClick={() => onSelect(null)}
      >
        {GRAPH_EDGES.map((edge) => {
          const from = positions.get(edge.source)
          const to = positions.get(edge.target)
          if (!from || !to) return null
          const active =
            selectedId === edge.source || selectedId === edge.target
          return (
            <line
              key={`${edge.source}-${edge.target}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className={active ? 'map-edge is-active' : 'map-edge'}
            />
          )
        })}
        {GRAPH_NODES.map((node) => {
          const pos = positions.get(node.id)
          if (!pos) return null
          const selected = selectedId === node.id
          const r = 9 + node.importance * 7
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
              <circle r={r + 10} className="map-node-halo" />
              <circle r={r} />
              <text y={r + 18} textAnchor="middle">
                {node.name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
