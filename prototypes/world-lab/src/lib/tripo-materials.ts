import * as THREE from 'three'

const materialCache = new Map<string, THREE.MeshToonMaterial>()

/** Preserve baked face markings when the creature renderer swaps materials. */
export function tripoToonMaterial(
  source: THREE.Material,
  gradientMap: THREE.Texture,
): THREE.MeshToonMaterial {
  const original = source as THREE.MeshStandardMaterial
  const color = original.color?.clone() ?? new THREE.Color('#ffffff')
  const map = original.map ?? null
  const key = `${color.getHexString()}:${map?.uuid ?? 'none'}:${gradientMap.uuid}:${source.side}`
  let material = materialCache.get(key)
  if (!material) {
    material = new THREE.MeshToonMaterial({ color, map, gradientMap, side: source.side })
    materialCache.set(key, material)
  }
  return material
}
