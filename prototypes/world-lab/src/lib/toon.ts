import * as THREE from 'three'

let cached: THREE.DataTexture | null = null

/** Three-step ramp for MeshToonMaterial: shadow, mid, light. */
export function toonGradient(): THREE.DataTexture {
  if (cached) return cached
  const data = new Uint8Array([120, 200, 255])
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  cached = tex
  return tex
}

const materialCache = new Map<string, THREE.MeshToonMaterial>()

/** colours that glow at night: window slots (#ffe9a8), procedural lamp bulbs (#ffe36b) */
const EMISSIVE_AT_NIGHT: Record<string, number> = { '#ffe9a8': 1.4, '#ffe36b': 1.6, '#ffd27a': 1.6 }
let nightOn = false

export function toonMaterial(color: string): THREE.MeshToonMaterial {
  let m = materialCache.get(color)
  if (!m) {
    m = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() })
    materialCache.set(color, m)
    if (nightOn) applyNight(m, color)
  }
  return m
}

function applyNight(m: THREE.MeshToonMaterial, color: string) {
  const k = EMISSIVE_AT_NIGHT[color.toLowerCase()]
  if (k && nightOn) {
    m.emissive.set(color)
    m.emissiveIntensity = k
  } else {
    m.emissive.set('#000000')
    m.emissiveIntensity = 1
  }
}

/** Night: every shared toon material with a window / lamp colour becomes emissive; day resets it. */
export function setToonNight(on: boolean) {
  if (nightOn === on) return
  nightOn = on
  for (const [color, m] of materialCache) applyNight(m, color)
}
