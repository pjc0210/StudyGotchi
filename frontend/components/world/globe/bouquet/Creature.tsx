"use client";

import { Surf } from "./materials";
import { CREATURE_HEIGHT } from "./bouquet-state";
import { BASE_TOP } from './bouquetGeometry'

export function Creature() {
  return (
    <group position={[-0.5, BASE_TOP + 1.2, 7.2]} scale={CREATURE_HEIGHT / 3.8}>
      <mesh position={[0, 1.25, 0]} scale={[0.85, 1.05, 0.78]} castShadow>
        <dodecahedronGeometry args={[1, 1]} />
        <Surf color="#c9a2e6" />
      </mesh>
      <mesh position={[0, 2.45, 0.08]} scale={[1.12, 0.92, 1]} castShadow>
        <dodecahedronGeometry args={[1, 1]} />
        <Surf color="#f2e3c6" />
      </mesh>
      {[-0.38, 0.38].map((x) => (
        <mesh key={x} position={[x, 2.5, 0.9]}>
          <sphereGeometry args={[0.12, 6, 5]} />
          <Surf color="#3a2f45" />
        </mesh>
      ))}
      <mesh position={[0, 3.25, 0]} rotation={[0, 0, -0.18]} castShadow>
        <coneGeometry args={[0.68, 1.1, 7]} />
        <Surf color="#c8524a" />
      </mesh>
    </group>
  )
}
