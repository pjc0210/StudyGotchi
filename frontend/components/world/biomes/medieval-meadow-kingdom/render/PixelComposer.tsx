import { useEffect, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPixelatedPass } from 'three/addons/postprocessing/RenderPixelatedPass.js'

/**
 * Philote, pass-3 review: "make the pixel be at 2 px from any distance". One fixed cell at every
 * station; the edge strengths are tuned once for a 2 px cell (softer than the 4 px golden profile
 * so outlines at the far stations stay lines, not noise).
 */
export const PIXEL_PROFILE = { pixelSize: 2, normalEdgeStrength: 0.2, depthEdgeStrength: 0.14 } as const

function PixelPass() {
  const { gl, scene, camera, size } = useThree()

  const bundle = useMemo(() => {
    const composer = new EffectComposer(gl)
    const pixel = new RenderPixelatedPass(PIXEL_PROFILE.pixelSize, scene, camera, {
      normalEdgeStrength: PIXEL_PROFILE.normalEdgeStrength,
      depthEdgeStrength: PIXEL_PROFILE.depthEdgeStrength,
    })
    composer.addPass(pixel)
    composer.addPass(new OutputPass())
    return { composer, pixel }
  }, [camera, gl, scene])

  useEffect(() => {
    bundle.composer.setSize(size.width, size.height)
  }, [bundle.composer, size.height, size.width])

  useEffect(
    () => () => {
      bundle.pixel.dispose()
      bundle.composer.dispose()
    },
    [bundle],
  )

  useFrame((_, delta) => {
    bundle.composer.render(delta)
  }, 1)
  return null
}

export function PixelComposer() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  return ready ? <PixelPass /> : null
}
