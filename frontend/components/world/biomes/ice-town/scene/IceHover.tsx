"use client";

import { useEffect, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  ICE_TOWN_PALETTE as P,
  districtCentre,
  districtField,
  shapePolygon,
  type BiomeLayout,
  type DistrictDef,
} from "../layout/biome-layout";
import { sampleTerrain } from "../layout/terrain";
import { conceptsForIceDistrict } from "@/lib/world/ice-district-concepts";
import { galaxyHrefForConcept } from "@/lib/world/earth-nav";
import { useRouter } from "next/navigation";

function HoverCard({ name, concepts }: { name: string; concepts: readonly string[] }) {
  const router = useRouter();
  return (
    <Html position={[0, 0, 0]} center style={{ pointerEvents: "auto" }} zIndexRange={[40, 20]}>
      <div
        className="world-marker ice-hover-tab"
        data-concepts={concepts.join("|")}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="card">
          <strong>{name}</strong>
          {concepts.length > 0 ? (
            <details className="place-concepts">
              <summary>Concepts</summary>
              <ul>
                {concepts.map((concept) => (
                  <li key={concept}>
                    <button type="button" onClick={() => router.push(galaxyHrefForConcept(concept))}>
                      {concept}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
        <span className="stem" />
        <span className="dot" />
      </div>
    </Html>
  );
}

const PICK_PAD = 14;

function districtAt(layout: BiomeLayout, x: number, z: number): string | null {
  let best: { id: string; field: number } | null = null;
  for (const district of layout.districts) {
    const field = districtField(district, x, z);
    if (field < -PICK_PAD) continue;
    if (!best || field > best.field) best = { id: district.id, field };
  }
  return best?.id ?? null;
}

function DistrictMark({
  layout,
  district,
  hovered,
  selected,
}: {
  layout: BiomeLayout;
  district: DistrictDef;
  hovered: boolean;
  selected: boolean;
}) {
  const [cx, cz] = districtCentre(district);
  const poly = shapePolygon(district.shape);
  const y = Math.max(layout.seaLevel + 0.12, sampleTerrain(layout, cx, cz).height + 0.14);
  const lit = hovered || selected;
  const outline = useMemo(() => {
    const points = poly.map(([x, z]) => new THREE.Vector3(x - cx, 0.1, z - cz));
    if (points[0]) points.push(points[0].clone());
    return new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]));
  }, [cx, cz, poly]);
  const shape = useMemo(() => {
    const next = new THREE.Shape();
    poly.forEach(([x, z], index) => {
      const px = x - cx;
      const pz = z - cz;
      if (index === 0) next.moveTo(px, -pz);
      else next.lineTo(px, -pz);
    });
    next.closePath();
    return next;
  }, [cx, cz, poly]);

  return (
    <group position={[cx, y, cz]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => undefined}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial
          color={selected ? P.light : district.accent}
          transparent
          opacity={selected ? 0.3 : hovered ? 0.22 : 0}
          depthWrite={false}
        />
      </mesh>
      {lit ? (
        <line>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[outline, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={selected ? P.light : P.ink} />
        </line>
      ) : null}
      {lit ? (
        <group position={[0, selected ? 14 : 11, 0]}>
          <HoverCard name={district.name} concepts={conceptsForIceDistrict(district.id)} />
        </group>
      ) : null}
    </group>
  );
}

function IcePointer({
  layout,
  onHover,
  onPick,
}: {
  layout: BiomeLayout;
  onHover: (id: string | null) => void;
  onPick: (id: string) => void;
}) {
  const gl = useThree((three) => three.gl);
  const camera = useThree((three) => three.camera);
  const down = useRef<{ x: number; y: number; id: string | null } | null>(null);

  useEffect(() => {
    const element = (gl.domElement.closest(".biome-land-stage") ??
      gl.domElement.parentElement ??
      gl.domElement) as HTMLElement;
    const ndc = new THREE.Vector2();
    const ray = new THREE.Raycaster();
    const hit = new THREE.Vector3();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.6);

    const atPointer = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(ground, hit)) {
        element.dataset.iceHit = "miss";
        return null;
      }
      const id = districtAt(layout, hit.x, hit.z);
      element.dataset.iceHit = `${hit.x.toFixed(1)},${hit.z.toFixed(1)}`;
      element.dataset.iceHover = id ?? "";
      return id;
    };

    const move = (event: PointerEvent) => {
      const id = atPointer(event);
      onHover(id);
      element.style.cursor = id ? "pointer" : "";
    };
    const start = (event: PointerEvent) => {
      if (event.button !== 0) return;
      down.current = { x: event.clientX, y: event.clientY, id: atPointer(event) };
    };
    const end = (event: PointerEvent) => {
      const startAt = down.current;
      down.current = null;
      if (!startAt?.id) return;
      if (Math.hypot(event.clientX - startAt.x, event.clientY - startAt.y) > 18) return;
      onPick(startAt.id);
    };
    const leave = () => {
      onHover(null);
      element.style.cursor = "";
    };

    element.addEventListener("pointermove", move);
    element.addEventListener("pointerdown", start);
    element.addEventListener("pointerup", end);
    element.addEventListener("pointerleave", leave);
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerdown", start);
      element.removeEventListener("pointerup", end);
      element.removeEventListener("pointerleave", leave);
      element.style.cursor = "";
    };
  }, [camera, gl.domElement, layout, onHover, onPick]);

  return null;
}

export function IceHover({
  layout,
  hoveredId,
  selectedId,
  onHover,
  onPick,
}: {
  layout: BiomeLayout;
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onPick: (id: string) => void;
}) {
  return (
    <group name="ice-district-hits">
      <IcePointer layout={layout} onHover={onHover} onPick={onPick} />
      {layout.districts.map((district) => (
        <DistrictMark
          key={district.id}
          layout={layout}
          district={district}
          hovered={hoveredId === district.id}
          selected={selectedId === district.id}
        />
      ))}
    </group>
  );
}
