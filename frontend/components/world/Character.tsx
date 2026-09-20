"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Blob, type BlobMotion } from "./Blob";
import { BIOMES, type Vec2 } from "@/lib/world/layout";
import { hashString, makeRng } from "@/lib/seed";
import type { CanvasCharacter, CanvasPlace } from "@/lib/world/types";
import { toonMaterial } from "@/lib/toon";

const STATE_SCALE: Record<CanvasCharacter["state"], number> = {
  idle: 1,
  evolved: 1.2,
  exploded: 0.85,
  recovered: 1.05,
  faded: 0.7,
};

export function Character({
  character,
  place,
  home,
  heightAt,
  selected,
  onSelect,
  onHover,
}: {
  character: CanvasCharacter;
  place: CanvasPlace;
  home: Vec2;
  heightAt: (x: number, z: number) => number;
  selected: boolean;
  onSelect: (conceptId: string | null) => void;
  onHover?: (conceptId: string | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<BlobMotion>({ moving: false, t: 0 });
  const biome = BIOMES[place.biome];
  const variant = hashString(character.id) % 4;
  const wander = useRef(
    (() => {
      const rng = makeRng(hashString(character.id));
      return { x: home.x, z: home.z, angle: rng() * Math.PI * 2, timer: rng() * 2, moving: false, rng };
    })(),
  );

  const heapMat = useMemo(() => toonMaterial(biome.creature), [biome.creature]);
  const still = character.state === "exploded" || character.state === "faded";

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const s = wander.current;
    motion.current.t += dt;
    s.timer -= dt;
    if (s.timer <= 0 && !still) {
      s.moving = !s.moving;
      s.timer = s.moving ? 1.4 + s.rng() * 2.4 : 1.2 + s.rng() * 2;
      if (s.moving) s.angle += (s.rng() - 0.5) * 2.2;
    }
    motion.current.moving = s.moving && !still;
    if (s.moving && !still) {
      const dx = s.x - home.x;
      const dz = s.z - home.z;
      // Residents stay by their concept: past a short leash they turn home.
      if (dx * dx + dz * dz > 1.2) s.angle = Math.atan2(home.x - s.x, home.z - s.z);
      s.x += Math.sin(s.angle) * dt * 0.6;
      s.z += Math.cos(s.angle) * dt * 0.6;
    }
    g.position.set(s.x, heightAt(s.x, s.z), s.z);
    g.rotation.y = s.angle;
  });

  const handlers = {
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onSelect(character.concept_id);
    },
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
      onHover?.(character.concept_id);
    },
    onPointerOut: () => {
      document.body.style.cursor = "auto";
      onHover?.(null);
    },
  };

  return (
    <group ref={group}>
      {still ? (
        <group {...handlers}>
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
        <group {...handlers}>
          <Blob
            color={biome.creature}
            accent={biome.accent}
            variant={variant}
            motion={motion}
            selected={selected}
            scale={STATE_SCALE[character.state]}
            onClick={() => onSelect(character.concept_id)}
          />
        </group>
      )}
    </group>
  );
}
