import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MARKERS } from './markers'
import { INITIAL_STATE, stateFromSearch, type MarkerRenderState } from './state'
import { Controls } from './ui/Controls'
import { IceReviewBoard, IceSizeViews, MarkerSheet } from './ui/IceReviewBoard'
import { PlanetView } from './ui/PlanetView'
import './app.css'

export default function App() {
  const [state, setState] = useState<MarkerRenderState>(() =>
    typeof window === 'undefined' ? INITIAL_STATE : stateFromSearch(window.location.search),
  )
  const ready = useRef(new Set<string>())
  const marker = MARKERS.find((entry) => entry.id === state.markerId) ?? MARKERS[0]
  const renderKey = `${state.mode}-${state.markerId}-${state.propCount}-${state.creature}-${state.night}`
  const expectedFrames = state.mode === 'sheet' ? MARKERS.length : state.mode === 'planet' ? 1 : 3

  useEffect(() => {
    ready.current.clear()
    delete document.documentElement.dataset.renderReady
  }, [expectedFrames, renderKey])

  const onReady = useCallback(
    (id: string) => {
      ready.current.add(id)
      if (ready.current.size >= expectedFrames) document.documentElement.dataset.renderReady = 'true'
    },
    [expectedFrames],
  )

  const patch = useCallback((next: Partial<MarkerRenderState>) => setState((current) => ({ ...current, ...next })), [])
  const readiness = useMemo(() => `${marker.name} · ${state.propCount} props · ${state.night ? 'night' : 'day'}`, [marker.name, state])

  return (
    <main className="marker-lab">
      <header className="marker-header">
        <div>
          <span className="marker-kicker">StudyGotchi · marker bench</span>
          <h1>Globe markers</h1>
        </div>
        <p>Fixed 2 px pass · {readiness}</p>
      </header>

      <div className="marker-workbench">
        <Controls state={state} onChange={patch} />
        <div className="marker-stage" key={renderKey}>
          {state.mode === 'review' ? (
            <IceReviewBoard marker={marker} state={state} onReady={onReady} />
          ) : state.mode === 'views' ? (
            <IceSizeViews marker={marker} state={state} onReady={onReady} />
          ) : state.mode === 'planet' ? (
            <PlanetView state={state} onReady={onReady} />
          ) : (
            <MarkerSheet state={state} onReady={onReady} />
          )}
        </div>
      </div>
    </main>
  )
}
