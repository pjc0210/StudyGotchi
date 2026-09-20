import * as THREE from 'three'

let ramp: THREE.DataTexture | null = null

export function toonRamp(): THREE.DataTexture {
  if (ramp) return ramp
  const texture = new THREE.DataTexture(new Uint8Array([118, 200, 255]), 3, 1, THREE.RedFormat)
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  ramp = texture
  return texture
}

export function Surf({
  color,
  emissive = '#000000',
  emissiveIntensity = 0,
  transparent = false,
  opacity = 1,
  side = THREE.FrontSide,
}: {
  color: string
  emissive?: string
  emissiveIntensity?: number
  transparent?: boolean
  opacity?: number
  side?: THREE.Side
}) {
  return (
    <meshToonMaterial
      color={color}
      gradientMap={toonRamp()}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      transparent={transparent}
      opacity={opacity}
      side={side}
    />
  )
}

export function Glow({ color, on, intensity = 1.6 }: { color: string; on: boolean; intensity?: number }) {
  return <Surf color={on ? color : '#aaa4b4'} emissive={on ? color : '#000000'} emissiveIntensity={on ? intensity : 0} />
}
