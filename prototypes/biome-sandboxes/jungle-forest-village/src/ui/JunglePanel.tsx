import { STATIONS, type CameraOverride, type StationId } from '../camera/stations'
import type { JungleState } from '../jungle-state'
import {
  JUNGLE_LAYOUT,
  bandLabel,
  courseProgress,
  landmarkStage,
  populationFor,
  skylineProfile,
  type DistrictId,
} from '../layout/jungle-layout'

interface JunglePanelProps {
  state: JungleState
  onProgress: (id: DistrictId, value: number) => void
  onAllProgress: (value: number) => void
  onPatch: (patch: Partial<JungleState>) => void
  onStation: (station: StationId) => void
  onDistrict: (id: DistrictId) => void
  onCamera: (patch: Partial<CameraOverride>) => void
  onYaw: (azimuth: number) => void
  onDive: () => void
  onCatastrophe: (id: DistrictId) => void
  onRecover: () => void
  onExport: () => void
  onScreenshot: () => void
}

const YAW_CHECKS = [
  ['−35°', -35],
  ['front 0°', 0],
  ['+35°', 35],
] as const

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (next: boolean) => void }) {
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
        {label}
        <b>
          {Number.isInteger(step) ? value : value.toFixed(2)}
          {unit}
        </b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

export function JunglePanel({
  state,
  onProgress,
  onAllProgress,
  onPatch,
  onStation,
  onDistrict,
  onCamera,
  onYaw,
  onDive,
  onCatastrophe,
  onRecover,
  onExport,
  onScreenshot,
}: JunglePanelProps) {
  const fraction = courseProgress(state.progress)
  const skyline = skylineProfile(fraction)
  const stage = landmarkStage(fraction)
  const busy = state.catastrophe.phase !== 'calm'

  return (
    <aside className="lab-panel">
      <header className="lab-header">
        <span className="lab-kicker">Biome sandbox · direction A</span>
        <h1>River-Canopy Commons</h1>
        <p>
          A vertical treehouse settlement follows one fixed waterfall-river-lagoon system. District population and canopy
          skyline grow; protected ground, bridges, glades, and the shrine headland stay fixed.
        </p>
        <div className="direction-chip">
          <i />
          Jungle / Forest Village
          <span>procedural primitives</span>
        </div>
      </header>

      <section className="lab-section">
        <div className="lab-section-head">
          <span className="lab-kicker">Population bands</span>
          <div className="lab-inline">
            {[0, 0.25, 0.5, 0.75, 1].map((value) => (
              <button key={value} type="button" onClick={() => onAllProgress(value)}>
                {value * 100}%
              </button>
            ))}
          </div>
        </div>
        <ol className="lab-regions">
          {JUNGLE_LAYOUT.districts.map((district, index) => {
            const progress = state.progress[district.id] ?? 0
            const population = populationFor(district, progress)
            const active = state.focusDistrict === district.id
            const ruined = busy && state.catastrophe.districtId === district.id
            return (
              <li key={district.id} className="lab-region" data-active={active} data-ruined={ruined}>
                <button type="button" className="lab-region-name" onClick={() => onDistrict(district.id)}>
                  <span className="lab-band">{String(index + 1).padStart(2, '0')}</span>
                  <strong>{district.name}</strong>
                  <em>{district.anchor}</em>
                </button>
                <input
                  aria-label={`${district.name} progress`}
                  type="range"
                  min={0}
                  max={1}
                  step={0.25}
                  value={progress}
                  onChange={(event) => onProgress(district.id, Number(event.target.value))}
                />
                <div className="lab-region-meta">
                  <span>{bandLabel(progress)}</span>
                  <span>
                    {population.primary} {district.primaryLabel}
                  </span>
                  <span>
                    {population.secondary} {district.secondaryLabel}
                  </span>
                  <button
                    type="button"
                    className="lab-mini"
                    disabled={busy}
                    title="Trigger monsoon and strangler-bloom catastrophe"
                    onClick={() => onCatastrophe(district.id)}
                  >
                    monsoon
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
            Shrine <b>{stage}</b>
          </span>
          <span>
            Canopy <b>{skyline.crowns} crowns · {skyline.maxHeight} m</b>
          </span>
          <span>
            Ground <b>fixed y = 0</b>
          </span>
          {busy && (
            <span className="lab-phase">
              {state.catastrophe.phase}
              {state.catastrophe.phase === 'overgrowth' && (
                <button type="button" className="lab-mini" onClick={onRecover}>
                  restore
                </button>
              )}
            </span>
          )}
        </div>
        <Slider label="Residents (finished psets)" value={state.residents} min={0} max={18} step={1} onChange={(residents) => onPatch({ residents })} />
      </section>

      <section className="lab-section">
        <div className="lab-section-head">
          <span className="lab-kicker">Ambient layers</span>
          <span className="section-note">never progress</span>
        </div>
        <div className="lab-toggles">
          <Toggle label="Night" on={state.night} onChange={(night) => onPatch({ night })} />
          <Toggle label="Canopy mist" on={state.mist} onChange={(mist) => onPatch({ mist })} />
          <Toggle label="Bird events" on={state.birds} onChange={(birds) => onPatch({ birds })} />
          <Toggle label="Water event" on={state.waterEvent} onChange={(waterEvent) => onPatch({ waterEvent })} />
          <Toggle label="Fixed 2 px pass" on={state.pixel} onChange={(pixel) => onPatch({ pixel })} />
        </div>
        <div className="seed-row" aria-label="Seed presets">
          <span>Seed</span>
          {[1, 7, 99].map((seed) => (
            <button key={seed} type="button" aria-pressed={state.seed === seed} onClick={() => onPatch({ seed })}>
              {seed}
            </button>
          ))}
        </div>
        <Slider label="District synthesis seed" value={state.seed} min={1} max={99} step={1} onChange={(seed) => onPatch({ seed })} />
      </section>

      <section className="lab-section">
        <div className="lab-section-head">
          <span className="lab-kicker">Front-facing camera</span>
          <span className="section-note">south → north · yaw ±35°</span>
        </div>
        <div className="lab-stations">
          {(Object.keys(STATIONS) as StationId[]).map((station) => (
            <button key={station} type="button" aria-pressed={state.station === station} onClick={() => onStation(station)}>
              {station === 'resident' ? 'Creature' : STATIONS[station].label}
            </button>
          ))}
          <button type="button" className="lab-dive" onClick={onDive} disabled={state.diving}>
            Dive from globe
          </button>
        </div>
        <div className="horizon-grid" aria-label="Diorama yaw checks">
          {YAW_CHECKS.map(([label, azimuth]) => (
            <button key={label} type="button" onClick={() => onYaw(azimuth)}>
              {label}
            </button>
          ))}
        </div>
        <Slider label="Pitch" value={state.camera.pitchDeg} min={34} max={40} step={1} unit="°" onChange={(pitchDeg) => onCamera({ pitchDeg })} />
        <Slider label="Yaw" value={state.camera.azimuthDeg} min={-35} max={35} step={1} unit="°" onChange={(azimuthDeg) => onCamera({ azimuthDeg })} />
        <Slider label="Dolly" value={state.camera.dolly} min={0.6} max={1.55} step={0.05} unit="×" onChange={(dolly) => onCamera({ dolly })} />
        <Slider label="FOV" value={state.camera.fov} min={20} max={36} step={1} unit="°" onChange={(fov) => onCamera({ fov })} />
      </section>

      <footer className="lab-footer">
        <button type="button" onClick={() => onPatch({ comparison: !state.comparison })} aria-pressed={state.comparison}>
          Comparison board
        </button>
        <button type="button" onClick={onExport}>
          Export layout
        </button>
        <button type="button" onClick={onScreenshot}>
          Screenshot
        </button>
      </footer>
    </aside>
  )
}
