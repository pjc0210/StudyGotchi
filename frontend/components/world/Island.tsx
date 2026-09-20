"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { CameraControls, ContactShadows, Html } from "@react-three/drei";
import * as THREE from "three";
import { toonGradient, toonMaterial } from "@/lib/toon";
import { hashString, makeRng } from "@/lib/seed";
import {
  BIOMES,
  ISLAND_RADIUS,
  characterOffset,
  landmarkHeight,
  placeCenter,
  spotOffset,
  worldPosition,
  type Vec2,
} from "@/lib/world/layout";
import { RESIDENT_LABEL, STATE_COLOR, STATE_LABEL } from "@/lib/world/adapter";
import type { CanvasPlace, CanvasSpot, HoverInfo, WorldCanvasProps } from "@/lib/world/types";
import { Character } from "./Character";

const CLIFF = 3;
const PAPER = "#f6efe4";
const OCEAN = "#b9d4e8";

function usePlaceLayout(places: CanvasPlace[]) {
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
  places: CanvasPlace[];
  spots: CanvasSpot[];
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
    const rock = new THREE.Color("#a58c74");
    const deepRock = new THREE.Color("#6f5947");

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
          col.set(nearest?.biome.ground ?? "#cfe0bc");
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

/** A short-lived scale pulse for anything that just changed. */
function usePulse(active: boolean) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(0);
  useEffect(() => {
    if (active) t.current = 0;
  }, [active]);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (!active) {
      g.scale.setScalar(1);
      return;
    }
    t.current += dt;
    const s = 1 + Math.max(0, Math.sin(t.current * 5)) * 0.25 * Math.max(0, 1 - t.current / 4);
    g.scale.setScalar(s);
  });
  return ref;
}

function SpotMarker({
  spot,
  center,
  biomeAccent,
  selected,
  hovered,
  changed,
  onSelect,
  onHover,
  heightAt,
}: {
  spot: CanvasSpot;
  center: Vec2;
  biomeAccent: string;
  selected: boolean;
  hovered: boolean;
  changed: boolean;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  heightAt: (x: number, z: number) => number;
}) {
  const pos = worldPosition(center, spotOffset(spot.concept_id));
  const y = heightAt(pos.x, pos.z);
  const pulse = usePulse(changed);

  if (spot.state === 0) return null;

  const stateColor = STATE_COLOR[spot.semantic_state];

  return (
    <group
      ref={pulse}
      position={[pos.x, y, pos.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(spot.concept_id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
        onHover(spot.concept_id);
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
        onHover(null);
      }}
    >
      {spot.state === 1 ? (
        <mesh position={[0, 0.18, 0]} material={toonMaterial(spot.cracked ? "#d98b7e" : "#8fbf6a")}>
          <coneGeometry args={[0.12, 0.36, 6]} />
        </mesh>
      ) : (
        <group>
          <mesh position={[0, 0.28, 0]} material={toonMaterial(spot.cracked ? "#c47a4a" : biomeAccent)}>
            <cylinderGeometry args={[0.22, 0.28, 0.5, 8]} />
          </mesh>
          <mesh position={[0, 0.62, 0]} material={toonMaterial(stateColor)}>
            <coneGeometry args={[0.24, 0.3, 8]} />
          </mesh>
        </group>
      )}
      {(selected || hovered) && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, selected ? 0.44 : 0.4, 24]} />
          <meshBasicMaterial color={selected ? "#3a342e" : "#fbf6ee"} transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}

function PlaceSign({
  place,
  center,
  heightAt,
}: {
  place: CanvasPlace;
  center: Vec2;
  heightAt: (x: number, z: number) => number;
}) {
  const x = center.x * ISLAND_RADIUS;
  const z = center.z * ISLAND_RADIUS;
  const y = heightAt(x, z);
  const biome = BIOMES[place.biome];
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.16, 0]} material={toonMaterial(biome.accent)}>
        <cylinderGeometry args={[0.42, 0.5, 0.28, 16]} />
      </mesh>
      <Html position={[0, 0.9, 0]} center distanceFactor={18} style={{ pointerEvents: "none" }} zIndexRange={[5, 0]}>
        <span
          style={{
            whiteSpace: "nowrap",
            background: "rgba(251, 246, 238, 0.92)",
            border: "1px solid #e4d8c8",
            borderRadius: 999,
            padding: "3px 10px",
            fontSize: 12,
            color: "#3a342e",
            fontFamily: "var(--font-fraunces), Georgia, serif",
          }}
        >
          {place.label}
        </span>
      </Html>
    </group>
  );
}

function HoverMarker({ info, position }: { info: HoverInfo; position: [number, number, number] }) {
  return (
    <Html position={position} center style={{ pointerEvents: "none" }} zIndexRange={[20, 10]}>
      <div className="world-marker">
        <div className="card">
          <strong>{info.name}</strong>
          <div className="meta">
            <span style={{ color: STATE_COLOR[info.semantic_state] }}>{STATE_LABEL[info.semantic_state]}</span>
            <span>{Math.round(info.height * 100)}%</span>
          </div>
          {info.resident ? <div className="meta">{RESIDENT_LABEL[info.resident]}</div> : null}
          {info.cluster ? <div className="meta">{info.cluster}</div> : null}
        </div>
        <span className="stem" />
        <span className="dot" />
      </div>
    </Html>
  );
}

