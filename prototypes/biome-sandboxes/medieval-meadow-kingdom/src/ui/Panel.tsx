import {
  OPEN_SHARE,
  bandLabel,
  courseProgress,
  districtOrder,
  greenCrownProfile,
  landmarkStage,
  maxBuildings,
  populationFor,
  type GeneratedKingdom,
} from '../layout/biome-layout'
import { STATIONS, type StationId } from '../camera/stations'
import type { LabState } from '../state'

interface PanelProps {
  layout: GeneratedKingdom
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
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
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
  const crown = greenCrownProfile(fraction)
  const busy = state.catastrophe.phase !== 'calm'

  return (
    <aside className="lab-panel">
      <header className="lab-header">
        <span className="lab-kicker">Isolated procedural biome sandbox</span>
        <h1>{layout.name}</h1>
        <p>
          A river kingdom with five rural districts, one castle landmark, 39% open meadow/water,
          and a north-facing Green Crown skyline with wooded side wings.
        </p>
      </header>

      <section className="lab-section">
        <div className="lab-section-head">
          <span className="lab-kicker">District growth</span>
          <div className="lab-inline">
            <button type="button" onClick={() => onAllProgress(0)}>0%</button>
            <button type="button" onClick={() => onAllProgress(0.5)}>50%</button>
            <button type="button" onClick={() => onAllProgress(1)}>100%</button>
          </div>
        </div>
        <ol className="lab-regions">
          {districtOrder(layout).map((district) => {
            const progress = state.progress[district.id] ?? 0
            const population = populationFor(district, progress)
            return (
              <li
                key={district.id}
                className="lab-region"
                data-active={state.focusDistrict === district.id}
                data-ruined={state.catastrophe.districtId === district.id && busy}
              >
                <button type="button" className="lab-region-name" onClick={() => onFocusDistrict(district.id)}>
                  <span className="lab-band">t{district.band}</span>
                  <strong>{district.name}</strong>
                  <em>{district.anchor}</em>
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.25}
                  value={progress}
                  aria-label={`${district.name} progress`}
                  onChange={(event) => onProgress(district.id, Number(event.target.value))}
                />
                <div className="lab-region-meta">
                  <span>{bandLabel(progress)}</span>
                  <span>{population.buildings}/{maxBuildings(district)} built</span>
                  <span>{population.extras ? 'full common' : population.clutter ? 'clutter' : population.workProps ? 'work props' : population.accent ? 'first light' : 'anchor'}</span>
                  <button
                    type="button"
                    className="lab-mini"
                    disabled={busy}
                    onClick={() => onCatastrophe(district.id)}
                  >
                    break
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
        <div className="lab-readout">
          <span>Course <b>{Math.round(fraction * 100)}%</b></span>
          <span>Castle <b>{landmarkStage(fraction)}</b></span>
          <span>Green Crown Commons <b>{crown.crowns} crowns</b></span>
          <span>Open <b>{Math.round(OPEN_SHARE * 100)}%</b></span>
          <span>Seed <b>{state.seed}</b></span>
          {busy && (
            <span className="lab-phase">
              {state.catastrophe.phase}
              {state.catastrophe.phase === 'ruin' && (
                <button type="button" className="lab-mini" onClick={onRecover}>recover</button>
              )}
            </span>
          )}
        </div>
        <Slider label="Creatures" value={state.residents} min={0} max={12} step={1} onChange={(residents) => onPatch({ residents })} />
      </section>

      <section className="lab-section">
        <span className="lab-kicker">Ambient + procedural seed</span>
        <div className="lab-toggles">
          <Toggle label="Night" on={state.night} onChange={(night) => onPatch({ night })} />
          <Toggle label="Clouds" on={state.clouds} onChange={(clouds) => onPatch({ clouds })} />
          <Toggle label="Meadow motes" on={state.snowfall} onChange={(snowfall) => onPatch({ snowfall })} />
          <Toggle label="Birds" on={state.whale} onChange={(whale) => onPatch({ whale })} />
          <Toggle label="2 px pass" on={state.pixel} onChange={(pixel) => onPatch({ pixel })} />
          <Toggle label="Reference board" on={state.showReferences} onChange={(showReferences) => onPatch({ showReferences })} />
        </div>
        <Slider label="Seed" value={state.seed} min={1} max={99} step={1} onChange={(seed) => onPatch({ seed })} />
        <div className="lab-inline">
          {[1, 7, 99].map((seed) => <button key={seed} type="button" onClick={() => onPatch({ seed })}>Seed {seed}</button>)}
        </div>
      </section>

      <section className="lab-section">
        <span className="lab-kicker">Camera stations</span>
        <div className="lab-stations">
          {(Object.keys(STATIONS) as StationId[]).map((id) => (
            <button key={id} type="button" aria-pressed={state.station === id} onClick={() => onStation(id)}>
              {STATIONS[id].label}
            </button>
          ))}
          <button type="button" className="lab-dive" onClick={onDive} disabled={state.diving}>Dive from globe</button>
        </div>
        <Slider label="Pitch" value={state.camera.pitchDeg} min={34} max={40} step={1} unit="°" onChange={(pitchDeg) => onCamera({ pitchDeg })} />
        <Slider label="Yaw" value={state.camera.azimuthDeg} min={-35} max={35} step={1} unit="°" onChange={(azimuthDeg) => onCamera({ azimuthDeg })} />
        <Slider label="Dolly" value={state.camera.dolly} min={0.5} max={2.2} step={0.05} unit="×" onChange={(dolly) => onCamera({ dolly })} />
        <Slider label="FOV" value={state.camera.fov} min={18} max={40} step={1} unit="°" onChange={(fov) => onCamera({ fov })} />
      </section>

      <footer className="lab-footer">
        <button type="button" onClick={onExport}>Export kingdom JSON</button>
        <button type="button" onClick={onScreenshot}>Screenshot</button>
      </footer>
    </aside>
  )
}
