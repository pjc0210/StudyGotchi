import { COASTAL_PALETTE as P, type LandmarkStage } from '../layout/biome-layout'
import { Glow, Surf } from '../render/materials'

function FloorLamp({ x, z, night }: { x: number; z: number; night: boolean }) {
  return (
    <group position={[x, 0.5, z]}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 1.1, 6]} />
        <Surf color={P.ruinDark} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <dodecahedronGeometry args={[0.2, 0]} />
        <Glow color={P.window} on={night} intensity={1.6} />
      </mesh>
    </group>
  )
}

export function Landmark({
  position,
  stage,
  night,
}: {
  position: [number, number, number]
  stage: LandmarkStage
  night: boolean
}) {
  const s2 = stage === 's2' || stage === 's3'
  const s3 = stage === 's3'
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[6.2, 6.8, 0.7, 12]} />
        <Surf color={P.cliff} />
      </mesh>
      <mesh position={[0, 0.76, 0]} receiveShadow>
        <cylinderGeometry args={[6, 6.2, 0.16, 12]} />
        <Surf color={P.ground} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[8, 0.7, 6]} />
        <Surf color={P.ruin} />
      </mesh>
      <mesh position={[-1.1, 3.6, -1]} rotation={[0, 0.12, 0.08]} castShadow>
        <boxGeometry args={[6.2, 0.65, 0.8]} />
        <Surf color={P.plaster} />
      </mesh>
      <mesh position={[1.2, 4.4, 1.2]} rotation={[0, -0.16, -0.07]} castShadow>
        <boxGeometry args={[5.8, 0.65, 0.8]} />
        <Surf color={P.plaster} />
      </mesh>
      <group position={[0, 1.45, 0]}>
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[3.2, 0.7, 2.2]} />
          <Surf color={P.cobalt} />
        </mesh>
        <mesh position={[0, 0.73, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.6, 1.6]} />
          <meshBasicMaterial color={P.plaster} />
        </mesh>
      </group>
      <FloorLamp x={-4.5} z={2.2} night={night} />
      <FloorLamp x={4.2} z={-2.1} night={night} />

      {s2 && (
        <group>
          {[-3.2, 0, 3.2].map((x) => (
            <group key={x} position={[x, 0, -0.5]}>
              {[-1.8, 1.8].map((z) => (
                <mesh key={z} position={[0, 4.4, z]} castShadow>
                  <cylinderGeometry args={[0.42, 0.55, 7.2, 8]} />
                  <Surf color={P.plaster} />
                </mesh>
              ))}
              <mesh position={[0, 7.8, 0]} castShadow>
                <boxGeometry args={[2.6, 0.55, 4.4]} />
                <Surf color={P.ruin} />
              </mesh>
              <mesh position={[0, 5.4, 1.86]}>
                <boxGeometry args={[1.1, 1.5, 0.12]} />
                <Glow color={P.window} on={night} intensity={1.5} />
              </mesh>
            </group>
          ))}
          {[-3, 3].map((x) => <FloorLamp key={x} x={x} z={3.4} night={night} />)}
          <mesh position={[0, 8.8, -0.2]} rotation={[0, 0, 0.15]}>
            <boxGeometry args={[0.25, 2.6, 0.25]} />
            <Surf color={P.cobalt} />
          </mesh>
        </group>
      )}

      {s3 && (
        <group>
          <mesh position={[0, 8.8, 0]} castShadow>
            <boxGeometry args={[6.8, 2.4, 5]} />
            <Surf color={P.plaster} />
          </mesh>
          {[-2, 0, 2].map((x) => (
            <mesh key={x} position={[x, 9, 2.56]}>
              <boxGeometry args={[1, 0.9, 0.12]} />
              <Glow color={P.window} on={night} intensity={1.6} />
            </mesh>
          ))}
          {[-1.7, 1.7].map((x, index) => (
            <mesh key={x} position={[x, 12.2 + index * 0.6, 0]} castShadow>
              <boxGeometry args={[0.7, 5, 0.7]} />
              <Surf color={index ? P.ruinDark : P.cobalt} />
            </mesh>
          ))}
          <mesh position={[1.7, 15, 0]}>
            <dodecahedronGeometry args={[0.65, 0]} />
            <Glow color={P.window} on={night} intensity={2.2} />
          </mesh>
          {night && <pointLight position={[1.7, 15, 0]} color={P.window} intensity={8} distance={25} />}
        </group>
      )}
    </group>
  )
}