export function Island({ world, selectedId, onSelect, hoveredId, onHover, changedIds }: WorldCanvasProps) {
  const { list, centers } = usePlaceLayout(world.places);
  const controls = useRef<CameraControls>(null);
  const [localHover, setLocalHover] = useState<string | null>(null);
  const hover = hoveredId ?? localHover;
  const setHover = (id: string | null) => {
    setLocalHover(id);
    onHover?.(id);
  };

  const heightAt = useMemo(() => {
    return (x: number, z: number) => landmarkHeight(world.spots, x / ISLAND_RADIUS, z / ISLAND_RADIUS, centers);
  }, [world.spots, centers]);

  const spotById = useMemo(() => new Map(world.spots.map((s) => [s.concept_id, s])), [world.spots]);
  const residentById = useMemo(
    () => new Map(world.characters.map((c) => [c.concept_id, c.creature_state])),
    [world.characters],
  );

  useEffect(() => {
    controls.current?.setLookAt(0, 19, 27, 0, -0.5, 0, false);
  }, []);

  // Selecting a spot eases the camera toward it; deselecting returns to the overview.
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const spot = selectedId ? spotById.get(selectedId) : undefined;
    const center = spot ? centers.get(spot.place_id) : undefined;
    if (spot && center) {
      const pos = worldPosition(center, spotOffset(spot.concept_id));
      const y = heightAt(pos.x, pos.z);
      void c.setLookAt(pos.x + 5, y + 8, pos.z + 12, pos.x, y, pos.z, true);
    } else {
      void c.setLookAt(0, 19, 27, 0, -0.5, 0, true);
    }
  }, [selectedId, spotById, centers, heightAt]);

  const hoverInfo = useMemo<{ info: HoverInfo; position: [number, number, number] } | null>(() => {
    if (!hover) return null;
    const spot = spotById.get(hover);
    const center = spot ? centers.get(spot.place_id) : undefined;
    if (!spot || !center) return null;
    const pos = worldPosition(center, spotOffset(spot.concept_id));
    const y = heightAt(pos.x, pos.z);
    return {
      info: {
        concept_id: spot.concept_id,
        name: spot.name,
        semantic_state: spot.semantic_state,
        height: spot.height,
        cluster: spot.cluster,
        resident: residentById.get(spot.concept_id) ?? null,
      },
      position: [pos.x, y + 0.9, pos.z],
    };
  }, [hover, spotById, centers, heightAt, residentById]);

  return (
    <>
      <color attach="background" args={[PAPER]} />
      <fog attach="fog" args={[PAPER, 30, 56]} />
      <hemisphereLight args={["#fff8ee", "#c9bfae", 0.9]} />
      <directionalLight position={[10, 14, 8]} intensity={1.5} color="#fff3e0" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -CLIFF - 0.2, 0]} material={toonMaterial(OCEAN)}>
        <circleGeometry args={[48, 48]} />
      </mesh>
      <group onPointerMissed={() => onSelect(null)}>
        <IslandTerrain seed={world.seed} places={world.places} spots={world.spots} centers={centers} />
        {list.map(({ place, center }) => (
          <PlaceSign key={place.id} place={place} center={center} heightAt={heightAt} />
        ))}
        {world.spots.map((spot) => {
          const entry = list.find((item) => item.place.id === spot.place_id);
          if (!entry) return null;
          return (
            <SpotMarker
              key={spot.concept_id}
              spot={spot}
              center={entry.center}
              biomeAccent={BIOMES[entry.place.biome].accent}
              selected={selectedId === spot.concept_id}
              hovered={hover === spot.concept_id}
              changed={changedIds?.has(spot.concept_id) ?? false}
              onSelect={onSelect}
              onHover={setHover}
              heightAt={heightAt}
            />
          );
        })}
        {world.characters.map((character) => {
          const entry = list.find((item) => item.place.id === character.place_id);
          if (!entry) return null;
          const home = worldPosition(entry.center, spotOffset(character.concept_id));
          const drift = characterOffset(character.id);
          return (
            <Character
              key={character.id}
              character={character}
              place={entry.place}
              home={{ x: home.x + drift.x * ISLAND_RADIUS * 0.5, z: home.z + drift.z * ISLAND_RADIUS * 0.5 }}
              heightAt={heightAt}
              selected={selectedId === character.concept_id}
              onSelect={onSelect}
              onHover={setHover}
            />
          );
        })}
        {hoverInfo ? <HoverMarker info={hoverInfo.info} position={hoverInfo.position} /> : null}
      </group>
      <ContactShadows position={[0, -CLIFF - 0.5, 0]} opacity={0.3} scale={40} blur={2.5} far={12} frames={1} color="#5a4a3f" />
      <CameraControls ref={controls} minPolarAngle={0.35} maxPolarAngle={1.25} minDistance={6} maxDistance={34} makeDefault />
    </>
  );
}
