import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { toonGradient } from '../lib/toon'
import { GOLDEN_PALETTE } from '../golden/golden-spec'
import { BAKE_PX, SPRITES, SPRITE_FOV, WORLD_PIXEL, cellsFor, type PixelMode, type SpriteId } from './art-spec'
import { SPRITE_GL, clearTransparent, disposeBundle, makeComposer, placeCamera } from './pixel-pass'
import { BakeContext, bakeKey, useBaked, type BakeJob } from './bake'

/* The residents, landmarks and props below mirror GoldenIceScene one for one (same primitives,
   same colours, same toon ramp). They are repeated here because the scene keeps them private
   and this lab may not edit it. If the world changes, change these too. */

const P = GOLDEN_PALETTE

function Toon({ color, emissive, intensity = 0 }: { color: string; emissive?: string; intensity?: number }) {
  return (
    <meshToonMaterial
      color={color}
      gradientMap={toonGradient()}
      emissive={emissive ?? '#000000'}
      emissiveIntensity={intensity}
    />
  )
}

function GroundShadow({ radius = 0.46 }: { radius?: number }) {
  return (
    <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 16]} />
      <meshBasicMaterial color={P.ink} transparent opacity={0.16} depthWrite={false} />
    </mesh>
  )
}

function IceBird() {
  return (
    <>
      <mesh position={[0, 0.43, 0]} scale={[0.9, 1.02, 0.78]}>
        <dodecahedronGeometry args={[0.52, 1]} />
        <Toon color="#dceef2" />
      </mesh>
      <mesh position={[0, 0.82, 0.12]} scale={[1, 0.96, 0.9]}>
        <icosahedronGeometry args={[0.39, 2]} />
        <Toon color={P.cream} />
      </mesh>
      {[-0.14, 0.14].map((x) => (
        <mesh key={x} position={[x, 0.89, 0.47]}>
          <sphereGeometry args={[0.045, 8, 6]} />
          <meshBasicMaterial color={P.ink} />
        </mesh>
      ))}
      <mesh position={[0, 0.78, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.12, 0.34, 5]} />
        <Toon color={P.coral} />
      </mesh>
      {[-0.19, 0.19].map((x) => (
        <mesh key={x} position={[x, 0.08, 0.09]} scale={[1.5, 0.55, 1.05]}>
          <sphereGeometry args={[0.13, 8, 6]} />
          <Toon color={P.coral} />
        </mesh>
      ))}
    </>
  )
}

function SnowBlob() {
  return (
    <>
      <mesh position={[0, 0.43, 0]} scale={[1.08, 0.88, 0.98]}>
        <dodecahedronGeometry args={[0.54, 1]} />
        <Toon color={P.cream} />
      </mesh>
      {[-0.15, 0.15].map((x) => (
        <mesh key={x} position={[x, 0.56, 0.49]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshBasicMaterial color={P.ink} />
        </mesh>
      ))}
      <mesh position={[0, 0.93, -0.02]} rotation={[0.03, 0, -0.08]}>
        <coneGeometry args={[0.38, 0.58, 8]} />
        <Toon color={P.mint} />
      </mesh>
      <mesh position={[0.08, 1.23, -0.01]}>
        <dodecahedronGeometry args={[0.12, 0]} />
        <Toon color={P.mint} />
      </mesh>
    </>
  )
}

function BookBeetle() {
  return (
    <>
      <mesh position={[0, 0.38, 0]} scale={[0.76, 0.92, 0.68]}>
        <icosahedronGeometry args={[0.5, 2]} />
        <Toon color="#8f789f" />
      </mesh>
      <mesh position={[0, 0.73, 0.16]}>
        <icosahedronGeometry args={[0.32, 2]} />
        <Toon color={P.cream} />
      </mesh>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.79, 0.45]}>
          <sphereGeometry args={[0.04, 8, 6]} />
          <meshBasicMaterial color={P.ink} />
        </mesh>
      ))}
      <group position={[0, 0.46, -0.43]} rotation={[0.08, 0, 0]}>
        <mesh position={[-0.18, 0, 0]}>
          <boxGeometry args={[0.34, 0.48, 0.08]} />
          <Toon color={P.light} />
        </mesh>
        <mesh position={[0.18, 0, 0]}>
          <boxGeometry args={[0.34, 0.48, 0.08]} />
          <Toon color={P.coral} />
        </mesh>
      </group>
    </>
  )
}

function Hut() {
  return (
    <group rotation={[0, 0.35, 0]}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[1.15, 0.9, 0.95]} />
        <Toon color={P.cream} />
      </mesh>
      <mesh position={[0, 1.02, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.95, 0.7, 4]} />
        <Toon color="#9a769d" />
      </mesh>
      <mesh position={[0, 0.48, 0.49]}>
        <boxGeometry args={[0.24, 0.42, 0.04]} />
        <Toon color={P.ink} />
      </mesh>
      <mesh position={[-0.34, 0.56, 0.49]}>
        <boxGeometry args={[0.23, 0.2, 0.04]} />
        <Toon color={P.light} emissive={P.light} intensity={0.38} />
      </mesh>
    </group>
  )
}

