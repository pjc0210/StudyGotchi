import * as THREE from 'three'

let ramp: THREE.DataTexture | null = null

/** Three-step toon ramp shared by every surface (bible §6). */
export function toonRamp(): THREE.DataTexture {
  if (ramp) return ramp
  const tex = new THREE.DataTexture(new Uint8Array([118, 200, 255]), 3, 1, THREE.RedFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  ramp = tex
  return tex
}

interface SurfProps {
  color: string
  emissive?: string
  emissiveIntensity?: number
  transparent?: boolean
  opacity?: number
  side?: THREE.Side
  vertexColors?: boolean
}

/** Flat toon surface: two or three colours plus one accent per object is a data rule, not a shader rule. */
export function Surf({
  color,
  emissive = '#000000',
  emissiveIntensity = 0,
  transparent = false,
  opacity = 1,
  side = THREE.FrontSide,
  vertexColors = false,
}: SurfProps) {
  return (
    <meshToonMaterial
      color={color}
      gradientMap={toonRamp()}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      transparent={transparent}
      opacity={opacity}
      side={side}
      vertexColors={vertexColors}
    />
  )
}

export function Glow({ color, on, intensity = 1.2 }: { color: string; on: boolean; intensity?: number }) {
  return (
    <Surf color={on ? color : '#aaa4b4'} emissive={on ? color : '#000000'} emissiveIntensity={on ? intensity : 0} />
  )
}
