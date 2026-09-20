import { Suspense, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  ICE_TOWN_PALETTE as P,
  type BiomeLayout,
  courseProgress,
  landmarkStage,
  mountainProfile,
} from '../layout/biome-layout'
import { sampleTerrain } from '../layout/terrain'
import { LockedOverviewCamera } from '../camera/CameraRig'
import type { LabState } from '../state'
import { Aurora, Clouds, GustRibbons, Snowfall, Stars, WhaleEvent } from './Ambient'
import { Catastrophe } from './Catastrophe'
import { IceHover } from './IceHover'
import { Landmark } from './Landmark'
import { Residents } from './Residents'
import { Districts, Paths } from './Structures'
import { Floes, Forest, Landforms, Scatter, Terrain, Water } from './Terrain'
import { WorldScene } from '../world/WorldScene'

interface BiomeSceneProps {
  layout: BiomeLayout
  state: LabState
  onDiveEnd: () => void
  onPickDistrict: (id: string) => void
  hoveredId?: string | null
  onHover?: (id: string | null) => void
}

function DelayedResidents({
  layout,
  progress,
  phase,
}: {
  layout: BiomeLayout
  progress: LabState['progress']
  phase: LabState['catastrophe']['phase']
}) {
  const [ready, setReady] = useState(false)
  useFrame(() => {
    if (!ready) setReady(true)
  })
  if (!ready) return null
  return (
    <Suspense fallback={null}>
      <Residents layout={layout} progress={progress} phase={phase} />
    </Suspense>
  )
}

export function BiomeScene({ layout, state, onDiveEnd, onPickDistrict, hoveredId = null, onHover }: BiomeSceneProps) {
  const { night, catastrophe } = state
  const blizzard = catastrophe.phase === 'blizzard'
  const ruined = catastrophe.phase === 'ruin' || catastrophe.phase === 'bang'
  const storm = blizzard || ruined
  const darkDistrict = storm ? '*' : null

  const fraction = courseProgress(layout, state.progress)
  const profile = useMemo(() => mountainProfile(Math.max(0.62, fraction)), [fraction])
  const headland = useMemo(() => {
    const [x, z] = layout.headland.center
    return [x, sampleTerrain(layout, x, z).height, z] as [number, number, number]
  }, [layout])

  const world = layout.world
  const sky = night ? (world?.colours.skyNight ?? P.skyNight) : storm ? '#6d84a0' : (world?.colours.sky ?? P.sky)

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, storm ? 130 : 220, storm ? 480 : 640]} />
      <hemisphereLight args={[night || storm ? '#8aa0c0' : '#dff4ff', night || storm ? '#3a3550' : '#9e8fae', storm ? 0.58 : night ? 0.7 : 0.45]} />
      <directionalLight
        position={night || storm ? [-40, 60, 30] : [60, 90, 70]}
        intensity={storm ? 1.15 : night ? 1.1 : 2.0}
        color={storm ? '#b7c8dc' : night ? '#8fa3d8' : '#fff3e0'}
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

      {world ? (
        <WorldScene layout={layout} world={world} progress={state.progress} seed={state.seed} night={night} darkDistrict={darkDistrict} />
      ) : (
        <>
          <Water layout={layout} night={night} />
          <Terrain layout={layout} profile={profile} night={night} />
          <Floes layout={layout} seed={state.seed} night={night} />
          <Landforms layout={layout} night={night} />
          <Scatter layout={layout} seed={state.seed} />
          <Forest layout={layout} seed={state.seed} night={night} />
          <Paths layout={layout} progress={state.progress} />
          <Districts layout={layout} progress={state.progress} seed={state.seed} night={night} darkDistrict={darkDistrict} />
          <Landmark position={headland} stage={landmarkStage(fraction)} night={night} />
        </>
      )}
      <DelayedResidents layout={layout} progress={state.progress} phase={catastrophe.phase} />
      <Catastrophe layout={layout} state={catastrophe} />

      {(state.clouds || storm) && <Clouds layout={layout} night={night || storm} />}
      {!world && (state.snowfall || storm || night) && (
        <Snowfall
          density={storm ? 0.7 : night && !state.snowfall ? 0.15 : 0.4}
          storm={storm}
          layout={layout}
        />
      )}
      {storm ? <GustRibbons layout={layout} /> : null}
      {state.whale && (!world || world.creatureEvent) && <WhaleEvent layout={layout} seed={state.seed} paused={catastrophe.phase !== 'calm'} />}
      {night && !world && <Aurora />}
      {night && <Stars />}

      <IceHover
        layout={layout}
        hoveredId={hoveredId}
        selectedId={state.focusDistrict}
        onHover={onHover ?? (() => undefined)}
        onPick={onPickDistrict}
      />

      <LockedOverviewCamera layout={layout} focusDistrict={state.focusDistrict} />
    </>
  )
}
