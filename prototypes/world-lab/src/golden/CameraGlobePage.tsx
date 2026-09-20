import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { CameraGlobeScene, type GlobeSpinApi } from './CameraGlobeScene'
import {
  CAMERA_COURSES,
  DEFAULT_PIXEL_GRAIN,
  DEFAULT_GLOBE_LAYOUT_SEED,
  MAX_PIXEL_GRAIN,
  MIN_PIXEL_GRAIN,
  TRACKPAD_SETTLE_MS,
  markerState,
  nearestCourseNeighbors,
  normalizePixelGrain,
  seededCourseDirections,
  trackpadSpin,
} from './camera-globe-spec'
import './camera-globe.css'

interface CameraGlobePageProps {
  onBack: () => void
}

const COURSE_COUNT = CAMERA_COURSES.length

export function CameraGlobePage({ onBack }: CameraGlobePageProps) {
  const directions = useMemo(
    () => seededCourseDirections(COURSE_COUNT, DEFAULT_GLOBE_LAYOUT_SEED),
    [],
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const [pixelGrain, setPixelGrain] = useState(DEFAULT_PIXEL_GRAIN)
  const history = useRef<number[]>([])
  const [historyDepth, setHistoryDepth] = useState(0)
  const spinApi = useRef<GlobeSpinApi | null>(null)
  const settleTimer = useRef<number | null>(null)
  const activeCourse = CAMERA_COURSES[activeIndex]
  const activeMarker = markerState(activeCourse.progress)
  const neighbors = useMemo(
    () => nearestCourseNeighbors(activeIndex, directions, 3),
    [activeIndex, directions],
  )

  const selectCourse = useCallback(
    (index: number) => {
      if (activeIndex === index) return
      history.current.push(activeIndex)
      setHistoryDepth(history.current.length)
      setActiveIndex(index)
    },
    [activeIndex],
  )

  const navigate = useCallback(
    (direction: -1 | 1) => {
      if (direction < 0) {
        const previous = history.current.pop()
        setHistoryDepth(history.current.length)
        if (previous !== undefined) setActiveIndex(previous)
        return
      }
      const previous = history.current.at(-1)
      const destination = neighbors.find((neighbor) => neighbor !== previous) ?? neighbors[0]
      if (destination !== undefined) selectCourse(destination)
    },
    [neighbors, selectCourse],
  )

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const [horizontal, vertical] = trackpadSpin(event.deltaX, event.deltaY)
      spinApi.current?.spin(horizontal, vertical)
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current)
      settleTimer.current = window.setTimeout(() => {
        spinApi.current?.settle()
        settleTimer.current = null
      }, TRACKPAD_SETTLE_MS)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current)
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.target instanceof HTMLElement && event.target.matches('button, input, textarea, select')) return
      if (['ArrowDown', 'ArrowRight', 's', 'd', 'S', 'D'].includes(event.key)) {
        event.preventDefault()
        navigate(1)
      } else if (['ArrowUp', 'ArrowLeft', 'w', 'a', 'W', 'A'].includes(event.key)) {
        event.preventDefault()
        navigate(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const progressPercent = Math.round(activeCourse.progress * 100)
  const progressionChannels = useMemo(
    () => [
      ['Footprint', `${Math.round(activeMarker.footprintScale * 100)}%`],
      ['Skyline', `${activeMarker.tiers} tier${activeMarker.tiers === 1 ? '' : 's'}`],
      ['Landmarks', `${activeMarker.landmarkCount}`],
      ['People', `${activeMarker.pawnCount}`],
    ],
    [activeMarker],
  )

  return (
    <main className="camera-proof-page">
      <div className="camera-proof-canvas" aria-hidden="true">
        <Canvas
          dpr={1}
          camera={{ position: [0, 4, 30], fov: 26, near: 0.1, far: 80 }}
          gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
        >
          <CameraGlobeScene
            activeIndex={activeIndex}
            onActiveChange={selectCourse}
            pixelGrain={pixelGrain}
            spinApi={spinApi}
          />
        </Canvas>
      </div>

      <header className="camera-proof-header">
        <button type="button" onClick={onBack}>Back to golden scene</button>
        <div>
          <span>Camera proof 02</span>
          <strong>Course globe carousel</strong>
        </div>
      </header>

      <div className="camera-proof-left">
        <section className="camera-proof-copy">
          <span className="camera-proof-kicker">Viewing first · placeholder markers</span>
          <h1>The globe stays put. Your courses move through it.</h1>
          <p>
            Drag the globe freely. Release it and the nearest biome settles into the showcase
            position while three new paths appear to its closest neighbors.
          </p>
        </section>

        <section className="camera-active-card" key={activeCourse.code}>
          <div className="camera-active-heading">
            <span style={{ background: activeCourse.ground }} aria-hidden="true" />
            <div>
              <small>{activeCourse.code} · {activeCourse.biome}</small>
              <h2>{activeCourse.name}</h2>
            </div>
            <strong>{progressPercent}%</strong>
          </div>
          <div className="camera-progress-track" aria-label={`${progressPercent}% course progress`}>
            <span style={{ width: `${progressPercent}%`, background: activeCourse.accent }} />
          </div>
          <p>{activeCourse.summary}</p>
          <dl>
            {progressionChannels.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <nav className="camera-course-rail" aria-label="Courses">
          {CAMERA_COURSES.map((course, index) => (
            <button
              key={course.code}
              type="button"
              aria-current={index === activeIndex ? 'true' : undefined}
              onClick={() => selectCourse(index)}
            >
              <span style={{ background: course.ground }} aria-hidden="true" />
              <b>{course.code}</b>
              <small>{course.name}</small>
            </button>
          ))}
        </nav>
      </div>

      <section className="camera-motion-controls" aria-label="Globe motion">
        <label className="camera-grain-control">
          <span>Pixel grain</span>
          <input
            type="range"
            min={MIN_PIXEL_GRAIN}
            max={MAX_PIXEL_GRAIN}
            step="1"
            value={pixelGrain}
            aria-label="Pixel grain"
            onChange={(event) => setPixelGrain(normalizePixelGrain(Number(event.target.value)))}
          />
          <output>{pixelGrain}</output>
        </label>
        <div className="camera-control-block">
          <span>Navigation</span>
          <strong>Free spin · nearest lock · 3 local paths</strong>
        </div>
        <div className="camera-arrow-controls">
          <button
            type="button"
            aria-label="Previous course"
            disabled={historyDepth === 0}
            onClick={() => navigate(-1)}
          >
            ←
          </button>
          <span>{activeIndex + 1} / {COURSE_COUNT}</span>
          <button
            type="button"
            aria-label="Next course"
            onClick={() => navigate(1)}
          >
            →
          </button>
        </div>
      </section>

      <footer className="camera-proof-footer">
        <span>Drag / wheel / two-finger scroll / WASD / arrows</span>
        <span>Modern DS renderer · globe position locked</span>
      </footer>
    </main>
  )
}
