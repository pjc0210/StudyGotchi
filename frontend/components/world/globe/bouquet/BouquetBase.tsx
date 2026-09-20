"use client";

import type { MarkerDefinition } from "./markers";
import { Surf } from "./materials";
import { BASE_HEIGHT, BASE_RADIUS, BASE_TOP, SNOW_CAP_THICKNESS, terrainLobes } from './bouquetGeometry'

function SnowEdge({ color }: { color: string }) {
  return (
    <group>
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index / 12) * Math.PI * 2
        const width = index % 3 === 0 ? 1.35 : 1.05
        const depth = index % 4 === 0 ? 0.7 : 0.48
        return (
          <mesh
            key={index}
            position={[Math.sin(angle) * (BASE_RADIUS + 0.15), BASE_TOP - depth * 0.38, Math.cos(angle) * (BASE_RADIUS + 0.15)]}
            scale={[width, depth, width * 0.72]}
            castShadow
          >
            <sphereGeometry args={[0.86, 7, 5]} />
            <Surf color={color} />
          </mesh>
        )
      })}
    </group>
  )
}

export function BouquetBase({ marker }: { marker: MarkerDefinition }) {
  return (
    <group>
      <mesh position={[0, BASE_HEIGHT / 2, 0]} rotation={[0, Math.PI / 12, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[BASE_RADIUS, BASE_RADIUS * 1.04, BASE_HEIGHT, 12]} />
        <Surf color={marker.pedestal.side} />
      </mesh>
      <mesh position={[0, BASE_TOP + SNOW_CAP_THICKNESS / 2, 0]} rotation={[0, Math.PI / 12, 0]} receiveShadow>
        <cylinderGeometry args={[BASE_RADIUS + 0.3, BASE_RADIUS + 0.3, SNOW_CAP_THICKNESS, 12]} />
        <Surf color={marker.pedestal.top} />
      </mesh>
      <SnowEdge color={marker.pedestal.lip} />

      {terrainLobes().map((lobe, index) => (
        <mesh
          key={index}
          position={[lobe.position[0], BASE_TOP + lobe.height * 0.25, lobe.position[2]]}
          scale={[lobe.radius * lobe.stretch[0], lobe.height * 0.5, lobe.radius * lobe.stretch[1]]}
          rotation={[0, index * 0.37, 0]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[1, 1]} />
          <Surf color={index % 3 === 0 ? marker.pedestal.lip : marker.pedestal.top} />
        </mesh>
      ))}

      {[
        [-8.3, BASE_TOP + 1, 1.2, 1.5],
        [7.5, BASE_TOP + 0.7, -0.8, 1.1],
        [1.2, BASE_TOP + 0.55, 7.4, 0.9],
      ].map(([x, y, z, scale], index) => (
        <mesh key={index} position={[x, y, z]} scale={[scale, scale * 0.72, scale * 0.86]} rotation={[0.2, index * 0.8, -0.1]} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <Surf color={marker.pedestal.lip} />
        </mesh>
      ))}
    </group>
  )
}
