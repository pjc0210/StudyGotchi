import * as THREE from "three";

let cached: THREE.DataTexture | null = null;

/** Three-step ramp for MeshToonMaterial: shadow, mid, light. */
export function toonGradient(): THREE.DataTexture {
  if (cached) return cached;
  const data = new Uint8Array([120, 200, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}

const materialCache = new Map<string, THREE.MeshToonMaterial>();

export function toonMaterial(color: string): THREE.MeshToonMaterial {
  let material = materialCache.get(color);
  if (!material) {
    material = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() });
    materialCache.set(color, material);
  }
  return material;
}
