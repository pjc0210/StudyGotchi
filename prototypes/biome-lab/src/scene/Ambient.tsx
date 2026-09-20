import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  ICE_TOWN_PALETTE as P,
  type BiomeLayout,
  seeded,
  whalePointOnArc,
  whaleSchedule,
  whaleStateAt,
} from '../layout/biome-layout'
import { Surf } from '../render/materials'

const CLOUD_ALTITUDE = 16

export function Clouds({ layout, night }: { layout: BiomeLayout; night: boolean }) {
  const group = useRef<THREE.Group>(null)
  const span = layout.frameRadius
  const clouds = useMemo(() => {
    const rng = seeded(91)
    return Array.from({ length: 7 }, () => ({
      x: (rng() - 0.5) * span * 3,
      z: (rng() - 0.5) * span * 2.4,
      y: CLOUD_ALTITUDE + rng() * 4,
      s: 2.6 + rng() * 2.2,
      speed: 0.25 + rng() * 0.2,
    }))
  }, [span])

  useFrame((_, delta) => {
    if (!group.current) return
    group.current.children.forEach((child, i) => {
      child.position.x += clouds[i].speed * delta
      if (child.position.x > span * 1.7) child.position.x = -span * 1.7
    })
  })

  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          {[
            [0, 0, 0, 1],
            [1.1, -0.1, 0.3, 0.72],
            [-0.9, -0.15, -0.2, 0.62],
          ].map(([x, y, z, r], j) => (
            <mesh key={j} position={[x, y, z]} scale={[1, 0.55, 1]}>
              <dodecahedronGeometry args={[r, 0]} />
              <Surf color={night ? '#3f4670' : '#ffffff'} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

export function Snowfall({ density, layout }: { density: number; layout: BiomeLayout }) {
  const points = useRef<THREE.Points>(null)
  const count = 2400
  const span = layout.frameRadius * 2.6
  const { positions, speeds } = useMemo(() => {
    const rng = seeded(5)
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rng() - 0.5) * span
      positions[i * 3 + 1] = rng() * 24
      positions[i * 3 + 2] = (rng() - 0.5) * span
      speeds[i] = 1.6 + rng() * 1.4
    }
    return { positions, speeds }
  }, [span])

  useFrame(({ clock }, delta) => {
    if (!points.current) return
    const attr = points.current.geometry.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const drift = density > 1 ? 6 : 0.6
    const visible = Math.floor(count * Math.min(1, density))
    points.current.geometry.setDrawRange(0, visible)
    for (let i = 0; i < visible; i++) {
      arr[i * 3 + 1] -= speeds[i] * delta * (density > 1 ? 3 : 1)
      arr[i * 3] += Math.sin(clock.elapsedTime * 1.3 + i) * delta * drift
      if (arr[i * 3 + 1] < -1) arr[i * 3 + 1] = 24
    }
    attr.needsUpdate = true
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={density > 1 ? 0.38 : 0.26} sizeAttenuation transparent opacity={0.85} depthWrite={false} />
    </points>
  )
}

/* ---------- whale event (plan §5) ---------- */

const WHALE = '#4f6378'

function easeOut(k: number): number {
  return 1 - (1 - k) * (1 - k)
}

/**
 * Hidden underwater until the seeded schedule says otherwise, then one surfacing on an arc off
 * the harbour: rise → blow → glide → dive, or one breach in four. `paused` (catastrophe) hides it.
 */
export function WhaleEvent({ layout, seed, paused }: { layout: BiomeLayout; seed: number; paused: boolean }) {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const tail = useRef<THREE.Group>(null)
  const puff = useRef<THREE.Mesh>(null)
  const splash = useRef<THREE.Mesh>(null)
  const schedule = useMemo(() => whaleSchedule(seed), [seed])

  useFrame(({ clock }) => {
    const g = group.current
    if (!g || !body.current || !tail.current || !puff.current || !splash.current) return
    const state = whaleStateAt(schedule, clock.elapsedTime)
    if (paused || state.phase === 'hidden' || !state.event) {
      g.visible = false
      return
    }
    g.visible = true
    const [x, z] = whalePointOnArc(layout, state.event, state.u)
    const [nx, nz] = whalePointOnArc(layout, state.event, Math.min(1, state.u + 0.01))
    g.position.set(x, layout.seaLevel, z)
    g.rotation.y = Math.atan2(nx - x, nz - z)

    const { phase, k } = state
    let y = -3.2
    let pitch = 0
    let tailLift = 0
    let puffK = 0
    let splashK = 0
    switch (phase) {
      case 'rise':
        y = -3.2 + 3.2 * easeOut(k)
        pitch = -0.25 * (1 - k)
        break
      case 'blow':
        y = 0
        puffK = k
        break
      case 'glide':
        y = Math.sin(k * Math.PI * 2) * 0.12
        break
      case 'dive':
        y = -3.4 * k * k
        pitch = 0.5 * k
        tailLift = Math.sin(Math.min(1, k * 1.4) * Math.PI) * 1.2
        break
      case 'breach': {
        const arc = Math.sin(k * Math.PI)
        y = -0.6 + arc * 5.5
        pitch = (0.5 - k) * 1.6
        splashK = k < 0.25 ? k / 0.25 : k > 0.7 ? (k - 0.7) / 0.3 : 0
        break
      }
    }
    body.current.position.y = y
    body.current.rotation.x = pitch
    tail.current.rotation.x = -tailLift
    puff.current.visible = puffK > 0
    const ps = 0.4 + puffK * 2.2
    puff.current.scale.set(ps, ps * 1.4, ps)
    puff.current.position.y = y + 1.4 + puffK * 2.4
    ;(puff.current.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - puffK)
    splash.current.visible = splashK > 0
    const ss = 1 + splashK * 6
    splash.current.scale.set(ss, ss, 1)
    ;(splash.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - splashK)
  })

  return (
    <group ref={group} visible={false}>
      <group ref={body}>
        <mesh scale={[4.6, 1.5, 1.7]} castShadow>
          <sphereGeometry args={[1, 10, 8]} />
          <Surf color={WHALE} />
        </mesh>
        <mesh position={[0, -0.5, 0]} scale={[3.8, 1.0, 1.4]}>
          <sphereGeometry args={[1, 10, 8]} />
          <Surf color={P.cream} />
        </mesh>
        <mesh position={[-1.2, 1.3, 0]} rotation={[0, 0, -0.3]}>
          <coneGeometry args={[0.35, 0.9, 5]} />
          <Surf color={WHALE} />
        </mesh>
        <group ref={tail} position={[-4.2, 0.2, 0]}>
          <mesh position={[-0.9, 0.1, 0]} scale={[1.6, 0.3, 2.0]}>
            <sphereGeometry args={[1, 8, 6]} />
            <Surf color={WHALE} />
          </mesh>
        </group>
      </group>
      <mesh ref={puff} position={[1.8, 1.5, 0]} visible={false}>
        <dodecahedronGeometry args={[0.5, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} depthWrite={false} />
      </mesh>
      <mesh ref={splash} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.9, 1.4, 18]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export function Aurora() {
  const bands = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!bands.current) return
    bands.current.children.forEach((child, i) => {
      const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      m.opacity = 0.1 + Math.sin(clock.elapsedTime * 0.5 + i * 1.7) * 0.05
      child.position.y = 44 + Math.sin(clock.elapsedTime * 0.2 + i) * 1.5
    })
  })
  return (
    <group ref={bands}>
      {['#8fd0e8', '#c9a2e6'].map((color, i) => (
        <mesh key={color} position={[-20 + i * 30, 44, -150 - i * 20]} rotation={[0.4, 0.3 - i * 0.4, 0.2]}>
          <planeGeometry args={[200, 16 + i * 6, 24, 1]} />
          <meshBasicMaterial color={color} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  )
}

export function Stars() {
  const positions = useMemo(() => {
    const rng = seeded(23)
    const out = new Float32Array(600 * 3)
    for (let i = 0; i < 600; i++) {
      const u = rng() * Math.PI * 2
      const v = Math.acos(rng() * 0.9)
      const r = 600
      out[i * 3] = Math.sin(v) * Math.cos(u) * r
      out[i * 3 + 1] = Math.cos(v) * r * 0.6 + 40
      out[i * 3 + 2] = Math.sin(v) * Math.sin(u) * r
    }
    return out
  }, [])
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={2.2} sizeAttenuation={false} transparent opacity={0.8} depthWrite={false} />
    </points>
  )
}
