import { useState } from 'react'
import { KnowledgeGraph } from '../components/KnowledgeGraph'
import { useStore } from '../store'
import type { GraphNode } from '../types'

const kinds = ['slides', 'reading', 'homework', 'instructor', 'notes', 'practice'] as const

export function GraphPage() {
  const { graphQuery, setGraphQuery } = useStore()
  const [picked, setPicked] = useState<GraphNode | null>(null)

  return (
    <div>
      <h2 className="serif" style={{ marginTop: 0, fontSize: 34 }}>
        Neural knowledge graph
      </h2>
      <p className="muted">
        Search a keyword and the map re-clusters toward relevant materials. Graph logic will be designed elsewhere — this is the visual shell.
      </p>
      <div className="search-row">
        <input
          value={graphQuery}
          onChange={(e) => setGraphQuery(e.target.value)}
          placeholder="Try eigenvalues, automata, nullspace…"
        />
      </div>
      <div className="legend">
        {kinds.map((k) => (
          <span key={k} className="chip">
            {k}
          </span>
        ))}
      </div>
      <section className="card dark" style={{ marginTop: 12 }}>
        <KnowledgeGraph query={graphQuery} onSelect={setPicked} />
        {picked && (
          <div className="node-detail">
            <strong>{picked.label}</strong>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              Cluster {picked.cluster} · {picked.kind} · {picked.course} · owner {picked.owner}
              {picked.classroomShare ? ' · shared with classroom' : ' · private'}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
