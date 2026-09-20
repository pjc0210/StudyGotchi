import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  ICE_TOWN_PALETTE as P,
  type BiomeLayout,
  courseProgress,
  districtCentre,
  districtRadius,
  landmarkStage,
  mountainProfile,
} from '../layout/biome-layout'
import { sampleTerrain } from '../layout/terrain'
import { PixelComposer } from '../render/PixelComposer'
import { CameraRig } from '../camera/CameraRig'
import type { LabState } from '../state'
import { Aurora, Clouds, Snowfall, Stars, WhaleEvent } from './Ambient'
import { Catastrophe } from './Catastrophe'
import { Landmark } from './Landmark'
import { Residents } from './Residents'
import { Districts, Paths } from './Structures'
import { Floes, Forest, Landforms, Scatter, Terrain, Water } from './Terrain'

/** Fog rides the camera: nothing inside the frame is fogged, the range and the sea dissolve. */
function FogFollow({ blizzard }: { blizzard: boolean }) {
  const scene = useThree((s) => s.scene)
  const centre = useMemo(() => new THREE.Vector3(-2, 2, -8), [])
  useFrame(({ camera }) => {
    const fog = scene.fog as THREE.Fog | null
    if (!fog) return
    const d = camera.position.distanceTo(centre)
    // The range's front row sits ~1.1 d from the camera at the arrival and overview stations, so
    // fog starts there: the front row keeps its facets, the back rows dissolve (they are also
    // hazed per row in the terrain colours).
    const near = blizzard ? d * 0.3 : d * 1.1
    const far = blizzard ? d * 0.95 : d * 1.9
    fog.near += (near - fog.near) * 0.08
    fog.far += (far - fog.far) * 0.08
  })
  return null
}

interface BiomeSceneProps {
  layout: BiomeLayout
  state: LabState
  onDiveEnd: () => void
  onPickDistrict: (id: string) => void
}

export function BiomeScene({ layout, state, onDiveEnd, onPickDistrict }: BiomeSceneProps) {
  const { night, catastrophe } = state
  const blizzard = catastrophe.phase === 'blizzard'
  const ruined = catastrophe.phase === 'ruin' || catastrophe.phase === 'bang'
  const darkDistrict = ruined || blizzard ? catastrophe.districtId : null

  const fraction = courseProgress(layout, state.progress)
  const profile = useMemo(() => mountainProfile(fraction), [fraction])
  const headland = useMemo(() => {
    const [x, z] = layout.headland.center
    return [x, sampleTerrain(layout, x, z).height, z] as [number, number, number]
  }, [layout])
  const pickers = useMemo(
    () =>
      layout.districts.map((d) => {
        const [x, z] = districtCentre(d)
        return { id: d.id, name: d.name, x, z, y: Math.max(layout.seaLevel, sampleTerrain(layout, x, z).height), r: districtRadius(d) }
      }),
    [layout],
  )

  const sky = night ? P.skyNight : blizzard ? '#cfd6e2' : P.sky

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 300, 600]} />
      <FogFollow blizzard={blizzard} />
      <hemisphereLight args={[night ? '#5a5f8a' : '#dff4ff', night ? '#2a2540' : '#9e8fae', night ? 0.7 : 0.45]} />
      <directionalLight
        position={night ? [-40, 60, 30] : [60, 90, 70]}
        intensity={night ? 1.1 : 2.0}
        color={night ? '#8fa3d8' : '#fff3e0'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={360}
        shadow-camera-left={-110}
        shadow-camera-right={110}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
        shadow-bias={-0.0008}
      />

      <Water layout={layout} night={night} />
      <Terrain layout={layout} profile={profile} night={night} />
      <Floes layout={layout} seed={state.seed} night={night} />
      <Landforms layout={layout} night={night} />
      <Scatter layout={layout} seed={state.seed} />
      <Forest layout={layout} seed={state.seed} night={night} />
      <Paths layout={layout} progress={state.progress} />
      <Districts layout={layout} progress={state.progress} seed={state.seed} night={night} darkDistrict={darkDistrict} />
      <Landmark position={headland} stage={landmarkStage(fraction)} night={night} />
      <Residents layout={layout} progress={state.progress} count={state.residents} seed={state.seed} phase={catastrophe.phase} night={night} />
      <Catastrophe layout={layout} state={catastrophe} />

      {state.clouds && <Clouds layout={layout} night={night} />}
      {(state.snowfall || blizzard || night) && <Snowfall density={blizzard ? 2.5 : night && !state.snowfall ? 0.15 : 0.4} layout={layout} />}
      {state.whale && <WhaleEvent layout={layout} seed={state.seed} paused={catastrophe.phase !== 'calm'} />}
      {night && <Aurora />}
      {night && <Stars />}

      {pickers.map((d) => (
        <group key={d.id} position={[d.x, d.y, d.z]}>
          <mesh
            position={[0, 1, 0]}
            onClick={(e) => {
              e.stopPropagation()
              onPickDistrict(d.id)
            }}
          >
            <cylinderGeometry args={[d.r * 0.8, d.r * 0.8, 3, 10]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          {state.focusDistrict === d.id && (
            <Html position={[0, 9, 0]} center distanceFactor={90} className="region-label">
              <span>{d.name}</span>
            </Html>
          )}
        </group>
      ))}

      <CameraRig
        layout={layout}
        station={state.station}
        override={state.camera}
        focusDistrict={state.focusDistrict}
        diving={state.diving}
        onDiveEnd={onDiveEnd}
      />
      {state.pixel && <PixelComposer />}
    </>
  )
}
