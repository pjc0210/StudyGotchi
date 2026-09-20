import { MEADOW_PALETTE as P, type LandmarkStage } from '../layout/biome-layout'
import { Glow, Surf } from '../render/materials'

function Tower({ x, z, h, lit }: { x: number; z: number; h: number; lit: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]} castShadow>
        <cylinderGeometry args={[2.4, 2.8, h, 10]} />
        <Surf color={P.limestone} />
      </mesh>
      <mesh position={[0, h + 0.75, 0]} castShadow>
        <coneGeometry args={[3.0, 2.4, 10]} />
        <Surf color={P.roof} />
      </mesh>
      <mesh position={[0, h * 0.62, 2.42]}>
        <boxGeometry args={[0.5, 0.9, 0.08]} />
        <Glow color={P.light} on={lit} intensity={1.5} />
      </mesh>
    </group>
  )
}

function CourtWall({ x, z, length, yaw = 0 }: { x: number; z: number; length: number; yaw?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      <mesh position={[0, 2.25, 0]} castShadow>
        <boxGeometry args={[length, 4.5, 1.15]} />
        <Surf color={P.limestone} />
      </mesh>
      {Array.from({ length: Math.max(2, Math.round(length / 3)) }, (_, index) => (
        <mesh key={index} position={[(index / Math.max(1, Math.round(length / 3) - 1) - 0.5) * (length - 1), 4.7, 0]}>
          <boxGeometry args={[1.2, 0.55, 1.3]} />
          <Surf color={P.limestoneShade} />
        </mesh>
      ))}
    </group>
  )
}

/** The sole landmark instance. Growth stays inside the authored 18 m gatehouse silhouette. */
export function Landmark({
  position,
  stage,
  night,
}: {
  position: [number, number, number]
  stage: LandmarkStage
  night: boolean
}) {
  const gateHeight = stage === 's1' ? 6 : stage === 's2' ? 11.5 : 15.4
  return (
    <group position={position} data-landmark="castle">
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <cylinderGeometry args={[16.5, 18, 0.8, 12]} />
        <Surf color={P.limestoneShade} />
      </mesh>
      <mesh position={[0, 0.84, -1]} receiveShadow>
        <boxGeometry args={[25, 0.12, 23]} />
        <Surf color={P.court} />
      </mesh>
      {stage === 'stake' && (
        <group>
          <mesh position={[0, 1.2, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.16, 2.4, 6]} />
            <Surf color={P.timber} />
          </mesh>
          <mesh position={[1.1, 2.0, 0]}>
            <boxGeometry args={[2.2, 0.9, 0.08]} />
            <Surf color={P.rose} />
          </mesh>
        </group>
      )}
      {stage !== 'stake' && (
        <>
          <mesh position={[0, gateHeight / 2, 7]} castShadow>
            <boxGeometry args={[8.5, gateHeight, 5.4]} />
            <Surf color={P.limestone} />
          </mesh>
          <mesh position={[0, gateHeight + 1.15, 7]} castShadow>
            <coneGeometry args={[5.7, 2.3, 4]} />
            <Surf color={P.roof} />
          </mesh>
          <mesh position={[0, 2.4, 9.74]}>
            <boxGeometry args={[2.8, 4.8, 0.18]} />
            <Surf color={P.timberDark} />
          </mesh>
          <Tower x={-6.8} z={7} h={stage === 's1' ? 8 : stage === 's2' ? 11 : 14} lit={night} />
          {stage !== 's1' && <Tower x={6.8} z={7} h={stage === 's2' ? 10 : 12} lit={night} />}
          <CourtWall x={-11.5} z={0} length={15} yaw={Math.PI / 2} />
          <CourtWall x={11.5} z={0} length={15} yaw={Math.PI / 2} />
        </>
      )}
      {(stage === 's2' || stage === 's3') && (
        <>
          <mesh position={[-7.3, 2.7, -7.5]} castShadow>
            <boxGeometry args={[9.2, 5.4, 5.4]} />
            <Surf color="#d8c7a1" />
          </mesh>
          <mesh position={[-7.3, 6.25, -7.5]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[6.2, 3, 4]} />
            <Surf color="#475463" />
          </mesh>
          <CourtWall x={0} z={-11.5} length={24} />
        </>
      )}
      {stage === 's3' && (
        <>
          <mesh position={[7.4, 2.4, -7.8]} castShadow>
            <boxGeometry args={[8.5, 4.8, 5]} />
            <Surf color="#d8c7a1" />
          </mesh>
          <mesh position={[7.4, 5.6, -7.8]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[5.8, 2.8, 4]} />
            <Surf color={P.rose} />
          </mesh>
          <mesh position={[0, 1.08, -1.6]}>
            <torusGeometry args={[2.4, 0.35, 6, 18]} />
            <Surf color={P.limestoneShade} />
          </mesh>
          <mesh position={[0, 0.96, -1.6]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[2.1, 18]} />
            <Surf color={P.water} />
          </mesh>
          {[-2.6, 0, 2.6].map((x) => (
            <mesh key={x} position={[x, gateHeight * 0.62, 9.76]}>
              <boxGeometry args={[0.58, 1.1, 0.08]} />
              <Glow color={P.light} on={night} intensity={1.8} />
            </mesh>
          ))}
        </>
      )}
      {night && stage !== 'stake' && <pointLight position={[0, 7, 5]} color={P.light} intensity={9} distance={25} decay={2} />}
    </group>
  )
}
