import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { AnchorRegistry } from './anchors'

interface ScreenAnchorsProps {
  registry: AnchorRegistry
  points: Record<string, [number, number, number]>
}

/** Projects every registered anchor to canvas pixels each frame and hands them to the registry. */
export function ScreenAnchors({ registry, points }: ScreenAnchorsProps) {
  const { camera, size } = useThree()
  const vector = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    for (const id of registry.nodes.keys()) {
      const point = points[id]
      if (!point) continue
      vector.set(point[0], point[1], point[2]).project(camera)
      const x = ((vector.x + 1) / 2) * size.width
      const y = ((1 - vector.y) / 2) * size.height
      registry.place(id, x, y, vector.z > 1, size.width, size.height)
    }
  })

  return null
}
