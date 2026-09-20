import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Biome, Concept, ConceptState } from '../lib/world'
import { toonMaterial } from '../lib/toon'

/** Scales in when first mounted so newly grown things pop. */
function PopIn({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null)
  const t = useRef(0)
  useFrame((_, dt) => {
    if (!ref.current) return
    t.current = Math.min(1, t.current + dt * 2.2)
    const k = t.current
    // overshoot ease
    const s = k < 1 ? 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2) : 1
    ref.current.scale.setScalar(Math.max(0.001, s))
  })
  return <group ref={ref} scale={0.001}>{children}</group>
}

function Sprout({ biome }: { biome: Biome }) {
  return (
    <PopIn>
      <mesh position={[0, 0.12, 0]} material={toonMaterial('#9a7a55')}>
        <cylinderGeometry args={[0.04, 0.06, 0.24, 6]} />
      </mesh>
      <mesh position={[0, 0.34, 0]} material={toonMaterial(biome.accent)}>
        <sphereGeometry args={[0.18, 10, 8]} />
      </mesh>
    </PopIn>
  )
}

function Landmark({ biome }: { biome: Biome }) {
  switch (biome.id) {
    case 'city':
      return (
        <PopIn>
          <mesh position={[0, 0.45, 0]} material={toonMaterial('#f2d9ec')}>
            <boxGeometry args={[0.5, 0.9, 0.5]} />
          </mesh>
          <mesh position={[0, 1.05, 0]} material={toonMaterial(biome.accent)}>
            <coneGeometry args={[0.42, 0.4, 4]} />
          </mesh>
          <mesh position={[0, 0.5, 0.26]} material={toonMaterial('#ffe9a8')}>
            <boxGeometry args={[0.14, 0.18, 0.02]} />
          </mesh>
        </PopIn>
      )
    case 'ice':
      return (
        <PopIn>
          <mesh position={[0, 0.3, 0]} material={toonMaterial('#ffffff')}>
            <sphereGeometry args={[0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 0.16, 0.4]} material={toonMaterial('#6f8fa8')}>
            <boxGeometry args={[0.22, 0.24, 0.12]} />
          </mesh>
          <mesh position={[0.5, 0.45, -0.3]} material={toonMaterial(biome.accent)}>
            <coneGeometry args={[0.16, 0.9, 5]} />
          </mesh>
        </PopIn>
      )
    case 'sand':
      return (
        <PopIn>
          <mesh position={[0, 0.35, 0]} material={toonMaterial('#fff1dc')}>
            <coneGeometry args={[0.5, 0.7, 6]} />
          </mesh>
          <mesh position={[0, 0.02, 0]} material={toonMaterial('#c98a5a')}>
            <cylinderGeometry args={[0.55, 0.55, 0.04, 12]} />
          </mesh>
          <mesh position={[0.55, 0.35, 0.2]} material={toonMaterial('#6f9a5a')}>
            <capsuleGeometry args={[0.09, 0.4, 4, 8]} />
          </mesh>
        </PopIn>
      )
    case 'meadow':
      return (
        <PopIn>
          <mesh position={[0, 0.3, 0]} material={toonMaterial('#f6f0d8')}>
            <cylinderGeometry args={[0.36, 0.36, 0.6, 8]} />
          </mesh>
          <mesh position={[0, 0.75, 0]} material={toonMaterial('#d97d6a')}>
            <coneGeometry args={[0.46, 0.4, 8]} />
          </mesh>
          <mesh position={[0, 1.0, 0]} material={toonMaterial(biome.accent)}>
            <sphereGeometry args={[0.08, 8, 6]} />
          </mesh>
        </PopIn>
      )
    case 'coast':
      // beacon on a rock: striped post with a lamp
      return (
        <PopIn>
          <mesh position={[0, 0.1, 0]} material={toonMaterial('#8f9aa3')}>
            <dodecahedronGeometry args={[0.36, 0]} />
          </mesh>
          <mesh position={[0, 0.6, 0]} material={toonMaterial('#fff7f0')}>
            <cylinderGeometry args={[0.13, 0.17, 0.8, 8]} />
          </mesh>
          <mesh position={[0, 0.55, 0]} material={toonMaterial('#e04e4e')}>
            <cylinderGeometry args={[0.15, 0.15, 0.16, 8]} />
          </mesh>
          <mesh position={[0, 1.08, 0]} material={toonMaterial('#ffe36b')}>
            <sphereGeometry args={[0.12, 8, 6]} />
          </mesh>
        </PopIn>
      )
    case 'volcanic':
      // basalt stack with a glowing top
      return (
        <PopIn>
          <mesh position={[0, 0.4, 0]} material={toonMaterial('#4a4048')}>
            <cylinderGeometry args={[0.3, 0.42, 0.8, 6]} />
          </mesh>
          <mesh position={[0.32, 0.22, 0.18]} material={toonMaterial('#5f5560')}>
            <cylinderGeometry args={[0.16, 0.2, 0.44, 6]} />
          </mesh>
          <mesh position={[0, 0.84, 0]} material={toonMaterial(biome.accent)}>
            <cylinderGeometry args={[0.2, 0.3, 0.1, 6]} />
          </mesh>
        </PopIn>
      )
    default:
      return (
        <PopIn>
          <mesh position={[0, 0.3, 0]} material={toonMaterial('#9a7a55')}>
            <cylinderGeometry args={[0.08, 0.12, 0.6, 6]} />
          </mesh>
          <mesh position={[0, 0.85, 0]} material={toonMaterial(biome.accent)}>
            <sphereGeometry args={[0.45, 10, 8]} />
          </mesh>
          <mesh position={[0.25, 1.15, 0.1]} material={toonMaterial('#6faf62')}>
            <sphereGeometry args={[0.28, 10, 8]} />
          </mesh>
        </PopIn>
      )
  }
}

export interface ConceptSpotProps {
  concept: Concept
  state: ConceptState
  onSelect?: (c: Concept) => void
  selected?: boolean
  /** the topic's single stage-3 monument: drawn larger on a pedestal */
  capstone?: boolean
}

/** Renders one concept's spot with primitives: nothing, a sprout, or a biome landmark. */
export function ConceptSpot({ concept, state, onSelect, selected, capstone }: ConceptSpotProps) {
  if (state === 0) return null
  const biome = concept.cluster.biome
  const body = state === 1 ? <Sprout biome={biome} /> : <Landmark biome={biome} />
  return (
    <group
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.(concept)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      {capstone ? (
        <>
          <mesh position={[0, 0.06, 0]} material={toonMaterial('#b7a58f')}>
            <cylinderGeometry args={[1.35, 1.5, 0.12, 24]} />
          </mesh>
          <group position={[0, 0.12, 0]} scale={1.6}>
            {body}
          </group>
        </>
      ) : (
        body
      )}
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={capstone ? [1.7, 1.95, 32] : [0.6, 0.72, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  )
}
