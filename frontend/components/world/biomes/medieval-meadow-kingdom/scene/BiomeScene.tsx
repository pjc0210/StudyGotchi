import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  MEADOW_PALETTE as P,
  courseProgress,
  greenCrownProfile,
  landmarkStage,
  type GeneratedKingdom,
} from '../layout/biome-layout'
import { sampleTerrain } from '../layout/terrain'
import { CameraRig } from '../camera/CameraRig'
import { PixelComposer } from '../render/PixelComposer'
import type { LabState } from '../state'
import { Birds, Clouds, MeadowMotes, Stars } from './Ambient'
import { Catastrophe } from './Catastrophe'
import { Landmark } from './Landmark'
import { Residents } from './Residents'
import { Districts } from './Structures'
import { HoverTabs } from './HoverTabs'
import { GreenCrown, MeadowScatter, River, Roads, Terrain, Woodland } from './Terrain'

function FogFollow({ catastrophe }: { catastrophe: boolean }) {
  const scene = useThree((state) => state.scene)
  const center = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  useFrame(({ camera }) => {
    const fog = scene.fog as THREE.Fog | null
    if (!fog) return
    const distance = camera.position.distanceTo(center)
    const near = catastrophe ? distance * 0.35 : distance * 1.4
    const far = catastrophe ? distance * 0.9 : distance * 2.8
    fog.near += (near - fog.near) * 0.08
    fog.far += (far - fog.far) * 0.08
  })
  return null
}

export function BiomeScene({
  layout,
  state,
  onDiveEnd,
  onPickDistrict,
  hoveredId,
  onHover,
}: {
  layout: GeneratedKingdom
  state: LabState
  onDiveEnd: () => void
  onPickDistrict: (id: string) => void
  hoveredId: string | null
  onHover: (id: string | null) => void
}) {
  const fraction = courseProgress(layout, state.progress)
  const crown = greenCrownProfile(fraction)
  const disrupted = state.catastrophe.phase !== 'calm' && state.catastrophe.phase !== 'recovering'
  const darkDistrict = disrupted ? state.catastrophe.districtId : null
  const sky = state.night ? P.skyNight : disrupted ? '#9ba9a0' : P.sky
  const landmarkSample = sampleTerrain(layout, ...layout.landmark.position)
  const landmarkPosition: [number, number, number] = [
    layout.landmark.position[0],
    landmarkSample.height,
    layout.landmark.position[1],
  ]

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 250, 620]} />
      <FogFollow catastrophe={disrupted} />
      <hemisphereLight
        args={[state.night ? '#536184' : '#e9f6ed', state.night ? '#20233a' : '#6f8055', state.night ? 0.75 : 0.7]}
      />
      <directionalLight
        position={state.night ? [-70, 90, 30] : [70, 105, 85]}
        intensity={state.night ? 1.4 : 2.3}
        color={state.night ? '#9db5e3' : '#fff0cf'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
        shadow-camera-near={10}
        shadow-camera-far={420}
        shadow-bias={-0.0006}
      />

      <Terrain layout={layout} night={state.night} />
      <River layout={layout} night={state.night} />
      <Roads layout={layout} />
      <GreenCrown profile={crown} night={state.night} />
      <Woodland layout={layout} seed={state.seed} night={state.night} />
      <MeadowScatter layout={layout} seed={state.seed} />
      <Districts
        layout={layout}
        progress={state.progress}
        night={state.night}
        darkDistrict={darkDistrict}
      />
      <Landmark position={landmarkPosition} stage={landmarkStage(fraction)} night={state.night} />
      <Residents
        layout={layout}
        progress={state.progress}
        count={state.residents}
        seed={state.seed}
        phase={state.catastrophe.phase}
        night={state.night}
      />
      <Catastrophe layout={layout} state={state.catastrophe} />

      {state.clouds && <Clouds layout={layout} night={state.night} />}
      {state.snowfall && <MeadowMotes layout={layout} density={1} />}
      {state.whale && <Birds />}
      {state.night && <MeadowMotes layout={layout} density={0.65} />}
      {state.night && <Stars />}

      {layout.districts.map((district) => (
        <group key={district.id} position={[district.centre[0], district.id === 'castle-court' ? 2.2 : 0, district.centre[1]]}>
          <mesh
            position={[0, 2.5, 0]}
            onClick={(event) => {
              event.stopPropagation()
              onPickDistrict(district.id)
            }}
          >
            <cylinderGeometry args={[11, 11, 5, 10]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}
      <HoverTabs layout={layout} state={state} hoveredId={hoveredId} onHover={onHover} />

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
