"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { toonMaterial } from "@/lib/toon";

export interface BlobMotion {
  moving: boolean;
  t: number;
}

interface BlobProps {
  color: string;
  accent: string;
  variant: number;
  motion: React.RefObject<BlobMotion>;
  onClick?: () => void;
  selected?: boolean;
  scale?: number;
}

/**
 * Procedural creature from primitives: hop, squash, blink, one accessory.
 * Local +Z is the face. Feet at y = 0.
 */
export function Blob({
  color,
  accent,
  variant,
  motion,
  onClick,
  selected,
  scale = 1,
}: BlobProps) {
  const body = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const pop = useRef(0);

  const bodyMat = useMemo(() => toonMaterial(color), [color]);
  const accentMat = useMemo(() => toonMaterial(accent), [accent]);
  const white = useMemo(() => toonMaterial("#ffffff"), []);
  const dark = useMemo(() => toonMaterial("#2b2b33"), []);
  const blush = useMemo(() => toonMaterial("#f6a3a3"), []);

  useFrame((_, dt) => {
    const m = motion.current;
    if (!body.current || !m) return;
    pop.current = Math.min(1, pop.current + dt * 2.5);
    const k = pop.current;
    const popScale = k < 1 ? 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2) : 1;

    const t = m.t;
    if (m.moving) {
      const hop = Math.abs(Math.sin(t * 9));
      body.current.position.y = hop * 0.22;
      const squash = 1 + (0.5 - hop) * 0.18;
      body.current.scale.set(popScale / Math.sqrt(squash), popScale * squash, popScale / Math.sqrt(squash));
      body.current.rotation.z = Math.sin(t * 9) * 0.08;
    } else {
      const breathe = 1 + Math.sin(t * 2.2) * 0.03;
      body.current.position.y = 0;
      body.current.scale.set(popScale / Math.sqrt(breathe), popScale * breathe, popScale / Math.sqrt(breathe));
      body.current.rotation.z = Math.sin(t * 0.7) * 0.03;
    }
    if (eyes.current) {
      const blink = (t + variant) % 3.1 < 0.12 ? 0.08 : 1;
      eyes.current.scale.y = blink;
    }
  });

  const r = 0.36;
  return (
    <group
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <group ref={body}>
        <mesh position={[0, r, 0]} material={bodyMat}>
          <sphereGeometry args={[r, 18, 14]} />
        </mesh>
        <mesh position={[0, r * 0.7, 0]} material={white} scale={[0.75, 0.55, 0.75]}>
          <sphereGeometry args={[r, 14, 10]} />
        </mesh>
        <group ref={eyes} position={[0, r * 1.15, r * 0.78]}>
          <mesh position={[-0.11, 0, 0]} material={dark}>
            <sphereGeometry args={[0.055, 8, 6]} />
          </mesh>
          <mesh position={[0.11, 0, 0]} material={dark}>
            <sphereGeometry args={[0.055, 8, 6]} />
          </mesh>
        </group>
        <mesh position={[-0.2, r * 0.95, r * 0.72]} material={blush} scale={[1, 0.6, 0.4]}>
          <sphereGeometry args={[0.05, 8, 6]} />
        </mesh>
        <mesh position={[0.2, r * 0.95, r * 0.72]} material={blush} scale={[1, 0.6, 0.4]}>
          <sphereGeometry args={[0.05, 8, 6]} />
        </mesh>
        <mesh position={[-0.14, 0.04, 0.08]} material={accentMat} scale={[1, 0.5, 1.3]}>
          <sphereGeometry args={[0.09, 8, 6]} />
        </mesh>
        <mesh position={[0.14, 0.04, 0.08]} material={accentMat} scale={[1, 0.5, 1.3]}>
          <sphereGeometry args={[0.09, 8, 6]} />
        </mesh>
        {variant % 4 === 0 && (
          <mesh position={[0, r * 2.05, 0]} material={accentMat}>
            <coneGeometry args={[0.16, 0.3, 8]} />
          </mesh>
        )}
        {variant % 4 === 1 && (
          <mesh position={[0, r * 2.0, 0]} rotation={[Math.PI / 2, 0, 0]} material={accentMat}>
            <torusGeometry args={[0.13, 0.05, 8, 16]} />
          </mesh>
        )}
        {variant % 4 === 2 && (
          <>
            <mesh position={[-0.22, r * 1.9, 0]} rotation={[0, 0, 0.5]} material={bodyMat} scale={[0.6, 1, 0.5]}>
              <sphereGeometry args={[0.16, 8, 6]} />
            </mesh>
            <mesh position={[0.22, r * 1.9, 0]} rotation={[0, 0, -0.5]} material={bodyMat} scale={[0.6, 1, 0.5]}>
              <sphereGeometry args={[0.16, 8, 6]} />
            </mesh>
          </>
        )}
        {variant % 4 === 3 && (
          <mesh position={[0, r * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} material={accentMat}>
            <torusGeometry args={[r * 0.95, 0.05, 8, 20]} />
          </mesh>
        )}
      </group>
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.6, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      )}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.32, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.16} />
      </mesh>
    </group>
  );
}
