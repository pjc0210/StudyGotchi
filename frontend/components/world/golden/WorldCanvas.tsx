'use client'

import { Canvas } from '@react-three/fiber'
import { GoldenIceScene } from './GoldenIceScene'
import { CAMERA_POSES, GOLDEN_PALETTE, rendererProfile, type GoldenView } from './golden-spec'

export interface WorldCanvasProps {
  /** 0..1 learning progress; drives lit windows, crystals, beacon */
  progress: number
  view: GoldenView
  onResidentFocus: () => void
  /** clear colour behind the island; defaults to the world sky */
  clear?: string
  skyColor?: string
  lightScale?: number
  className?: string
}

/**
 * The approved pixelated ice observatory, fill-parent. Directions place this inside
 * whatever window they design; the canvas sizes to its container.
 */
export function WorldCanvas({
  progress,
  view,
  onResidentFocus,
  clear = GOLDEN_PALETTE.sky,
  skyColor = clear,
  lightScale = 1,
  className,
}: WorldCanvasProps) {
  const profile = rendererProfile('pixel')
  return (
    <div className={className} style={{ position: 'absolute', inset: 0 }} data-treatment="pixel">
      <Canvas
        shadows="basic"
        dpr={1}
        camera={{
          position: CAMERA_POSES.overview.position,
          fov: CAMERA_POSES.overview.fov,
          near: 0.1,
          far: 80,
        }}
        gl={{ antialias: profile.antialias, powerPreference: 'high-performance', alpha: false }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(skyColor)
          camera.lookAt(...CAMERA_POSES.overview.target)
          camera.updateMatrixWorld()
        }}
        style={{ imageRendering: 'pixelated' }}
      >
        <GoldenIceScene
          variant="pixel"
          view={view}
          progress={progress}
          onResidentFocus={onResidentFocus}
          skyColor={skyColor}
          lightScale={lightScale}
        />
      </Canvas>
    </div>
  )
}

export default WorldCanvas
