"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Blob, type BlobMotion } from "./Blob";
import { BIOMES, characterOffset, worldPosition, type Vec2 } from "@/lib/world/layout";
import { hashString, makeRng } from "@/lib/seed";
import type { CharacterOut, PlaceOut } from "@/lib/world/types";
import { toonMaterial } from "@/lib/toon";

const STATE_SCALE: Record<CharacterOut["state"], number> = {
  idle: 1,
  evolved: 1.15,
  exploded: 0.85,
  recovered: 1.05,
  faded: 0.7,
};

export function Character({
  character,
  place,
  center,
  heightAt,
  selected,
  onSelect,
}: {
  character: CharacterOut;
  place: PlaceOut;
  center: Vec2;
  heightAt: (x: number, z: number) => number;
  selected: boolean;
  onSelect: (conceptId: string | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<BlobMotion>({ moving: false, t: 0 });
  const biome = BIOMES[place.biome];
  const variant = hashString(character.id) % 4;
  const pos = useMemo(() => worldPosition(center, characterOffset(character.id)), [center, character.id]);
  const wander = useRef(
    (() => {
      const rng = makeRng(hashString(character.id));
      return {
        x: pos.x,
        z: pos.z,
        angle: rng() * Math.PI * 2,
        timer: rng() * 2,
        moving: character.kind === "wisp",
        rng,
      };
    })(),
  );

  const heapMat = useMemo(() => toonMaterial(biome.creature), [biome.creature]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const s = wander.current;
    motion.current.t += dt;
    s.timer -= dt;
    if (s.timer <= 0 && character.state !== "exploded" && character.state !== "faded") {
      s.moving = !s.moving;
      s.timer = s.moving ? 1.4 + s.rng() * 2.4 : 1.2 + s.rng() * 2;
      if (s.moving) s.angle += (s.rng() - 0.5) * 2.2;
    }
    motion.current.moving = s.moving && character.state !== "exploded";
    if (s.moving && character.state !== "exploded") {
      const homeX = pos.x;
      const homeZ = pos.z;
      const dx = s.x - homeX;
      const dz = s.z - homeZ;
      if (dx * dx + dz * dz > 2.2) {
        s.angle = Math.atan2(homeX - s.x, homeZ - s.z);
      }
      s.x += Math.sin(s.angle) * dt * (character.kind === "wisp" ? 1.1 : 0.7);
      s.z += Math.cos(s.angle) * dt * (character.kind === "wisp" ? 1.1 : 0.7);
    }
    const y = heightAt(s.x, s.z);
    g.position.set(s.x, y, s.z);
    g.rotation.y = s.angle;
  });

  const selectId = character.concept_ids[0] ?? null;
  const exploded = character.state === "exploded" || character.state === "faded";

  return (
    <group ref={group}>
      {exploded ? (
        <group
          onClick={(e) => {
            e.stopPropagation();
            onSelect(selectId);
          }}
        >
          {[-0.18, 0, 0.2].map((ox, i) => (
            <mesh key={i} position={[ox, 0.12, i === 1 ? 0.12 : -0.08]} material={heapMat} rotation={[0.3 * i, 0.4, 0.2]}>
              <dodecahedronGeometry args={[0.16 - i * 0.02, 0]} />
            </mesh>
          ))}
          <mesh position={[-0.06, 0.28, 0.16]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshBasicMaterial color="#2b2b33" />
          </mesh>
          <mesh position={[0.08, 0.3, 0.14]}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshBasicMaterial color="#2b2b33" />
          </mesh>
        </group>
      ) : (
        <Blob
          color={biome.creature}
          accent={biome.accent}
          variant={variant}
          motion={motion}
          selected={selected}
          scale={STATE_SCALE[character.state]}
          onClick={() => onSelect(selectId)}
        />
      )}
    </group>
  );
}
