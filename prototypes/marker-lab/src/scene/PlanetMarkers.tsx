import { useMemo } from 'react'
import * as THREE from 'three'
import { MARKERS } from '../markers'
import { PLANET_MARKER_SCALE, PLANET_RADIUS, planetPlacements } from '../planet'
import type { PropCount } from '../state'
import { Surf } from '../render/materials'
import { BouquetBase } from './BouquetBase'
import { Creature } from './Creature'
import { WorldProps } from './WorldProps'

const UP = new THREE.Vector3(0, 1, 0)

export function PlanetMarkers({
  propCount,
  night,
  creature,
}: {
  propCount: PropCount
  night: boolean
  creature: boolean
}) {
  const placements = useMemo(() => planetPlacements(), [])

  return (
    <group>
      <mesh>
        <sphereGeometry args={[PLANET_RADIUS - 0.6, 48, 32]} />
        <meshStandardMaterial color={night ? '#24344f' : '#3f7f9a'} flatShading />
      </mesh>
      <mesh>
        <sphereGeometry args={[PLANET_RADIUS, 32, 24]} />
        <meshStandardMaterial color={night ? '#2f4a33' : '#4e7a4a'} flatShading />
      </mesh>
      {placements.map((placement) => {
        const marker = MARKERS.find((entry) => entry.id === placement.id)!
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
          UP,
          new THREE.Vector3(...placement.direction),
        )
        return (
          <group key={placement.id} position={placement.position} quaternion={quaternion} scale={PLANET_MARKER_SCALE}>
            <BouquetBase marker={marker} />
            <WorldProps marker={marker} propCount={propCount} night={night} />
            {creature && <Creature />}
          </group>
        )
      })}
    </group>
  )
}
