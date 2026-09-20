import {
  type BiomeLayout,
  bandLabel,
  courseProgress,
  districtOrder,
  landmarkStage,
  populationFor,
  volcanoProfile,
} from '../layout/biome-layout'
import { CAMERA_LIMITS, STATIONS, type StationId } from '../camera/stations'
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
  return <button type="button" className="lab-toggle" aria-pressed={on} onClick={() => onChange(!on)}>{label}</button>
}

function Slider({ label, value, min, max, step, unit = '', onChange }: {
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
      <span>{label}<b>{Number.isInteger(step) ? value : value.toFixed(2)}{unit}</b></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

const HORIZON_AUDITS = [
  ['−35° · 1×', -35, 1],
  ['0° · 1×', 0, 1],
  ['+35° · 1×', 35, 1],
  ['−35° · max', -35, CAMERA_LIMITS.horizonMaxDolly],
  ['0° · max', 0, CAMERA_LIMITS.horizonMaxDolly],
  ['+35° · max', 35, CAMERA_LIMITS.horizonMaxDolly],
] as const

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
  const volcano = volcanoProfile(fraction)
  const busy = state.catastrophe.phase !== 'calm'
  return (
    <aside className="lab-panel">
      <header className="lab-header">
        <span className="lab-kicker">Biome sandbox · Direction A</span>
        <h1>{layout.name}</h1>
        <p>Water first. Painted timber lives beneath broad volcanic shoulders; geothermal aqua reads second and quarantined lava last.</p>
        <div className="direction-chip">Fjord First / Ashen Homesteads</div>
      </header>

      <section className="lab-section">
        <div className="lab-section-head">
          <span className="lab-kicker">District population</span>
          <div className="lab-inline">
            {[0, 0.5, 1].map((value) => <button key={value} type="button" onClick={() => onAllProgress(value)}>{value * 100}%</button>)}
          </div>
        </div>
        <ol className="lab-regions">
          {districtOrder(layout).map((district) => {
            const progress = state.progress[district.id] ?? 0
            const population = populationFor(district, progress)
            const ruined = busy && state.catastrophe.districtId === district.id
            return (
              <li key={district.id} className="lab-region" data-active={state.focusDistrict === district.id} data-ruined={ruined}>
                <button type="button" className="lab-region-name" onClick={() => onFocusDistrict(district.id)}>
                  <span className="lab-band">D{district.band}</span>
                  <strong>{district.name}</strong>
                  <em>{district.anchor}</em>
                </button>
                <input aria-label={`${district.name} progress`} type="range" min={0} max={1} step={0.25} value={progress} onChange={(event) => onProgress(district.id, Number(event.target.value))} />
                <div className="lab-region-meta">
                  <span>{bandLabel(progress)}</span>
                  <span>{population.structures} structures</span>
                  <span>{population.extra ? 'district extra' : population.clutter ? 'clutter' : population.fences ? 'fences' : population.accent ? 'first accent' : 'anchor only'}</span>
                  <button type="button" className="lab-mini" disabled={busy} onClick={() => onCatastrophe(district.id)}>rupture</button>
                </div>
              </li>
            )
          })}
        </ol>
        <div className="lab-readout">
          <span>Course <b>{Math.round(fraction * 100)}%</b></span>
          <span>Landmark <b>{landmarkStage(fraction)}</b></span>
          <span>Skyline <b>{volcano.shoulders} shoulders · {volcano.height} m</b></span>
          <span>Preserves <b>3 fixed</b></span>
          {busy && <span className="lab-phase">{state.catastrophe.phase}{state.catastrophe.phase === 'ruin' && <button type="button" className="lab-mini" onClick={onRecover}>recover</button>}</span>}
        </div>
        <Slider label="Creatures / finished problem sets" value={state.residents} min={0} max={16} step={1} onChange={(value) => onPatch({ residents: value })} />
      </section>

      <section className="lab-section">
        <span className="lab-kicker">Atmosphere + deterministic events</span>
        <div className="lab-toggles">
          <Toggle label="Night" on={state.night} onChange={(night) => onPatch({ night })} />
          <Toggle label="Aurora" on={state.aurora} onChange={(aurora) => onPatch({ aurora })} />
          <Toggle label="Fjord mist" on={state.mist} onChange={(mist) => onPatch({ mist })} />
          <Toggle label="Boat + geyser" on={state.ambient} onChange={(ambient) => onPatch({ ambient })} />
          <Toggle label="Fixed 2 px" on={state.pixel} onChange={(pixel) => onPatch({ pixel })} />
        </div>
        <div className="seed-row">
          <span>District seed</span>
          {[1, 7, 99].map((seed) => <button key={seed} type="button" aria-pressed={state.seed === seed} onClick={() => onPatch({ seed })}>{seed}</button>)}
        </div>
        <Slider label="Any seed" value={state.seed} min={1} max={99} step={1} onChange={(seed) => onPatch({ seed })} />
      </section>

      <section className="lab-section">
        <span className="lab-kicker">Camera stations</span>
        <div className="lab-stations">
          {(Object.keys(STATIONS) as StationId[]).map((id) => <button key={id} type="button" aria-pressed={state.station === id} onClick={() => onStation(id)}>{STATIONS[id].label}</button>)}
          <button type="button" className="lab-dive" onClick={onDive} disabled={state.diving}>Dive from globe</button>
        </div>
        <span className="lab-kicker">Front-facing horizon audit</span>
        <div className="horizon-grid">
          {HORIZON_AUDITS.map(([label, azimuth, dolly]) => <button key={label} type="button" onClick={() => { onStation('overview'); onCamera({ azimuthDeg: azimuth, dolly }) }}>{label}</button>)}
        </div>
        <Slider label="Pitch" value={state.camera.pitchDeg} min={CAMERA_LIMITS.pitchMin} max={CAMERA_LIMITS.pitchMax} step={1} unit="°" onChange={(pitchDeg) => onCamera({ pitchDeg })} />
        <Slider label="Yaw" value={state.camera.azimuthDeg} min={-layout.cameraYawLimit} max={layout.cameraYawLimit} step={1} unit="°" onChange={(azimuthDeg) => onCamera({ azimuthDeg })} />
        <Slider label="Dolly" value={state.camera.dolly} min={CAMERA_LIMITS.dollyMin} max={CAMERA_LIMITS.dollyMax} step={0.05} unit="×" onChange={(dolly) => onCamera({ dolly })} />
        <Slider label="FOV" value={state.camera.fov} min={18} max={40} step={1} unit="°" onChange={(fov) => onCamera({ fov })} />
      </section>

      <footer className="lab-footer">
        <button type="button" onClick={onExport}>Export layout JSON</button>
        <button type="button" onClick={onScreenshot}>Screenshot</button>
      </footer>
    </aside>
  )
}
