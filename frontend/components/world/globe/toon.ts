import * as THREE from "three";

/**
 * Creates the three-step ramp used by production globe toon materials.
 * The resource owner must dispose the returned texture.
 */
export function toonGradient(): THREE.DataTexture {
  const texture = new THREE.DataTexture(
    new Uint8Array([120, 200, 255]),
    3,
    1,
    THREE.RedFormat,
  );
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
