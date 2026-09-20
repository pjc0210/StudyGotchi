import { Suspense, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { CYCLE_CATALOG } from '../data/cycle-catalog'

function FittedModel({ url }: { url: string }) {
  const gltf = useGLTF(url)
  const scene = useMemo(() => cloneSkeleton(gltf.scene) as THREE.Group, [gltf.scene])
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const tallest = Math.max(size.x, size.y, size.z, 0.001)
    return { center, scale: 1.35 / tallest }
  }, [scene])

  useFrame((_, dt) => {
    scene.rotation.y += dt * 0.45
  })

  return (
    <group scale={fit.scale} position={[-fit.center.x * fit.scale, -fit.center.y * fit.scale, -fit.center.z * fit.scale]}>
      <primitive object={scene} />
    </group>
  )
}

export function CycleScene({ index }: { index: number }) {
  const item = CYCLE_CATALOG[index]
  useEffect(() => {
    if (item) useGLTF.preload(item.url)
    const next = CYCLE_CATALOG[(index + 1) % CYCLE_CATALOG.length]
    if (next) useGLTF.preload(next.url)
  }, [index, item])

  return (
    <>
      <color attach="background" args={['#f4efe4']} />
      <hemisphereLight args={['#fff6e8', '#c9b8a0', 0.85]} />
      <directionalLight position={[3, 5, 4]} intensity={1.35} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.72, 0]} receiveShadow>
        <circleGeometry args={[4, 48]} />
        <meshStandardMaterial color="#efe4d2" />
      </mesh>
      <Suspense fallback={null}>{item && <FittedModel key={item.id} url={item.url} />}</Suspense>
      <OrbitControls enablePan={false} minDistance={1.4} maxDistance={6} target={[0, 0, 0]} />
    </>
  )
}

export const CYCLE_COUNT = CYCLE_CATALOG.length
