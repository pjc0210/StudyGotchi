"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { emit } from "@/lib/audio/events";
import { voiceFor } from "@/lib/audio/catalog";
import { hashString, makeRng } from "@/lib/seed";
import { BIOMES } from "@/lib/world/layout";
import { rosterBiome } from "@/lib/world/globe-courses";
import { pickCreature } from "@/lib/world/roster";
import type { BlobMotion } from "@/components/world/Blob";
import { GlbCreature, preloadRoster, type CreatureRequests } from "@/components/world/GlbCreature";
import { courseMarkerState, sampleTerrain } from "./globe-spec";
import { GLOBE_RADIUS } from "./globe-materials";
import type { CourseGlobeCourse, UnitDirection } from "./globe-types";

const UP = new THREE.Vector3(0, 1, 0);
const WALKERS_PER_TOWN = 6;
const WALKER_SCALE = 0.78;

interface GlobeWalkerProps {
  id: string;
  biome: CourseGlobeCourse["biome"];
  index: number;
  reducedMotion: boolean;
}

function GlobeWalker({ id, biome, index, reducedMotion }: GlobeWalkerProps) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<BlobMotion>({ moving: false, t: 0 });
  const requests = useRef<CreatureRequests>({ happy: false });
  const roster = rosterBiome(biome);
  const palette = BIOMES[roster];
  const wander = useRef(
    (() => {
      const rng = makeRng(hashString(`globe:${id}:${index}`));
      const angle = rng() * Math.PI * 2;
      const radius = 0.55 + rng() * 0.42;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        heading: angle + Math.PI / 2,
        timer: rng() * 2,
        moving: false,
        rng,
      };
    })(),
  );

  useFrame((_, dt) => {
    const node = group.current;
    if (!node) return;
    const state = wander.current;
    motion.current.t += dt;
    if (reducedMotion) {
      motion.current.moving = false;
      node.position.set(state.x, 0.02, state.z);
      node.rotation.y = state.heading;
      return;
    }
    state.timer -= dt;
    if (state.timer <= 0) {
      state.moving = !state.moving;
      state.timer = state.moving ? 1.2 + state.rng() * 2 : 1 + state.rng() * 1.8;
      if (state.moving) state.heading += (state.rng() - 0.5) * 2.1;
    }
    motion.current.moving = state.moving;
    if (state.moving) {
      const reach = state.x * state.x + state.z * state.z;
      if (reach > 0.85) state.heading = Math.atan2(-state.x, -state.z);
      state.x += Math.sin(state.heading) * dt * 0.22;
      state.z += Math.cos(state.heading) * dt * 0.22;
    }
    node.position.set(state.x, 0.02, state.z);
    node.rotation.y = state.heading;
  });

  return (
    <group
      ref={group}
      scale={WALKER_SCALE}
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
  reducedMotion: boolean;
}

function TownWalkers({
  course,
  direction,
  courses,
  directions,
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
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
}

interface GlobeCreaturesProps {
  courses: CourseGlobeCourse[];
  directions: Map<string, UnitDirection>;
  reducedMotion: boolean;
}

export function GlobeCreatures({ courses, directions, reducedMotion }: GlobeCreaturesProps) {
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
            reducedMotion={reducedMotion}
          />
        ) : null;
      })}
    </group>
  );
}
