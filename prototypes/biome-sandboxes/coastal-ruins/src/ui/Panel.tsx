import {
  type BiomeLayout,
  bandLabel,
  courseProgress,
  districtOrder,
  landmarkStage,
  maxBuildings,
  populationFor,
  skylineProfile,
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

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (value: boolean) => void }) {
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
  onChange: (value: number) => void
}) {
  return (
    <label className="lab-slider">
      <span>
        {label} <b>{Number.isInteger(step) ? value : value.toFixed(2)}{unit}</b>
      </span>
      <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
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
  const skyline = skylineProfile(fraction)
  const busy = state.catastrophe.phase !== 'calm'
  return (
    <aside className="lab-panel">
      <header className="lab-header">
        <span className="lab-kicker">Procedural biome sandbox · Direction A</span>
        <h1>{layout.name}</h1>
        <p>Salt-white working coast over older ruins. Fixed limestone, coves, routes, preserves, and headland; seeds only shift occupied district content.</p>
      </header>

      <section className="lab-section">
        <div className="lab-section-head">
          <span className="lab-kicker">Population · 0–100</span>
          <div className="lab-inline">
            {[0, 0.25, 0.5, 0.75, 1].map((value) => (
              <button key={value} type="button" aria-label={`All districts ${value * 100}%`} onClick={() => onAllProgress(value)}>
                {value * 100}
              </button>
            ))}
          </div>
        </div>
        <ol className="lab-regions">
          {districtOrder(layout).map((district) => {
            const progress = state.progress[district.id] ?? 0
            const population = populationFor(district, progress)
            const ruined = state.catastrophe.districtId === district.id && busy
            return (
              <li key={district.id} className="lab-region" data-active={state.focusDistrict === district.id} data-ruined={ruined}>
                <button type="button" className="lab-region-name" onClick={() => onFocusDistrict(district.id)}>
                  <span className="lab-band">D{district.band}</span>
                  <strong>{district.name}</strong>
                  <em>{district.anchor}</em>
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={25}
                  value={progress * 100}
                  aria-label={`${district.name} population`}
                  onChange={(event) => onProgress(district.id, Number(event.target.value) / 100)}
                />
                <div className="lab-region-meta">
                  <span>{bandLabel(progress)}</span>
                  <span>{population.buildings}/{maxBuildings(district)} masses</span>
                  <span>{population.residents ? 'residents' : population.lamps ? 'lamps' : population.props ? 'props' : population.accent ? 'first accent' : 'anchor'}</span>
                  <button className="lab-mini" type="button" disabled={busy} onClick={() => onCatastrophe(district.id)}>break</button>
                </div>
              </li>
            )
          })}
        </ol>
        <div className="lab-readout">
          <span>Course <b>{Math.round(fraction * 100)}%</b></span>
          <span>Landmark <b>{landmarkStage(fraction)}</b></span>
          <span>Skyline <b>{skyline.shoulders} / {skyline.height} m</b></span>
          <span>Seed <b>{state.seed}</b></span>
          {busy && (
            <span className="lab-phase">
              {state.catastrophe.phase}
              {state.catastrophe.phase === 'ruin' && <button className="lab-mini" type="button" onClick={onRecover}>recover</button>}
            </span>
          )}
        </div>
        <Slider label="Creatures" value={state.residents} min={0} max={24} step={1} onChange={(residents) => onPatch({ residents })} />
      </section>

      <section className="lab-section">
        <div className="lab-section-head">
          <span className="lab-kicker">Seeded district variation</span>
          <div className="lab-inline">
            {[1, 7, 99].map((seed) => <button key={seed} type="button" aria-pressed={state.seed === seed} onClick={() => onPatch({ seed })}>s{seed}</button>)}
          </div>
        </div>
        <Slider label="District seed" value={state.seed} min={1} max={99} step={1} onChange={(seed) => onPatch({ seed })} />
        <div className="lab-toggles">
          <Toggle label="Night" on={state.night} onChange={(night) => onPatch({ night })} />
          <Toggle label="Clouds" on={state.clouds} onChange={(clouds) => onPatch({ clouds })} />
          <Toggle label="Boat event" on={state.boatEvent} onChange={(boatEvent) => onPatch({ boatEvent })} />
          <Toggle label="Globe marker" on={state.markerMode} onChange={(markerMode) => onPatch({ markerMode })} />
          <Toggle label="2 px pass" on={state.pixel} onChange={(pixel) => onPatch({ pixel })} />
        </div>
      </section>

      <section className="lab-section">
        <span className="lab-kicker">Camera stations</span>
        <div className="lab-stations">
          {(Object.keys(STATIONS) as StationId[]).map((id) => (
            <button key={id} type="button" aria-pressed={state.station === id} onClick={() => onStation(id)}>{STATIONS[id].label}</button>
          ))}
          <button type="button" className="lab-dive" onClick={onDive} disabled={state.diving}>Dive from globe</button>
        </div>
        <Slider label="Pitch" value={state.camera.pitchDeg} min={34} max={40} step={1} unit="°" onChange={(pitchDeg) => onCamera({ pitchDeg })} />
        <Slider label="Yaw" value={state.camera.azimuthDeg} min={-35} max={35} step={1} unit="°" onChange={(azimuthDeg) => onCamera({ azimuthDeg })} />
        <Slider label="Dolly" value={state.camera.dolly} min={0.72} max={1.55} step={0.01} unit="×" onChange={(dolly) => onCamera({ dolly })} />
        <Slider label="FOV" value={state.camera.fov} min={18} max={40} step={1} unit="°" onChange={(fov) => onCamera({ fov })} />
      </section>

      <footer className="lab-footer">
        <button type="button" onClick={onExport}>Export JSON</button>
        <button type="button" onClick={onScreenshot}>Screenshot</button>
      </footer>
    </aside>
  )
}
