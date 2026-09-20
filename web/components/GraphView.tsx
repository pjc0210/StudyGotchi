'use client'

import { useState } from 'react'
import { ConceptOverlay } from '@/components/ConceptOverlay'
import { NeuralMap } from '@/components/NeuralMap'
import { SiteHeader } from '@/components/SiteHeader'
import { GRAPH_NODES } from '@/lib/knowledge'
import { useStore } from '@/lib/store'

export function GraphView() {
  const { courses } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = GRAPH_NODES.find((node) => node.id === selectedId) ?? null

  return (
    <div className="earth-page is-graph">
      <SiteHeader />
      <div className="graph-stage">
        <aside
          className="course-overlay"
          aria-label={selected ? 'Concept inspector' : 'Your courses'}
        >
          {selected ? (
            <ConceptOverlay concept={selected} onClose={() => setSelectedId(null)} />
          ) : (
            <>
              <h1>Your courses</h1>
              <p>Courses you submitted materials for.</p>
              <ul className="course-list">
                {courses.map((course) => (
                  <li key={course.code}>
                    <span className="course-code">{course.code}</span>
                    <span className="course-name">{course.name}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
        <NeuralMap selectedId={selectedId} onSelect={setSelectedId} />
      </div>
    </div>
  )
}
