"use client";

import { useCallback, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GlbCreature, type ClipName, type CreatureRequests } from "./GlbCreature";
import type { BlobMotion } from "./Blob";
import { BIOMES, type Vec2 } from "@/lib/world/layout";
import { creatureMeta, pickCreature } from "@/lib/world/roster";
import { hashString, makeRng } from "@/lib/seed";
import type { CanvasCharacter, CanvasPlace } from "@/lib/world/types";
import { MOOD_FOR_STATE, voiceFor } from "@/lib/audio/catalog";
import { emit } from "@/lib/audio/events";

const STATE_SCALE: Record<CanvasCharacter["state"], number> = {
  idle: 1.2,
  evolved: 1.45,
  exploded: 1,
  recovered: 1.28,
  faded: 0.85,
};

export function Character({
  character,
  place,
  home,
  seed,
  heightAt,
  selected,
  onSelect,
  onHover,
}: {
  character: CanvasCharacter;
  place: CanvasPlace;
  home: Vec2;
  /** the world's seed; with the place id it decides which body this resident wears */
  seed: string;
  heightAt: (x: number, z: number) => number;
  selected: boolean;
  onSelect: (conceptId: string | null) => void;
  onHover?: (conceptId: string | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<BlobMotion>({ moving: false, t: 0 });
  const requests = useRef<CreatureRequests>({ happy: false });
  const biome = BIOMES[place.biome];
  const variant = hashString(character.id) % 4;
  const index = Math.max(0, place.concept_ids.indexOf(character.concept_id));
  const creatureId = useMemo(() => pickCreature(`${seed}:${place.id}`, place.biome, index), [seed, place.id, place.biome, index]);
  const meta = creatureMeta(creatureId);
  const wander = useRef(
    (() => {
      const rng = makeRng(hashString(character.id));
      return { x: home.x, z: home.z, angle: rng() * Math.PI * 2, timer: rng() * 2, moving: false, rng };
    })(),
  );

  // Knocked-over and faded residents stand where they are and play the sad clip.
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

  const select = useCallback(() => {
    requests.current.happy = true;
    onSelect(character.concept_id);
    emit({
      type: "creature-select",
      label: character.label,
      species: voiceFor(place.biome, biome.creature),
      mood: MOOD_FOR_STATE[character.state],
      personality: meta?.personality,
    });
  }, [character.concept_id, character.label, character.state, place.biome, biome.creature, meta?.personality, onSelect]);

  const onClip = useCallback((clip: ClipName) => {
    if (clip === "sleep") emit({ type: "creature-sleep" });
  }, []);

  const hoverIn = useCallback(() => onHover?.(character.concept_id), [onHover, character.concept_id]);
  const hoverOut = useCallback(() => onHover?.(null), [onHover]);

  return (
    <group ref={group}>
      <GlbCreature
        id={creatureId}
        variant={variant}
        motion={motion}
        requests={requests}
        sad={still}
        selected={selected}
        scale={STATE_SCALE[character.state]}
        color={biome.creature}
        accent={biome.accent}
        onClick={select}
        onPointerOver={hoverIn}
        onPointerOut={hoverOut}
        onClip={onClip}
      />
    </group>
  );
}
