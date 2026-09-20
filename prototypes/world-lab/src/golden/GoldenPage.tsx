import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { GoldenIceScene } from './GoldenIceScene'
import {
  CAMERA_POSES,
  GOLDEN_PALETTE,
  GOLDEN_RESIDENTS,
  progressState,
  rendererProfile,
  type GoldenVariant,
  type GoldenView,
} from './golden-spec'
import './golden.css'

interface GoldenPageProps {
  onBack: () => void
  onCameraProof: () => void
}

const STAGES = [
  { label: 'Touched', value: 0.2 },
  { label: 'Demonstrated', value: 0.5 },
  { label: 'Mastered', value: 0.9 },
] as const

export function GoldenPage({ onBack, onCameraProof }: GoldenPageProps) {
  const [variant, setVariant] = useState<GoldenVariant>('pixel')
  const [view, setView] = useState<GoldenView>('overview')
  const [progress, setProgress] = useState(0.5)
  const profile = rendererProfile(variant)
  const state = progressState(progress)
  const activeResident = GOLDEN_RESIDENTS[0]

  return (
    <main className={`golden-page${view === 'resident' ? ' is-resident' : ''}`}>
      <div className="golden-canvas" data-treatment={variant}>
        <Canvas
          key={variant}
          shadows={variant === 'pixel' ? 'basic' : 'percentage'}
          dpr={variant === 'pixel' ? 1 : [1, 1.5]}
          camera={{
            position: CAMERA_POSES.overview.position,
            fov: CAMERA_POSES.overview.fov,
            near: 0.1,
            far: 80,
          }}
          gl={{
            antialias: profile.antialias,
            powerPreference: 'high-performance',
            alpha: false,
          }}
          onCreated={({ gl, camera }) => {
            gl.setClearColor(GOLDEN_PALETTE.sky)
            camera.lookAt(...CAMERA_POSES.overview.target)
            camera.updateMatrixWorld()
          }}
        >
          <GoldenIceScene
            variant={variant}
            view={view}
            progress={progress}
            onResidentFocus={() => setView('resident')}
          />
        </Canvas>
      </div>

      <header className="golden-header">
        <button type="button" className="golden-back" onClick={onBack}>
          Back to lab
        </button>
        <div className="golden-title">
          <span>Visual proof 01</span>
          <strong>The Ice Observatory</strong>
        </div>
        <p>Same scene. Same camera. Two rendering treatments.</p>
      </header>

      <section className="golden-controls" aria-label="Visual proof controls">
        <div className="golden-control-group">
          <span className="golden-label">Treatment</span>
          <div className="golden-segmented">
            <button
              type="button"
              aria-pressed={variant === 'pixel'}
              onClick={() => setVariant('pixel')}
            >
              A · Modern DS
            </button>
            <button
              type="button"
              aria-pressed={variant === 'toy'}
              onClick={() => setVariant('toy')}
            >
              B · Clean toy
            </button>
          </div>
        </div>

        <div className="golden-control-group">
          <span className="golden-label">Camera</span>
          <div className="golden-segmented">
            <button
              type="button"
              aria-pressed={view === 'overview'}
              onClick={() => setView('overview')}
            >
              Overview
            </button>
            <button
              type="button"
              aria-pressed={view === 'resident'}
              onClick={() => setView('resident')}
            >
              Resident
            </button>
          </div>
        </div>
        <div className="golden-control-group">
          <span className="golden-label">Next proof</span>
          <button type="button" className="golden-camera-link" onClick={onCameraProof}>
            Globe carousel
          </button>
        </div>
      </section>

      <section className="golden-story">
        <span className="golden-kicker">6.1210 · Sorting & recurrences</span>
        <h1>Your work keeps the observatory awake.</h1>
        <p>
          Demonstrated ideas light windows, reveal crystals, and strengthen the beacon. No extra
          buildings are added just to fill space.
        </p>
        <div className="golden-stage-switch" aria-label="Learning progress">
          {STAGES.map((stage) => (
            <button
              key={stage.label}
              type="button"
              aria-pressed={progress === stage.value}
              onClick={() => setProgress(stage.value)}
            >
              <span>{stage.label}</span>
              <small>{stage.value === 0.2 ? 'Lecture opened' : stage.value === 0.5 ? 'Problem solved' : 'Assessment confirmed'}</small>
            </button>
          ))}
        </div>
      </section>

      <aside className="golden-status" data-stage={state.stage}>
        <div>
          <span className="golden-label">World response</span>
          <strong>{state.stage}</strong>
        </div>
        <dl>
          <div>
            <dt>Windows</dt>
            <dd>{state.litWindows}/5</dd>
          </div>
          <div>
            <dt>Crystals</dt>
            <dd>{state.crystalCount}/5</dd>
          </div>
          <div>
            <dt>Residents</dt>
            <dd>3</dd>
          </div>
        </dl>
      </aside>

      {view === 'resident' && (
        <aside className="golden-resident-card">
          <span className="golden-label">Resident 01 · Ice bird</span>
          <h2>{activeResident.name}</h2>
          <p>{activeResident.line}</p>
          <div>
            <span>Evidence</span>
            <strong>Merge sort invariant · graded correct</strong>
          </div>
          <button type="button" onClick={() => setView('overview')}>
            Return to observatory
          </button>
        </aside>
      )}

      <footer className="golden-footer">
        <span>{variant === 'pixel' ? '480p-feel pixel pass · hard facets · native UI' : 'High-resolution canvas · smooth toy materials · soft shadows'}</span>
        <span>Click Pip to focus</span>
      </footer>
    </main>
  )
}
