"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CameraControls, ContactShadows, Html } from "@react-three/drei";
import * as THREE from "three";
import { toonGradient, toonMaterial } from "@/lib/toon";
import { hashString, makeRng } from "@/lib/seed";
import {
  BIOMES,
  ISLAND_RADIUS,
  landmarkHeight,
  placeCenter,
  spotOffset,
  worldPosition,
  type Vec2,
} from "@/lib/world/layout";
import type { PlaceOut, SpotOut, WorldCanvasProps } from "@/lib/world/types";
import { Character } from "./Character";

const CLIFF = 3;

function usePlaceLayout(places: PlaceOut[]) {
  return useMemo(() => {
    const centers = new Map<string, Vec2>();
    const list = places.map((place, index) => {
      const center = placeCenter(place, index, places.length);
      centers.set(place.id, center);
      return { place, center };
    });
    return { list, centers };
  }, [places]);
}

function IslandTerrain({
  seed,
  places,
  spots,
  centers,
}: {
  seed: string;
  places: PlaceOut[];
  spots: SpotOut[];
  centers: Map<string, Vec2>;
}) {
  const geometry = useMemo(() => {
    const rings = 64;
    const cliffRings = 10;
    const segs = 140;
    const totalRings = rings + cliffRings;
    const rng = makeRng(hashString(seed + ":coast"));
    const coast = Array.from({ length: 8 }, () => rng() * 0.5);
    const edgeAt = (ang: number) => {
      let wobble = 0;
      for (let k = 0; k < coast.length; k++) wobble += Math.sin(ang * (k + 2) + coast[k] * 7) * coast[k] * 0.12;
      return ISLAND_RADIUS * (1 + wobble);
    };

    const placeList = places.map((place, index) => ({
      id: place.id,
      center: centers.get(place.id) ?? placeCenter(place, index, places.length),
      biome: BIOMES[place.biome],
    }));

    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const col = new THREE.Color();
    const rock = new THREE.Color("#8d6e57");
    const deepRock = new THREE.Color("#5e4636");

    for (let i = 0; i <= totalRings; i++) {
      for (let j = 0; j <= segs; j++) {
        const ang = (j / segs) * Math.PI * 2;
        const edge = edgeAt(ang);
        let r: number;
        let y: number;
        if (i <= rings) {
          r = (i / rings) * edge;
          const nx = (Math.cos(ang) * r) / ISLAND_RADIUS;
          const nz = (Math.sin(ang) * r) / ISLAND_RADIUS;
          y = landmarkHeight(spots, nx, nz, centers);
          let nearest = placeList[0];
          let best = Infinity;
          for (const p of placeList) {
            const d = (nx - p.center.x) ** 2 + (nz - p.center.z) ** 2;
            if (d < best) {
              best = d;
              nearest = p;
            }
          }
          col.set(nearest?.biome.ground ?? "#8fc48a");
          col.lerp(rock, THREE.MathUtils.clamp(y / 1.6 - 0.45, 0, 0.55) * 2);
        } else {
          const t = (i - rings) / cliffRings;
          r = edge + t * 0.9 + Math.sin(ang * 9 + t * 4) * 0.15 * t;
          y = -CLIFF * Math.pow(t, 0.55) - t * t * 4;
          col.copy(rock).lerp(deepRock, t);
        }
        positions.push(Math.cos(ang) * r, y, Math.sin(ang) * r);
        colors.push(col.r, col.g, col.b);
      }
    }

    const row = segs + 1;
    for (let i = 0; i < totalRings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = i * row + j;
        const b = a + 1;
        const c = a + row;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [seed, places, spots, centers]);

  const material = useMemo(
    () => new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient(), side: THREE.DoubleSide }),
    [],
  );

  return <mesh geometry={geometry} material={material} />;
}

