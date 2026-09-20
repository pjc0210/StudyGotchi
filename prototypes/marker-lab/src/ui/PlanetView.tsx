import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { MARKERS } from '../markers'
import type { MarkerRenderState } from '../state'
import { PixelComposer } from '../render/PixelComposer'
import { PlanetMarkers } from '../scene/PlanetMarkers'

export function PlanetView({
  state,
  onReady,
}: {
  state: MarkerRenderState
  onReady: (id: string) => void
}) {
  return (
    <section className="planet-view" aria-label="Planet marker belt">
      <div className="planet-canvas">
        <Canvas
          shadows
          dpr={1}
          camera={{ position: [0, 110, 380], fov: 36, near: 0.1, far: 1200 }}
          gl={{ antialias: false, preserveDrawingBuffer: true }}
          onCreated={() => onReady('planet')}
        >
          <color attach="background" args={[state.night ? '#17152c' : '#e8e2f2']} />
          <hemisphereLight args={[state.night ? '#3a2f45' : '#f3e4ee', state.night ? '#221d30' : '#d9c3d6', state.night ? 1.1 : 1.8]} />
          <directionalLight
            position={state.night ? [-80, 70, 120] : [-110, 140, 160]}
            color={state.night ? '#8fa3d8' : '#fff1dc'}
            intensity={state.night ? 2.2 : 3}
            castShadow
          />
          <PlanetMarkers propCount={state.propCount} night={state.night} creature={state.creature} />
          <OrbitControls enablePan={false} minDistance={300} maxDistance={560} target={[0, 0, 0]} />
          <PixelComposer />
        </Canvas>
      </div>
      <p className="planet-caption">{MARKERS.length} bouquets on one belt · drag to orbit</p>
    </section>
  )
}
