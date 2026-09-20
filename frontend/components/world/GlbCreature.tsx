"use client";

import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { paintedToonMaterial, toonMaterial } from "@/lib/toon";
import { GUEST_BY_ID, isGuestId } from "@/lib/world/guest-pack";
import { ISLAND_ROSTER, creatureMeta, creatureUrl } from "@/lib/world/roster";
import type { BiomeId } from "@/lib/world/types";
import { Blob, type BlobMotion } from "./Blob";

export type ClipName = "idle" | "walk" | "happy" | "sad" | "sleep";

/** Set by the click handler, consumed by the model's frame loop. */
export interface CreatureRequests {
  happy: boolean;
}

const FADE = 0.15;
/** a `sleepy` creature dozes off after standing still this long */
const SLEEP_AFTER = 6;

const preloaded = new Set<BiomeId>();
/** Warm the GLB cache for the biomes on screen so residents pop in without a fetch gap. */
export function preloadRoster(biomes: Iterable<BiomeId>) {
  for (const biome of biomes) {
    if (preloaded.has(biome)) continue;
    preloaded.add(biome);
    for (const id of ISLAND_ROSTER[biome].slice(0, 10)) useGLTF.preload(creatureUrl(id));
  }
}

function toHex(m: THREE.Material): string {
  const c = (m as THREE.MeshStandardMaterial).color;
  return c ? "#" + c.getHexString() : "#cccccc";
}

export interface GlbCreatureProps {
  id: string;
  /** staggers idle phase and picks the fallback's accessory */
  variant: number;
  motion: React.RefObject<BlobMotion>;
  requests: React.RefObject<CreatureRequests>;
  /** stands still and plays the `sad` clip */
  sad?: boolean;
  selected?: boolean;
  scale?: number;
  /** fallback body colours when the GLB cannot load */
  color: string;
  accent: string;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  /** fires when the body settles on a new clip (Character turns `sleep` into a sound) */
  onClip?: (clip: ClipName) => void;
}

/**
 * One animated GLB creature. The loaded scene is cloned per instance and re-skinned with the
 * shared toon materials (one material per colour across the whole roster). `Root` is never
 * animated: the parent group moves the creature exactly as it moves the primitive Blob.
 *
 * Clip state machine: walk while `motion.moving`, else idle; `happy` once on click (LoopOnce +
 * clampWhenFinished, then back); `sleep` for sleepy personalities after 6 s of standing still;
 * `sad` while the `sad` prop is set. Every transition is a 0.15 s crossfade.
 */
function GlbCreatureModel({
  id,
  motion,
  variant,
  sad,
  requests,
  onClip,
}: Pick<GlbCreatureProps, "id" | "motion" | "variant" | "sad" | "requests" | "onClip">) {
  const gltf = useGLTF(creatureUrl(id));
  const root = useRef<THREE.Group>(null);
  const scene = useMemo(() => {
    const s = cloneSkeleton(gltf.scene) as THREE.Group;
    s.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const mesh = o as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const toon = mats.map((m) => (isGuestId(id) ? paintedToonMaterial(m) : toonMaterial(toHex(m))));
        mesh.material = toon.length === 1 ? toon[0] : toon;
      }
    });
    return s;
  }, [gltf.scene, id]);

  const { actions, mixer } = useAnimations(gltf.animations, root);
  const state = useRef<{ current: ClipName | null; idleFor: number; happy: boolean }>({ current: null, idleFor: 0, happy: false });
  const sleepy = creatureMeta(id)?.personality === "sleepy";

  useEffect(() => {
    const happy = actions.happy;
    if (happy) {
      happy.setLoop(THREE.LoopOnce, 1);
      happy.clampWhenFinished = true;
    }
    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action === happy) state.current.happy = false;
    };
    mixer.addEventListener("finished", onFinished);
    const idle = actions.idle;
    if (idle) {
      idle.play();
      // stagger loop phases so a crowd does not breathe in unison
      idle.time = (variant * 0.37) % (idle.getClip().duration || 1);
      state.current.current = "idle";
    }
    return () => {
      mixer.removeEventListener("finished", onFinished);
      mixer.stopAllAction();
    };
  }, [actions, mixer, variant]);

  const pop = useRef(0);
  useFrame((_, dt) => {
    const m = motion.current;
    const s = state.current;
    if (!m) return;
    pop.current = Math.min(1, pop.current + dt * 2.5);
    const k = pop.current;
    const popScale = k < 1 ? 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2) : 1;
    const guestScale = GUEST_BY_ID[id]?.scale ?? 1;
    if (root.current) {
      root.current.scale.setScalar(Math.max(0.001, popScale) * guestScale);
      if ((gltf.animations?.length ?? 0) === 0) {
        root.current.position.y = m.moving ? Math.abs(Math.sin(m.t * 12)) * 0.08 : Math.sin(m.t * 2) * 0.02;
      }
    }

    if (requests.current?.happy) {
      requests.current.happy = false;
      s.happy = true;
      s.current = null; // force a fresh play even if happy was already the current clip
    }
    if (m.moving) s.idleFor = 0;
    else s.idleFor += dt;

    let next: ClipName;
    if (s.happy) next = "happy";
    else if (sad) next = "sad";
    else if (m.moving) next = "walk";
    else if (sleepy && s.idleFor >= SLEEP_AFTER) next = "sleep";
    else next = "idle";

    if (next === s.current) return;
    const to = actions[next];
    if (!to) {
      s.current = next;
      return;
    }
    const from = s.current ? actions[s.current] : null;
    to.reset().setEffectiveWeight(1).play();
    if (from && from !== to) from.crossFadeTo(to, FADE, false);
    else if (!from) for (const a of Object.values(actions)) if (a && a !== to && a.isRunning()) a.crossFadeTo(to, FADE, false);
    s.current = next;
    onClip?.(next);
  });

  return (
    <group ref={root} scale={0.001}>
      <primitive object={scene} />
    </group>
  );
}

/** Falls back to the primitive Blob if the GLB fails to load or parse. */
class CreatureBoundary extends Component<{ fallback: ReactNode; children: ReactNode; id: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn(`[GlbCreature] ${this.props.id} failed, using primitive Blob`, err);
  }
  componentDidUpdate(prev: { id: string }) {
    if (prev.id !== this.props.id && this.state.failed) this.setState({ failed: false });
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function GlbCreature({
  id,
  variant,
  motion,
  requests,
  sad,
  selected,
  scale = 1,
  color,
  accent,
  onClick,
  onPointerOver,
  onPointerOut,
  onClip,
}: GlbCreatureProps) {
  const fallback = (
    <Blob color={color} accent={accent} variant={variant} motion={motion} onClick={onClick} selected={selected} scale={scale} />
  );

  return (
    <CreatureBoundary id={id} fallback={fallback}>
      <group
        scale={scale}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
          onPointerOver?.();
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
          onPointerOut?.();
        }}
      >
        <Suspense fallback={null}>
          <GlbCreatureModel id={id} motion={motion} variant={variant} sad={sad} requests={requests} onClip={onClip} />
        </Suspense>
        {selected && (
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.6, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
        )}
        {/* the same shadow blob the primitive creature carries */}
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.32, 20]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.16} />
        </mesh>
      </group>
    </CreatureBoundary>
  );
}