function SpotMarker({
  spot,
  center,
  selected,
  onSelect,
  heightAt,
}: {
  spot: SpotOut;
  center: Vec2;
  selected: boolean;
  onSelect: (id: string | null) => void;
  heightAt: (x: number, z: number) => number;
}) {
  const pos = worldPosition(center, spotOffset(spot.concept_id));
  const y = heightAt(pos.x, pos.z);
  const biomeGround = "#4f8a4a";
  const cracked = spot.cracked;

  if (spot.state === 0) return null;

  return (
    <group
      position={[pos.x, y, pos.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(spot.concept_id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {spot.state === 1 ? (
        <mesh position={[0, 0.18, 0]} material={toonMaterial(cracked ? "#c47a4a" : "#6f9d4f")}>
          <coneGeometry args={[0.12, 0.36, 6]} />
        </mesh>
      ) : (
        <mesh position={[0, 0.28, 0]} material={toonMaterial(cracked ? "#8a4a3f" : biomeGround)}>
          <cylinderGeometry args={[0.22, 0.28, 0.5, 8]} />
        </mesh>
      )}
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.42, 24]} />
          <meshBasicMaterial color="#fffaf3" transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}

function PlaceSign({ place, center, heightAt }: { place: PlaceOut; center: Vec2; heightAt: (x: number, z: number) => number }) {
  const x = center.x * ISLAND_RADIUS;
  const z = center.z * ISLAND_RADIUS;
  const y = heightAt(x, z);
  const biome = BIOMES[place.biome];
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.16, 0]} material={toonMaterial(biome.accent)}>
        <cylinderGeometry args={[0.42, 0.5, 0.28, 16]} />
      </mesh>
      <Html position={[0, 0.85, 0]} center distanceFactor={18} style={{ pointerEvents: "none" }}>
        <span className="rounded-full bg-[#fffaf3]/90 px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-[#3a2f45] shadow-[0_3px_0_#3a2f45] whitespace-nowrap">
          {place.label}
        </span>
      </Html>
    </group>
  );
}

export function Island({ world, selectedId, onSelect }: WorldCanvasProps) {
  const { list, centers } = usePlaceLayout(world.places);
  const controls = useRef<CameraControls>(null);
  const heightAt = useMemo(() => {
    return (x: number, z: number) => landmarkHeight(world.spots, x / ISLAND_RADIUS, z / ISLAND_RADIUS, centers);
  }, [world.spots, centers]);

  useEffect(() => {
    controls.current?.setLookAt(0, 19, 27, 0, -0.5, 0, false);
  }, []);

  useFrame(() => {
    if (typeof document !== "undefined" && document.hidden) return;
  });

  return (
    <>
      <color attach="background" args={["#f3e4ee"]} />
      <fog attach="fog" args={["#f3e4ee", 28, 52]} />
      <hemisphereLight args={["#fff4e6", "#b9a7c9", 0.9]} />
      <directionalLight position={[10, 14, 8]} intensity={1.6} color="#fff1dc" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -CLIFF - 0.2, 0]} material={toonMaterial("#9fd3e0")}>
        <circleGeometry args={[48, 48]} />
      </mesh>
      <group onPointerMissed={() => onSelect(null)}>
        <IslandTerrain seed={world.seed} places={world.places} spots={world.spots} centers={centers} />
        {list.map(({ place, center }) => (
          <PlaceSign key={place.id} place={place} center={center} heightAt={heightAt} />
        ))}
        {world.spots.map((spot) => {
          const center = centers.get(spot.place_id);
          if (!center) return null;
          return (
            <SpotMarker
              key={spot.concept_id}
              spot={spot}
              center={center}
              selected={selectedId === spot.concept_id}
              onSelect={onSelect}
              heightAt={heightAt}
            />
          );
        })}
        {world.characters.map((character) => {
          const entry = list.find((item) => item.place.id === character.place_id);
          if (!entry) return null;
          return (
            <Character
              key={character.id}
              character={character}
              place={entry.place}
              center={entry.center}
              heightAt={heightAt}
              selected={character.concept_ids.includes(selectedId ?? "")}
              onSelect={onSelect}
            />
          );
        })}
      </group>
      <ContactShadows position={[0, -CLIFF - 0.5, 0]} opacity={0.35} scale={40} blur={2.5} far={12} frames={1} color="#5a3f6b" />
      <CameraControls ref={controls} minPolarAngle={0.35} maxPolarAngle={1.25} minDistance={6} maxDistance={34} makeDefault />
    </>
  );
}
