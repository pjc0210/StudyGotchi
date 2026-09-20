import { MARKERS } from '../markers'
import { clampPropCount, type MarkerRenderState } from '../state'

export function Controls({
  state,
  onChange,
}: {
  state: MarkerRenderState
  onChange: (patch: Partial<MarkerRenderState>) => void
}) {
  return (
    <aside className="marker-controls">
      <div className="controls-title">
        <span className="marker-kicker">Review controls</span>
        <strong>No signposts</strong>
      </div>

      <label>
        <span>Biome</span>
        <select value={state.markerId} onChange={(event) => onChange({ markerId: event.target.value as MarkerRenderState['markerId'] })}>
          {MARKERS.map((marker) => (
            <option key={marker.id} value={marker.id}>
              {marker.name}
            </option>
          ))}
        </select>
      </label>

      <div className="control-group">
        <span>Props</span>
        <div className="segmented">
          {[2, 3, 4].map((count) => (
            <button key={count} type="button" aria-pressed={state.propCount === count} onClick={() => onChange({ propCount: clampPropCount(count) })}>
              {count}
            </button>
          ))}
        </div>
      </div>

      <div className="control-group">
        <span>Scene</span>
        <div className="toggle-row">
          <button type="button" aria-pressed={state.creature} onClick={() => onChange({ creature: !state.creature })}>
            Creature
          </button>
          <button type="button" aria-pressed={state.night} onClick={() => onChange({ night: !state.night })}>
            Night
          </button>
        </div>
      </div>

      <div className="control-group">
        <span>Mode</span>
        <div className="segmented modes">
          <button type="button" aria-pressed={state.mode === 'review'} onClick={() => onChange({ mode: 'review' })}>
            Bouquet
          </button>
          <button type="button" aria-pressed={state.mode === 'views'} onClick={() => onChange({ mode: 'views' })}>
            Sizes
          </button>
          <button type="button" aria-pressed={state.mode === 'sheet'} onClick={() => onChange({ mode: 'sheet' })}>
            Sheet
          </button>
          <button type="button" aria-pressed={state.mode === 'planet'} onClick={() => onChange({ mode: 'planet' })}>
            Planet
          </button>
        </div>
      </div>
    </aside>
  )
}
