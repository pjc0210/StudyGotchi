"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { GlbCreature, type CreatureRequests } from "@/components/world/GlbCreature";
import type { BlobMotion } from "@/components/world/Blob";
import { creatureUrl } from "@/lib/world/roster";
import { CREATURE_DISPLAY_HEIGHT } from "@/lib/world/creature-scale";
import type { BiomeLayout, DistrictProgress, IceDistrictKind } from "../layout/biome-layout";
import { sampleTerrain } from "../layout/terrain";
import type { CatastrophePhase } from "../state";
import { WALKER_DISTRICTS, paradePoint } from "./parade";

/** Mesh is 0.82 m; ice-town metres are larger, so the crowd matches house scale. */
const ICE_LAND_SCALE = 3.55;

/** Hatch pets, Pokémon-ish Tripo, Mario-ish gobkit — never the biome-lab stock hats. */
export const ICE_CAST = [
  { id: "blob-ice-2", district: "harbour" as IceDistrictKind, color: "#ffe14a", accent: "#342d45" },
  { id: "tripo-creature-18", district: "harbour" as IceDistrictKind, color: "#f4b39a", accent: "#342d45" },
  { id: "gobkit-minion-c02", district: "town" as IceDistrictKind, color: "#8fc9d8", accent: "#c8524a" },
  { id: "biped-ice-1", district: "town" as IceDistrictKind, color: "#dceef2", accent: "#5f8f78" },
  { id: "sprite-ice-1", district: "lake" as IceDistrictKind, color: "#fff6df", accent: "#c8524a" },
  { id: "kenney-penguin", district: "forest" as IceDistrictKind, color: "#342d45", accent: "#ffe14a" },
  { id: "bean-ice-1", district: "forest" as IceDistrictKind, color: "#7fa79a", accent: "#ffe7a3" },
  { id: "tripo-creature-20", district: "glacier" as IceDistrictKind, color: "#c9a2e6", accent: "#342d45" },
  { id: "kenney-polar", district: "station" as IceDistrictKind, color: "#eef4f7", accent: "#342d45" },
] as const;

export const residentPositions: THREE.Vector3[] = [];

function Walker({
  index,
  member,
  layout,
  dismantle,
}: {
  index: number;
  member: (typeof ICE_CAST)[number];
  layout: BiomeLayout;
  dismantle: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<BlobMotion>({ moving: false, t: 0 });
  const requests = useRef<CreatureRequests>({ happy: false });
  const wander = useRef({
    x: 0,
    z: 0,
    angle: index * 0.85 + WALKER_DISTRICTS.indexOf(member.district) * 0.4,
    timer: 0,
    moving: true,
  });

  useEffect(() => {
    if (!residentPositions[index]) residentPositions[index] = new THREE.Vector3();
  }, [index]);

  useFrame((_, dt) => {
    const root = group.current;
    if (!root) return;
    const s = wander.current;
    motion.current.t += dt;
    s.timer -= dt;
    if (!dismantle) {
      const dir = index % 2 === 0 ? 1 : -1;
      s.angle += dt * (0.22 + (index % 3) * 0.04) * dir;
      const point = paradePoint(layout, member.district, s.angle);
      s.x = point.x;
      s.z = point.z;
      s.moving = true;
    }
    motion.current.moving = s.moving && !dismantle;
    const ground = Math.max(layout.seaLevel + 0.12, sampleTerrain(layout, s.x, s.z).height);
    if (dismantle) {
      const t = motion.current.t;
      const pop = index === 1 && t < 1.4;
      const slip = Math.sin(t * 3.6 + index) * (pop ? 1.8 : 0.95);
      const hop = Math.abs(Math.sin(t * 6.1 + index * 0.8)) * (pop ? 2.4 : 0.42);
      root.position.set(s.x + slip, ground + hop + (pop ? t * 3.2 : 0), s.z + Math.cos(t * 2.4 + index) * 0.28);
      root.rotation.set(
        0.62 + Math.sin(t * 4.4 + index) * 0.38,
        s.angle + t * (pop ? 8 : 0.55) + Math.sin(t * 2.2 + index) * 0.4,
        0.9 * Math.sin(t * 3.1 + index),
      );
      root.scale.setScalar(pop ? Math.max(0.05, 1.35 - t * 1.1) : 1);
    } else {
      root.position.set(s.x, ground, s.z);
      root.rotation.set(0, s.angle + (index % 2 === 0 ? Math.PI / 2 : -Math.PI / 2), 0);
      root.scale.setScalar(1);
    }
    residentPositions[index]?.copy(root.position);
  });

  return (
    <group ref={group} userData={{ displayHeight: CREATURE_DISPLAY_HEIGHT, walker: member.id }}>
      <GlbCreature
        id={member.id}
        variant={index}
        motion={motion}
        requests={requests}
        sad={dismantle}
        scale={ICE_LAND_SCALE}
        color={member.color}
        accent={member.accent}
      />
      <SillyFailBits dismantle={dismantle} index={index} accent={member.accent} />
    </group>
  );
}

function SillyFailBits({
  dismantle,
  index,
  accent,
}: {
  dismantle: boolean;
  index: number;
  accent: string;
}) {
  const hat = useRef<THREE.Group>(null);
  const cubes = useRef<THREE.Group>(null);
  const hatY = CREATURE_DISPLAY_HEIGHT * ICE_LAND_SCALE * 0.94;

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (hat.current) {
      if (dismantle) {
        hat.current.position.set(Math.sin(t * 3.2 + index) * 0.7, hatY + 1.15 + Math.abs(Math.sin(t * 5 + index)) * 0.55, Math.cos(t * 2.6 + index) * 0.4);
        hat.current.rotation.set(t * 3.4 + index, t * 4.1, 0.8);
      } else {
        hat.current.position.set(0, hatY, 0);
        hat.current.rotation.set(-0.12, 0, 0);
      }
    }
    if (cubes.current) {
      cubes.current.visible = dismantle;
      cubes.current.children.forEach((child, i) => {
        const spin = t * (2.8 + i * 0.4) + index;
        child.position.set(Math.sin(spin) * (0.9 + i * 0.25), 0.45 + Math.abs(Math.sin(spin * 1.6)) * 0.7, Math.cos(spin * 1.1) * 0.7);
        child.rotation.set(spin, spin * 1.3, spin * 0.6);
      });
    }
  });

  return (
    <group>
      <group ref={hat} visible={dismantle}>
        <mesh>
          <coneGeometry args={[0.42, 0.62, 7]} />
          <meshStandardMaterial color={accent} roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#fff6df" />
        </mesh>
      </group>
      <group ref={cubes} visible={false}>
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <boxGeometry args={[0.28, 0.28, 0.28]} />
            <meshStandardMaterial color="#d7eef8" roughness={0.15} transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function OurWalkers({
  layout,
  progress,
  phase,
}: {
  layout: BiomeLayout;
  progress: DistrictProgress;
  phase: CatastrophePhase;
}) {
  const fraction = Object.values(progress)[0] ?? 0;
  useEffect(() => {
    for (const member of ICE_CAST) useGLTF.preload(creatureUrl(member.id));
  }, []);
  const shown = useMemo(() => {
    if (fraction <= 0.05) return [];
    if (fraction < 0.75) return ICE_CAST.slice(0, 4);
    return ICE_CAST;
  }, [fraction]);
  const dismantle = phase === "bang" || phase === "ruin" || phase === "blizzard";

  return (
    <group name="our-ice-walkers">
      {shown.map((member, index) => (
        <Walker key={member.id} index={index} member={member} layout={layout} dismantle={dismantle} />
      ))}
    </group>
  );
}