/** Fully lit: five windows and the beacon. A sprite shows the landmark at its best. */
function Observatory({ animate }: { animate: boolean }) {
  const beacon = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!animate || !beacon.current) return
    beacon.current.rotation.y = clock.elapsedTime * 0.3
  })
  return (
    <group>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[1.58, 1.78, 0.24, 12]} />
        <Toon color="#c9dce5" />
      </mesh>
      <mesh position={[0, 0.76, 0]}>
        <cylinderGeometry args={[0.82, 0.96, 1.35, 10]} />
        <Toon color={P.cream} />
      </mesh>
      {Array.from({ length: 5 }, (_, index) => {
        const angle = -0.9 + index * 0.45
        return (
          <mesh key={angle} position={[Math.sin(angle) * 0.94, 0.82, Math.cos(angle) * 0.94]} rotation={[0, angle, 0]}>
            <boxGeometry args={[0.24, 0.32, 0.045]} />
            <Toon color={P.light} emissive={P.light} intensity={1.15} />
          </mesh>
        )
      })}
      <mesh position={[0, 1.52, 0]} scale={[1, 0.46, 1]}>
        <dodecahedronGeometry args={[1.02, 1]} />
        <Toon color="#9b8daf" />
      </mesh>
      <mesh position={[0, 1.86, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.56, 6]} />
        <Toon color={P.ink} />
      </mesh>
      <group ref={beacon} position={[0, 2.24, 0]}>
        <mesh>
          <octahedronGeometry args={[0.24, 0]} />
          <Toon color={P.light} emissive={P.light} intensity={1.4} />
        </mesh>
      </group>
    </group>
  )
}

function Pine() {
  return (
    <group>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.1, 0.14, 0.84, 6]} />
        <Toon color="#786557" />
      </mesh>
      <mesh position={[0, 0.86, 0]}>
        <coneGeometry args={[0.48, 0.8, 7]} />
        <Toon color="#6f9b91" />
      </mesh>
      <mesh position={[0, 1.22, 0]}>
        <coneGeometry args={[0.36, 0.68, 7]} />
        <Toon color="#8bb7ac" />
      </mesh>
      <mesh position={[0, 1.49, 0]}>
        <coneGeometry args={[0.23, 0.46, 7]} />
        <Toon color={P.snow} />
      </mesh>
    </group>
  )
}

function Crystal() {
  return (
    <mesh rotation={[0.08, 0.25, -0.12]}>
      <octahedronGeometry args={[0.32, 0]} />
      <Toon color="#91c8df" emissive="#91c8df" intensity={0.16} />
    </mesh>
  )
}

function LampPost() {
  return (
    <group>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.035, 0.055, 0.84, 6]} />
        <Toon color={P.ink} />
      </mesh>
      <mesh position={[0, 0.88, 0]}>
        <octahedronGeometry args={[0.13, 0]} />
        <Toon color={P.light} emissive={P.light} intensity={1.25} />
      </mesh>
    </group>
  )
}

export type SpriteMotion = 'still' | 'bob' | 'pace'

/** The resident idle from the world (a bob and a lean); `pace` is the same bob with a turn, for
 *  the loading state. There is no walk cycle in the world yet, so nothing here walks. */
function Motion({ motion, children }: { motion: SpriteMotion; children: ReactNode }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || motion === 'still') return
    const time = clock.elapsedTime
    group.current.position.y = 0.04 + Math.sin(time * 2.1) * 0.035
    group.current.rotation.z = Math.sin(time * 1.15) * 0.025
    group.current.rotation.y = motion === 'pace' ? Math.sin(time * 0.9) * 0.55 : 0
  })
  return <group ref={group}>{children}</group>
}

function Body({ id, animate }: { id: SpriteId; animate: boolean }) {
  switch (id) {
    case 'pip':
      return <IceBird />
    case 'mochi':
      return <SnowBlob />
    case 'glyph':
      return <BookBeetle />
    case 'observatory':
      return <Observatory animate={animate} />
    case 'hut':
      return <Hut />
    case 'pine':
      return <Pine />
    case 'crystal':
      return <Crystal />
    case 'lamp':
      return <LampPost />
  }
}

const RESIDENTS = new Set<SpriteId>(['pip', 'mochi', 'glyph'])

