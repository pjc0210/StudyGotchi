import { FRONTIER_LAYOUT as L, bandLabel, courseProgress, districtOrder, landmarkStage, maxBuildings, populationFor } from '../layout/biome-layout'
import { STATIONS, type StationId } from '../camera/stations'
import type { LabState } from '../state'

interface Props {
  state: LabState
  onPatch: (patch: Partial<LabState>) => void
  onProgress: (id: string, value: number) => void
  onAllProgress: (value: number) => void
  onStation: (id: StationId) => void
  onFocus: (id: string) => void
  onCamera: (key: keyof LabState['camera'], value: number) => void
  onBreak: (id: string) => void
  onRecover: () => void
  onExport: () => void
  onScreenshot: () => void
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (next: boolean) => void }) {
  return <button className="toggle" type="button" aria-pressed={value} onClick={() => onChange(!value)}>{label}</button>
}

function Range({ label, value, min, max, step, unit = '', onChange }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="range">
      <span>{label}<b>{value}{unit}</b></span>
      <input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

export function Panel({ state, onPatch, onProgress, onAllProgress, onStation, onFocus, onCamera, onBreak, onRecover, onExport, onScreenshot }: Props) {
  const progress = courseProgress(state.progress)
  return (
    <aside className="panel">
      <header>
        <div className="eyebrow">Territory survey · plan v4</div>
        <h1>Frontier<br />Town</h1>
        <p>A working railhead seen from its fixed south approach: town, industry, ranch, dig and reserve rise toward a fogged northern mesa skyline.</p>
        <div className="stamp">SEED {state.seed.toString().padStart(2, '0')} · {Math.round(progress * 100)}% SETTLED</div>
      </header>

      <section>
        <div className="section-title"><span>Population</span><small>{landmarkStage(progress)} landmark</small></div>
        <div className="band-buttons">
          {[0, 0.25, 0.5, 0.75, 1].map((value) => <button key={value} type="button" onClick={() => onAllProgress(value)}>{value * 100}%</button>)}
        </div>
        <ol className="districts">
          {districtOrder().map((district) => {
            const value = state.progress[district.id] ?? 0
            const pop = populationFor(district, value)
            const active = state.focusDistrict === district.id
            const broken = state.catastrophe.districtId === district.id && state.catastrophe.phase !== 'calm'
            return (
              <li key={district.id} data-active={active} data-broken={broken}>
                <button className="district-name" type="button" onClick={() => onFocus(district.id)}>
                  <span>0{district.band}</span><strong>{district.name}</strong><em>{district.anchor}</em>
                </button>
                <input aria-label={`${district.name} progress`} type="range" min={0} max={1} step={0.25} value={value} onChange={(event) => onProgress(district.id, Number(event.target.value))} />
                <div className="district-meta">
                  <span>{bandLabel(value)}</span><span>{pop.buildings}/{maxBuildings(district)} structures</span>
                  <button type="button" disabled={state.catastrophe.phase !== 'calm'} onClick={() => onBreak(district.id)}>catastrophe</button>
                </div>
              </li>
            )
          })}
        </ol>
        {state.catastrophe.phase !== 'calm' && (
          <div className="alert">
            <span>{state.catastrophe.phase}</span>
            {state.catastrophe.phase === 'ruin' && <button type="button" onClick={onRecover}>Rebuild district</button>}
          </div>
        )}
        <Range label="Creatures" value={state.residents} min={0} max={18} step={1} onChange={(value) => onPatch({ residents: value })} />
      </section>

      <section>
        <div className="section-title"><span>Conditions</span><small>ambient / events</small></div>
        <div className="toggles">
          <Toggle label="Night" value={state.night} onChange={(night) => onPatch({ night })} />
          <Toggle label="Dust" value={state.dust} onChange={(dust) => onPatch({ dust })} />
          <Toggle label="Train event" value={state.train} onChange={(train) => onPatch({ train })} />
          <Toggle label="Wildlife" value={state.wildlife} onChange={(wildlife) => onPatch({ wildlife })} />
          <Toggle label="2 px pass" value={state.pixel} onChange={(pixel) => onPatch({ pixel })} />
        </div>
        <Range label="Placement seed" value={state.seed} min={1} max={99} step={1} onChange={(seed) => onPatch({ seed })} />
        <div className="seed-presets">{[1, 7, 99].map((seed) => <button key={seed} type="button" onClick={() => onPatch({ seed })}>Seed {seed}</button>)}</div>
      </section>

      <section>
        <div className="section-title"><span>Camera stations</span><small>fixed south / look north</small></div>
        <div className="stations">
          {(Object.keys(STATIONS) as StationId[]).map((id) => <button key={id} type="button" aria-pressed={state.station === id} onClick={() => onStation(id)}>{STATIONS[id].label}</button>)}
        </div>
        <Range label="Yaw" value={state.camera.azimuthDeg} min={-35} max={35} step={5} unit="°" onChange={(value) => onCamera('azimuthDeg', value)} />
        <Range label="Pitch" value={state.camera.pitchDeg} min={34} max={40} step={1} unit="°" onChange={(value) => onCamera('pitchDeg', value)} />
        <Range label="Dolly" value={state.camera.dolly} min={1} max={1.35} step={0.05} unit="×" onChange={(value) => onCamera('dolly', value)} />
        <Range label="FOV" value={state.camera.fov} min={26} max={42} step={1} unit="°" onChange={(value) => onCamera('fov', value)} />
      </section>

      <footer>
        <button type="button" onClick={onExport}>Export layout</button>
        <button type="button" onClick={onScreenshot}>Save screenshot</button>
        <small>{L.playable[0]} × {L.playable[1]} m playable · no GLBs</small>
      </footer>
    </aside>
  )
}
