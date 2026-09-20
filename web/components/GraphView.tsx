'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ConceptOverlay, ResourceOverlay } from '@/components/ConceptOverlay'
import {
  GraphControls,
  GraphLenses,
  GraphTooltip,
} from '@/components/graph/GraphChrome'
import {
  KnowledgeCanvas,
  type CanvasHandle,
  type HoverInfo,
} from '@/components/graph/KnowledgeCanvas'
import { SiteHeader } from '@/components/SiteHeader'
import { buildGraphModel, lensEmphasis, type Lens } from '@/lib/kg/graphModel'
import {
  MOCK_COURSE,
  getMockCourseData,
  mockConceptDetail,
} from '@/lib/kg/mock'
import { useStore } from '@/lib/store'

export function GraphView() {
  const { courses } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lens, setLens] = useState<Lens>('all')
  const [hover, setHover] = useState<HoverInfo | null>(null)
  const canvasRef = useRef<CanvasHandle | null>(null)

  const data = useMemo(() => getMockCourseData(MOCK_COURSE.id), [])
  const model = useMemo(
    () => buildGraphModel(data.graph, data.resources),
    [data],
  )
  const emphasis = useMemo(() => lensEmphasis(model, lens), [model, lens])

  const hoveredNode = hover ? model.byId.get(hover.id) : undefined
  const selectedNode = selectedId ? model.byId.get(selectedId) : undefined

  // Changing lens is a change of view, so reframe onto what it emphasises.
  const firstLensRender = useRef(true)
  useEffect(() => {
    if (firstLensRender.current) {
      firstLensRender.current = false
      return
    }
    const id = setTimeout(() => {
      if (emphasis && emphasis.size > 0) canvasRef.current?.fitTo([...emphasis])
      else canvasRef.current?.fit()
    }, 40)
    return () => clearTimeout(id)
  }, [lens, emphasis])

  // Backing out of a selection returns the camera to the whole graph.
  const hadSelection = useRef(false)
  useEffect(() => {
    if (selectedId) {
      hadSelection.current = true
      return
    }
    if (hadSelection.current) {
      hadSelection.current = false
      canvasRef.current?.fit()
    }
  }, [selectedId])

  const focusConcept = useCallback((id: string) => {
    setSelectedId(id)
    canvasRef.current?.focus(id)
  }, [])

  return (
    <div className="earth-page is-graph">
      <SiteHeader />
      <div className="graph-stage">
        <aside
          className="course-overlay"
          aria-label={selectedNode ? 'Concept inspector' : 'Your courses'}
        >
          {selectedNode?.kind === 'concept' ? (
            <ConceptOverlay
              concept={selectedNode.concept}
              detail={mockConceptDetail(data.course.id, selectedNode.id)}
              nodes={data.graph.nodes}
              edges={data.graph.edges}
              onSelect={focusConcept}
              onClose={() => setSelectedId(null)}
            />
          ) : selectedNode?.kind === 'resource' ? (
            <ResourceOverlay
              node={selectedNode}
              concepts={data.graph.nodes}
              onSelect={focusConcept}
              onClose={() => setSelectedId(null)}
            />
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

        <div className="neural-map">
          <KnowledgeCanvas
            model={model}
            emphasis={emphasis}
            routeIds={[]}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onHover={setHover}
            handleRef={canvasRef}
          />

          <div className="kg-chrome kg-chrome-top">
            <GraphLenses lens={lens} onChange={setLens} />
          </div>

          <div className="kg-chrome kg-chrome-bottom">
            <GraphControls
              onFit={() => canvasRef.current?.fit()}
              onZoomIn={() => canvasRef.current?.zoomBy(1.35)}
              onZoomOut={() => canvasRef.current?.zoomBy(1 / 1.35)}
            />
          </div>

          {hoveredNode && hover ? (
            <GraphTooltip
              node={hoveredNode}
              x={hover.screenX}
              y={hover.screenY}
              connectedCount={model.adjacency.get(hoveredNode.id)?.size ?? 0}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