/** One sprite under the world's key light. No background, no fog, no ground: the paper is the ground. */
export function SpriteRig({ id, motion = 'still' }: { id: SpriteId; motion?: SpriteMotion }) {
  const resident = RESIDENTS.has(id)
  return (
    <>
      <hemisphereLight args={['#dff4ff', '#8e799e', 0.42]} />
      <directionalLight position={[6, 10, 8]} intensity={2.15} color="#fff1d9" />
      {resident ? (
        <Motion motion={motion}>
          <GroundShadow />
          <Body id={id} animate={motion !== 'still'} />
        </Motion>
      ) : (
        <Body id={id} animate={motion !== 'still'} />
      )}
    </>
  )
}

/* ---------- pass ---------- */

function SpriteComposer({ pixelSize }: { pixelSize: number }) {
  const { gl, scene, camera, size } = useThree()
  const bundle = useMemo(() => makeComposer(gl, scene, camera, pixelSize), [camera, gl, pixelSize, scene])
  useEffect(() => {
    bundle.composer.setSize(size.width, size.height)
  }, [bundle, size.height, size.width])
  useEffect(() => () => disposeBundle(bundle), [bundle])
  useFrame((_, delta) => bundle.composer.render(delta), 1)
  return null
}

/* ---------- live sprite: its own canvas, the pixel pass at the world's size ---------- */

export function SpriteCanvas({
  id,
  size,
  motion = 'still',
  pixelSize = WORLD_PIXEL,
  className,
}: {
  id: SpriteId
  size: number
  motion?: SpriteMotion
  pixelSize?: number
  className?: string
}) {
  const def = SPRITES[id]
  return (
    <div className={`art-sprite-live${className ? ` ${className}` : ''}`} style={{ width: size, height: size }} data-sprite={id}>
      <Canvas
        dpr={1}
        frameloop={motion === 'still' ? 'demand' : 'always'}
        gl={SPRITE_GL}
        camera={{ fov: SPRITE_FOV, near: 0.5, far: 60 }}
        onCreated={(state) => {
          clearTransparent(state)
          placeCamera(state.camera as THREE.PerspectiveCamera, def)
        }}
      >
        <SpriteRig id={id} motion={motion} />
        <SpriteComposer pixelSize={pixelSize} />
      </Canvas>
    </div>
  )
}

/* ---------- bakery: one hidden canvas renders every sprite at every cell count once ---------- */

function Baker({ jobs, onBaked }: { jobs: BakeJob[]; onBaked: (key: string, url: string) => void }) {
  const { gl, scene, camera } = useThree()
  const [index, setIndex] = useState(0)
  const job = jobs[index]
  const bundle = useMemo(() => makeComposer(gl, scene, camera, WORLD_PIXEL), [camera, gl, scene])
  useEffect(() => () => disposeBundle(bundle), [bundle])
  /* One bake per animation frame: the sprite for this job is already in the scene when the
     effect runs, so render, read the canvas, and move on. */
  useEffect(() => {
    if (!job) return
    const frame = window.requestAnimationFrame(() => {
      placeCamera(camera as THREE.PerspectiveCamera, SPRITES[job.id])
      bundle.pass.setPixelSize(BAKE_PX / job.cells)
      bundle.composer.setSize(BAKE_PX, BAKE_PX)
      bundle.composer.render()
      onBaked(bakeKey(job), gl.domElement.toDataURL('image/png'))
      setIndex((i) => i + 1)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [bundle, camera, gl, job, onBaked])
  return job ? <SpriteRig key={bakeKey(job)} id={job.id} /> : null
}

export function SpriteBakery({ jobs, children }: { jobs: BakeJob[]; children: ReactNode }) {
  const [baked, setBaked] = useState<Record<string, string>>({})
  const onBaked = useMemo(() => (key: string, url: string) => setBaked((b) => (b[key] ? b : { ...b, [key]: url })), [])
  return (
    <BakeContext value={baked}>
      {children}
      <div className="art-bakery" aria-hidden="true" style={{ width: BAKE_PX, height: BAKE_PX }}>
        <Canvas dpr={1} frameloop="never" gl={SPRITE_GL} camera={{ fov: SPRITE_FOV, near: 0.5, far: 60 }} onCreated={clearTransparent}>
          <Baker jobs={jobs} onBaked={onBaked} />
        </Canvas>
      </div>
    </BakeContext>
  )
}

/** A baked sprite shown at `size` px. The bake is 192 px; the browser scales it with nearest
 *  neighbour, and every size here divides 192, so each cell lands on whole pixels. */
export function BakedSprite({
  id,
  size,
  mode = 'fixed',
  className,
  alt = '',
}: {
  id: SpriteId
  size: number
  mode?: PixelMode
  className?: string
  alt?: string
}) {
  const url = useBaked(id, cellsFor(size, mode))
  if (!url) return <span className={`art-sprite-pending${className ? ` ${className}` : ''}`} style={{ width: size, height: size }} />
  return <img className={`art-sprite${className ? ` ${className}` : ''}`} src={url} width={size} height={size} alt={alt} draggable={false} data-sprite={id} />
}
