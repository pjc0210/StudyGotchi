import { useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GoldenIceScene } from '../golden/GoldenIceScene'
import {
  CAMERA_POSES,
  GOLDEN_PALETTE,
  rendererProfile,
  type GoldenView,
} from '../golden/golden-spec'

export interface WorldCanvasProps {
  /** 0..1 learning progress; drives lit windows, crystals, beacon */
  progress: number
  view: GoldenView
  onResidentFocus: () => void
  /** clear colour behind the island; defaults to the world sky, and a `--world-sky` custom
   *  property on any ancestor (set by the palette lab) overrides it live */
  clear?: string
  className?: string
}

/** Chromium reports color-mix() results as `color(srgb r g b)` or `rgb(r, g, b)`; three parses neither reliably. */
function parseCssColor(value: string): THREE.Color | null {
  const nums = value.match(/-?\d*\.?\d+/g)?.map(Number)
  if (!nums || nums.length < 3) return null
  const [r, g, b] = nums
  const scale = value.startsWith('color(') ? 1 : 1 / 255
  return new THREE.Color().setRGB(r * scale, g * scale, b * scale, THREE.SRGBColorSpace)
}

/**
 * Keeps the renderer's clear colour in step with the `--world-sky` custom property. The probe
 * element's computed `color` resolves color-mix() to rgb(), which three can parse.
 */
function SkyClear({ probe }: { probe: React.RefObject<HTMLSpanElement | null> }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const last = useRef('')
  const tick = useRef(0)
  useFrame(() => {
    if (tick.current++ % 20 !== 0 || !probe.current) return
    const value = getComputedStyle(probe.current).color
    if (value && value !== last.current) {
      last.current = value
      const colour = parseCssColor(value)
      if (!colour) return
      gl.setClearColor(colour)
      // the scene declares its own sky background and fog; the palette wins over both
      if (scene.background instanceof THREE.Color) scene.background.copy(colour)
      if (scene.fog) scene.fog.color.copy(colour)
    }
  })
  return null
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
  className,
}: WorldCanvasProps) {
  const profile = rendererProfile('pixel')
  const probe = useRef<HTMLSpanElement>(null)
  return (
    <div className={className} style={{ position: 'absolute', inset: 0 }} data-treatment="pixel">
      <span
        ref={probe}
        aria-hidden="true"
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', color: `var(--world-sky, ${clear})` }}
      />
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
          gl.setClearColor(clear)
          camera.lookAt(...CAMERA_POSES.overview.target)
          camera.updateMatrixWorld()
        }}
        style={{ imageRendering: 'pixelated' }}
      >
        <SkyClear probe={probe} />
        <GoldenIceScene
          variant="pixel"
          view={view}
          progress={progress}
          onResidentFocus={onResidentFocus}
        />
      </Canvas>
    </div>
  )
}
