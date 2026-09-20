import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ICE_TOWN_PALETTE as P, type LandmarkStage } from '../layout/biome-layout'
import { Glow, Surf } from '../render/materials'

/**
 * Ice / Chilly Town landmark line: igloo (s1) → observatory (s2) → glacier lighthouse (s3).
 * Persistent parts: the stone plinth and the igloo, which becomes the lighthouse keeper's annex.
 */
export function Landmark({
  position,
  stage,
  night,
}: {
  position: [number, number, number]
  stage: LandmarkStage
  night: boolean
}) {
  const beacon = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (beacon.current) beacon.current.rotation.y = clock.elapsedTime * 0.9
  })

  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <cylinderGeometry args={[4.6, 5.0, 0.4, 12]} />
        <Surf color={P.cliffIce} />
      </mesh>
      <mesh position={[0, 0.45, 0]} receiveShadow>
        <cylinderGeometry args={[4.4, 4.6, 0.12, 12]} />
        <Surf color={P.snow} />
      </mesh>

      {stage === 'stake' && (
        <mesh position={[0, 1.0, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 1.0, 5]} />
          <Surf color={P.trunk} />
        </mesh>
      )}

      {stage !== 'stake' && (
        <group position={stage === 's1' ? [0, 0.5, 0] : [2.6, 0.5, 1.4]} scale={stage === 's1' ? 1.4 : 1}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <sphereGeometry args={[1.3, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Surf color={P.snow} />
          </mesh>
          <mesh position={[0, 0.35, 1.2]} castShadow>
            <boxGeometry args={[0.7, 0.7, 0.6]} />
            <Surf color={P.paleIce} />
          </mesh>
          <mesh position={[0, 0.35, 1.52]}>
            <boxGeometry args={[0.4, 0.5, 0.05]} />
            <Glow color={P.light} on={night} intensity={1.2} />
          </mesh>
        </group>
      )}

      {stage === 's2' && (
        <group position={[0, 0.5, 0]}>
          <mesh position={[0, 1.4, 0]} castShadow>
            <cylinderGeometry args={[1.7, 1.9, 2.8, 10]} />
            <Surf color={P.cream} />
          </mesh>
          {[-0.8, 0, 0.8].map((a) => (
            <mesh key={a} position={[Math.sin(a) * 1.75, 1.6, Math.cos(a) * 1.75]} rotation={[0, a, 0]}>
              <boxGeometry args={[0.4, 0.5, 0.06]} />
              <Glow color={P.light} on={night} intensity={1.2} />
            </mesh>
          ))}
          <mesh position={[0, 3.3, 0]} scale={[1, 0.62, 1]} castShadow>
            <dodecahedronGeometry args={[1.95, 1]} />
            <Surf color="#9b8daf" />
          </mesh>
          <mesh position={[0, 3.8, 0.6]} rotation={[0.6, 0, 0]}>
            <boxGeometry args={[0.5, 1.4, 0.4]} />
            <Surf color={P.ink} />
          </mesh>
        </group>
      )}

      {stage === 's3' && (
        <group position={[0, 0.5, 0]}>
          <mesh position={[0, 3.2, 0]} castShadow>
            <cylinderGeometry args={[1.05, 1.5, 6.4, 10]} />
            <Surf color={P.cream} />
          </mesh>
          {[1.6, 3.4, 5.2].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <cylinderGeometry args={[1.05 + (6.4 / 2 - y) * 0.07 + 0.03, 1.05 + (6.4 / 2 - y) * 0.07 + 0.09, 0.55, 10]} />
              <Surf color={P.cliffIce} />
            </mesh>
          ))}
          <mesh position={[0, 6.6, 0]} receiveShadow>
            <cylinderGeometry args={[1.4, 1.3, 0.3, 10]} />
            <Surf color={P.rockDeep} />
          </mesh>
          <mesh position={[0, 7.3, 0]}>
            <cylinderGeometry args={[0.8, 0.8, 1.1, 8]} />
            <Glow color={P.light} on={night} intensity={1.8} />
          </mesh>
          <mesh position={[0, 8.2, 0]} castShadow>
            <coneGeometry args={[1.1, 0.9, 8]} />
            <Surf color={P.timberRed} />
          </mesh>
          <group ref={beacon} position={[0, 7.3, 0]}>
            {night && (
              <mesh position={[0, 0, 7]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[1.6, 14, 8, 1, true]} />
                <meshBasicMaterial color={P.light} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
              </mesh>
            )}
            {night && <pointLight color={P.light} intensity={12} distance={30} decay={2} />}
          </group>
        </group>
      )}
    </group>
  )
}
