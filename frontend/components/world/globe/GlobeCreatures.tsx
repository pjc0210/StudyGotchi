"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { emit } from "@/lib/audio/events";
import { voiceFor } from "@/lib/audio/catalog";
import { hashString } from "@/lib/seed";
import { BIOMES } from "@/lib/world/layout";
import { rosterBiome } from "@/lib/world/globe-courses";
import { pickCreature } from "@/lib/world/roster";
import type { BlobMotion } from "@/components/world/Blob";
import { GlbCreature, preloadRoster, type CreatureRequests } from "@/components/world/GlbCreature";
import { courseMarkerState, sampleTerrain } from "./globe-spec";
import { GLOBE_BUDDY_SCALE, globeBuddyPoint } from "./globe-parade";
import { GLOBE_RADIUS } from "./globe-materials";
import type { CourseGlobeCourse, UnitDirection } from "./globe-types";

const UP = new THREE.Vector3(0, 1, 0);
const WALKERS_PER_TOWN = 6;

interface GlobeWalkerProps {
  id: string;
  biome: CourseGlobeCourse["biome"];
  index: number;
  count: number;
  progress: number | null;
  active: boolean;
  reducedMotion: boolean;
}

function GlobeWalker({
  id,
  biome,
  index,
  count,
  progress,
  active,
  reducedMotion,
}: GlobeWalkerProps) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<BlobMotion>({ moving: true, t: 0 });
  const requests = useRef<CreatureRequests>({ happy: false });
  const roster = rosterBiome(biome);
  const palette = BIOMES[roster];
  const parade = useRef({
    angle: (index / Math.max(1, count)) * Math.PI * 2,
    dir: index % 2 === 0 ? 1 : -1,
  });

  useFrame((_, dt) => {
    const node = group.current;
    if (!node) return;
    const state = parade.current;
    motion.current.t += dt;
    if (!reducedMotion) {
      state.angle += dt * (0.18 + (index % 3) * 0.03) * state.dir;
      motion.current.moving = true;
    } else {
      motion.current.moving = false;
    }
    const point = globeBuddyPoint(progress, active, index, count, state.angle);
    node.position.set(point.x, 0.02, point.z);
    node.rotation.y = point.heading;
  });

  return (
    <group
      ref={group}
      scale={GLOBE_BUDDY_SCALE}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <GlbCreature
        id={id}
        variant={hashString(id) % 4}
        motion={motion}
        requests={requests}
        color={palette.creature}
        accent={palette.accent}
        onClick={() => {
          requests.current.happy = true;
          emit({
            type: "creature-select",
            label: id.replace(/^(tripo-|kenney-|gobkit-|pizza-)/, "").replace(/-/g, " "),
            species: voiceFor(roster, palette.creature),
            mood: "happy",
          });
        }}
      />
    </group>
  );
}

interface TownWalkersProps {
  course: CourseGlobeCourse;
  direction: UnitDirection;
  courses: CourseGlobeCourse[];
  directions: Map<string, UnitDirection>;
  active: boolean;
  reducedMotion: boolean;
}

function TownWalkers({
  course,
  direction,
  courses,
  directions,
  active,
  reducedMotion,
}: TownWalkersProps) {
  const normal = useMemo(() => new THREE.Vector3(...direction).normalize(), [direction]);
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(UP, normal), [normal]);
  const terrain = sampleTerrain(direction, courses, directions);
  const position = useMemo(
    () =>
      normal
        .clone()
        .multiplyScalar(GLOBE_RADIUS + Math.max(0, terrain.elevation) + 0.035),
    [normal, terrain.elevation],
  );
  const marker = courseMarkerState(course.progress);
  const count = Math.min(WALKERS_PER_TOWN, Math.max(marker.pawnCount, 5));
  const ids = useMemo(
    () =>
      Array.from({ length: count }, (_, index) =>
        pickCreature(course.id, rosterBiome(course.biome), index),
      ),
    [count, course.biome, course.id],
  );

  return (
    <group position={position} quaternion={quaternion}>
      {ids.map((id, index) => (
        <GlobeWalker
          key={`${course.id}:${id}:${index}`}
          id={id}
          biome={course.biome}
          index={index}
          count={count}
          progress={course.progress}
          active={active}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}

interface GlobeCreaturesProps {
  courses: CourseGlobeCourse[];
  directions: Map<string, UnitDirection>;
  activeCourseId?: string | null;
  reducedMotion: boolean;
}

export function GlobeCreatures({
  courses,
  directions,
  activeCourseId = null,
  reducedMotion,
}: GlobeCreaturesProps) {
  useEffect(() => {
    preloadRoster(new Set(courses.map((course) => rosterBiome(course.biome))));
  }, [courses]);

  return (
    <group>
      {courses.map((course) => {
        const direction = directions.get(course.id);
        return direction ? (
          <TownWalkers
            key={course.id}
            course={course}
            direction={direction}
            courses={courses}
            directions={directions}
            active={course.id === activeCourseId}
            reducedMotion={reducedMotion}
          />
        ) : null;
      })}
    </group>
  );
}
