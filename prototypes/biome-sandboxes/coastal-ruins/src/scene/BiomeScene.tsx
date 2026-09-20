import {
  COASTAL_PALETTE as P,
  type BiomeLayout,
  courseProgress,
  landmarkStage,
  skylineProfile,
} from '../layout/biome-layout'
import { PixelComposer } from '../render/PixelComposer'
import { CameraRig } from '../camera/CameraRig'
import type { LabState } from '../state'
import { BoatEvent, Clouds, Stars } from './Ambient'
import { Catastrophe } from './Catastrophe'
import { Landmark } from './Landmark'
import { Residents } from './Residents'
import { Districts, Paths } from './Structures'
import { CoastalDressing, CoastFoam, Escarpment, GlobeMarker, HorizonStacks, Terrain, Water } from './Terrain'

interface BiomeSceneProps {
  layout: BiomeLayout
  state: LabState
  onDiveEnd: () => void
}

export function BiomeScene({ layout, state, onDiveEnd }: BiomeSceneProps) {
  const fraction = courseProgress(layout, state.progress)
  const profile = skylineProfile(fraction)
  const blighted = state.catastrophe.phase !== 'calm' ? state.catastrophe.districtId : null
  const sky = state.night ? P.skyNight : state.catastrophe.phase === 'squall' ? '#b8aa99' : P.sky

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, layout.fog.near * 0.56, layout.fog.far * 0.56]} />
      <hemisphereLight args={[state.night ? '#61748b' : '#eef8f4', state.night ? '#28323b' : '#9b806b', state.night ? 0.65 : 0.75]} />
      <directionalLight
        position={state.night ? [-60, 80, 35] : [80, 120, 75]}
        intensity={state.night ? 1.2 : 2.2}
        color={state.night ? '#90a8c6' : '#fff2d7'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={310}
        shadow-camera-left={-145}
        shadow-camera-right={145}
        shadow-camera-top={145}
        shadow-camera-bottom={-145}
        shadow-bias={-0.0008}
      />

      {state.markerMode ? (
        <>
          <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[260, 64]} />
            <meshBasicMaterial color={state.night ? P.waterNight : P.water} />
          </mesh>
          <GlobeMarker progress={fraction} night={state.night} />
        </>
      ) : (
        <group scale={layout.renderScale}>
          <Water layout={layout} night={state.night} />
          <Terrain layout={layout} night={state.night} />
          <CoastFoam layout={layout} night={state.night} />
          <CoastalDressing night={state.night} />
          <Escarpment profile={profile} night={state.night} />
          <HorizonStacks night={state.night} />
          <Paths layout={layout} seed={state.seed} />
          <Districts
            layout={layout}
            progress={state.progress}
            seed={state.seed}
            night={state.night}
            darkDistrict={blighted}
          />
          <Landmark
            position={[layout.headland.center[0], layout.headland.height, layout.headland.center[1]]}
            stage={landmarkStage(fraction)}
            night={state.night}
          />
          <Residents
            layout={layout}
            progress={state.progress}
            count={state.residents}
            seed={state.seed}
            phase={state.catastrophe.phase}
            night={state.night}
          />
          <Catastrophe layout={layout} seed={state.seed} state={state.catastrophe} />
          {state.clouds && <Clouds layout={layout} night={state.night} />}
          {state.boatEvent && <BoatEvent layout={layout} seed={state.seed} paused={state.catastrophe.phase !== 'calm'} />}
          {state.night && <Stars />}
        </group>
      )}

      <CameraRig
        layout={layout}
        seed={state.seed}
        station={state.station}
        override={state.camera}
        focusDistrict={state.focusDistrict}
        diving={state.diving}
        markerMode={state.markerMode}
        onDiveEnd={onDiveEnd}
      />
      {state.pixel && <PixelComposer />}
    </>
  )
}
