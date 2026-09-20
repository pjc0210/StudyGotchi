import {
  type BiomeLayout,
  bandLabel,
  courseProgress,
  districtOrder,
  landmarkStage,
  maxBuildings,
  mountainProfile,
  populationFor,
} from '../layout/biome-layout'
import { STATIONS, type StationId } from '../camera/stations'
import type { LabState } from '../state'

interface PanelProps {
  layout: BiomeLayout
  state: LabState
  onProgress: (districtId: string, value: number) => void
  onAllProgress: (value: number) => void
  onPatch: (patch: Partial<LabState>) => void
  onStation: (id: StationId) => void
  onFocusDistrict: (id: string) => void
  onCamera: (patch: Partial<LabState['camera']>) => void
  onDive: () => void
  onCatastrophe: (districtId: string) => void
  onRecover: () => void
  onExport: () => void
  onScreenshot: () => void
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" className="lab-toggle" aria-pressed={on} onClick={() => onChange(!on)}>
      {label}
    </button>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <label className="lab-slider">
      <span>
        {label} <b>{Number.isInteger(step) ? value : value.toFixed(2)}{unit}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

export function Panel({
  layout,
  state,
  onProgress,
  onAllProgress,
  onPatch,
  onStation,
  onFocusDistrict,
  onCamera,
  onDive,
  onCatastrophe,
  onRecover,
  onExport,
  onScreenshot,
}: PanelProps) {
  const fraction = courseProgress(layout, state.progress)
  const range = mountainProfile(fraction)
  const busy = state.catastrophe.phase !== 'calm'

  return (
    <aside className="lab-panel">
      <header className="lab-header">
        <span className="lab-kicker">World builder · biome lab</span>
        <h1>{layout.name}</h1>
        <p>
          One course, one kingdom. Each district is a topic, shaped by the land, and grows by population: buildings, props,
          lights, residents. Only the mountain range behind the town rises with the course.
        </p>
      </header>

      <section className="lab-section">
        <div className="lab-section-head">
          <span className="lab-kicker">Districts · progress</span>
          <div className="lab-inline">
            <button type="button" onClick={() => onAllProgress(0)}>0%</button>
            <button type="button" onClick={() => onAllProgress(0.5)}>50%</button>
            <button type="button" onClick={() => onAllProgress(1)}>100%</button>
          </div>
        </div>
        <ol className="lab-regions">
          {districtOrder(layout).map((district) => {
            const p = state.progress[district.id] ?? 0
            const pop = populationFor(district, p)
            const active = state.focusDistrict === district.id
            const ruined = state.catastrophe.districtId === district.id && busy
            return (
              <li key={district.id} className="lab-region" data-active={active} data-ruined={ruined}>
                <button
                  type="button"
                  className="lab-region-name"
                  onClick={() => onFocusDistrict(district.id)}
                  title="Snap the camera to this district"
                >
                  <span className="lab-band">t{district.band}</span>
                  <strong>{district.name}</strong>
                  <em>{district.anchor}</em>
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.25}
                  value={p}
                  aria-label={`${district.name} progress`}
                  onChange={(e) => onProgress(district.id, Number(e.target.value))}
                />
                <div className="lab-region-meta">
                  <span>{bandLabel(p)}</span>
                  <span>
                    {pop.buildings}/{maxBuildings(district)} built
                  </span>
                  <span>{pop.extras ? 'extras' : pop.clutter ? 'clutter' : pop.fences ? 'fences' : pop.accent ? 'first light' : 'anchor'}</span>
                  <button
                    type="button"
                    className="lab-mini"
                    disabled={busy}
                    onClick={() => onCatastrophe(district.id)}
                    title="Blizzard, fall apart, lights out and props knocked over"
                  >
                    break
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
        <div className="lab-readout">
          <span>
            Course <b>{Math.round(fraction * 100)}%</b>
          </span>
          <span>
            Landmark <b>{landmarkStage(fraction)}</b>
          </span>
          <span>
            Range <b>{range.peaks}{range.secondRow ? '+6' : ''} peaks</b>
          </span>
          <span>
            Residents <b>{state.residents}</b>
          </span>
          {busy && (
            <span className="lab-phase">
              {state.catastrophe.phase}
              {state.catastrophe.phase === 'ruin' && (
                <button type="button" className="lab-mini" onClick={onRecover}>
                  recover
                </button>
              )}
            </span>
          )}
        </div>
        <Slider label="Residents (finished psets)" value={state.residents} min={0} max={12} step={1} onChange={(v) => onPatch({ residents: v })} />
      </section>

      <section className="lab-section">
        <span className="lab-kicker">Ambient · always on, never progress</span>
        <div className="lab-toggles">
          <Toggle label="Night" on={state.night} onChange={(v) => onPatch({ night: v })} />
          <Toggle label="Clouds" on={state.clouds} onChange={(v) => onPatch({ clouds: v })} />
          <Toggle label="Snowfall" on={state.snowfall} onChange={(v) => onPatch({ snowfall: v })} />
          <Toggle label="Whale events" on={state.whale} onChange={(v) => onPatch({ whale: v })} />
          <Toggle label="DS pixel pass" on={state.pixel} onChange={(v) => onPatch({ pixel: v })} />
        </div>
        <Slider label="Prop seed" value={state.seed} min={1} max={99} step={1} onChange={(v) => onPatch({ seed: v })} />
      </section>

      <section className="lab-section">
        <span className="lab-kicker">Camera stations</span>
        <div className="lab-stations">
          {(Object.keys(STATIONS) as StationId[]).map((id) => (
            <button key={id} type="button" aria-pressed={state.station === id} onClick={() => onStation(id)}>
              {STATIONS[id].label}
            </button>
          ))}
          <button type="button" className="lab-dive" onClick={onDive} disabled={state.diving}>
            Dive from globe
          </button>
        </div>
        <Slider label="Pitch" value={state.camera.pitchDeg} min={10} max={70} step={1} unit="°" onChange={(v) => onCamera({ pitchDeg: v })} />
        <Slider label="Azimuth" value={state.camera.azimuthDeg} min={-180} max={180} step={1} unit="°" onChange={(v) => onCamera({ azimuthDeg: v })} />
        <Slider label="Dolly" value={state.camera.dolly} min={0.5} max={2.2} step={0.05} unit="×" onChange={(v) => onCamera({ dolly: v })} />
        <Slider label="FOV" value={state.camera.fov} min={18} max={40} step={1} unit="°" onChange={(v) => onCamera({ fov: v })} />
      </section>

      <footer className="lab-footer">
        <button type="button" onClick={onExport}>
          Export biome-layout.json
        </button>
        <button type="button" onClick={onScreenshot}>
          Screenshot
        </button>
      </footer>
    </aside>
  )
}
