import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js'
import { rendererProfile } from '../golden/golden-spec'
import { SPRITE_FOV, SPRITE_VIEW, type SpriteDef } from './art-spec'

/** The overview direction, backed off until the bounding sphere fills the frame with a margin. */
export function placeCamera(camera: THREE.PerspectiveCamera, def: SpriteDef) {
  const distance = (def.radius / Math.sin((SPRITE_FOV / 2) * (Math.PI / 180))) * 1.04
  camera.fov = SPRITE_FOV
  camera.near = 0.5
  camera.far = 60
  camera.position.set(
    def.centre[0] + SPRITE_VIEW[0] * distance,
    def.centre[1] + SPRITE_VIEW[1] * distance,
    def.centre[2] + SPRITE_VIEW[2] * distance,
  )
  camera.lookAt(def.centre[0], def.centre[1], def.centre[2])
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
}

export interface PixelBundle {
  composer: EffectComposer
  pass: RenderPixelatedPass
}

/** The world's pixel pass (size, edge strengths) on a transparent canvas. */
export function makeComposer(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, pixelSize: number): PixelBundle {
  const profile = rendererProfile('pixel')
  const composer = new EffectComposer(gl)
  const pass = new RenderPixelatedPass(pixelSize, scene, camera, {
    normalEdgeStrength: profile.normalEdgeStrength,
    depthEdgeStrength: profile.depthEdgeStrength,
  })
  /* The stock shader multiplies the whole texel by the edge strength, alpha included, so on a
     transparent canvas the ink outline would turn see-through instead of dark. Keep alpha as is. */
  pass.pixelatedMaterial.fragmentShader = pass.pixelatedMaterial.fragmentShader.replace(
    'gl_FragColor = texel * Strength;',
    'gl_FragColor = vec4(texel.rgb * Strength, texel.a);',
  )
  pass.pixelatedMaterial.needsUpdate = true
  composer.addPass(pass)
  composer.addPass(new OutputPass())
  return { composer, pass }
}

export function disposeBundle(bundle: PixelBundle) {
  bundle.pass.dispose()
  bundle.composer.dispose()
}

export const SPRITE_GL = { alpha: true, antialias: false, preserveDrawingBuffer: true, powerPreference: 'low-power' as const }

export function clearTransparent({ gl }: { gl: THREE.WebGLRenderer }) {
  gl.setClearColor(0x000000, 0)
}
