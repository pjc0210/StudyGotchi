"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { containerShipHull } from "@/lib/world/container-ship";
import { WATER_RADIUS } from "./globe-materials";

const UP = new THREE.Vector3(0, 1, 0);
const SHIP_SCALE = 1.15;
export const SHIP_ROOT_ELEVATION = 0;
export const WAKE_SURFACE_EPSILON = 0.008;

function WedgeHull({
  length,
  width,
  height,
  color,
}: {
  length: number;
  width: number;
  height: number;
  color: string;
}) {
  const geometry = useMemo(() => {
    const halfWidth = width / 2;
    const halfLength = length / 2;
    const positions = new Float32Array([
      0, -height / 2, halfLength,
      -halfWidth, -height / 2, -halfLength,
      halfWidth, -height / 2, -halfLength,
      0, height / 2, halfLength * 0.92,
      -halfWidth * 0.82, height / 2, -halfLength,
      halfWidth * 0.82, height / 2, -halfLength,
    ]);
    const indices = [
      0, 2, 1,
      3, 4, 5,
      0, 3, 5,
      0, 5, 2,
      0, 1, 4,
      0, 4, 3,
      1, 2, 5,
      1, 5, 4,
    ];
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    next.setIndex(indices);
    next.computeVertexNormals();
    return next;
  }, [height, length, width]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
}

/** Box midbody with a single triangular bow toward +z (the MovingShip heading). */
function ContainerHull({
  length,
  width,
  height,
  bowLength,
  color,
}: {
  length: number;
  width: number;
  height: number;
  bowLength: number;
  color: string;
}) {
  const geometry = useMemo(() => {
    const hull = containerShipHull({ length, width, height, bowLength });
    const indexed = new THREE.BufferGeometry();
    indexed.setAttribute("position", new THREE.Float32BufferAttribute(hull.positions, 3));
    indexed.setIndex(hull.indices);
    const next = indexed.toNonIndexed();
    indexed.dispose();
    next.computeVertexNormals();
    return next;
  }, [bowLength, height, length, width]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color={color} flatShading />
    </mesh>
  );
}

function TrianglePlane({
  color,
  width,
  height,
  flip = false,
}: {
  color: string;
  width: number;
  height: number;
  flip?: boolean;
}) {
  const geometry = useMemo(() => {
    const direction = flip ? -1 : 1;
    const points = new Float32Array([
      0, 0, 0,
      width * direction, height * 0.12, 0,
      0, height, 0,
    ]);
    const next = new THREE.BufferGeometry();
    next.setAttribute("position", new THREE.BufferAttribute(points, 3));
    next.setIndex([0, 1, 2]);
    next.computeVertexNormals();
    return next;
  }, [flip, height, width]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color={color} side={THREE.DoubleSide} flatShading />
    </mesh>
  );
}

export function Schooner() {
  return (
    <group>
      <group position={[0, 0.09, 0]}>
        <WedgeHull length={0.68} width={0.28} height={0.17} color="#8a6250" />
      </group>
      <mesh position={[0, 0.0275, -0.015]}>
        <boxGeometry args={[0.285, 0.055, 0.55]} />
        <meshStandardMaterial color="#493b46" flatShading />
      </mesh>
      <mesh position={[0, 0.205, -0.04]}>
        <boxGeometry args={[0.2, 0.06, 0.42]} />
        <meshStandardMaterial color="#d5b77a" flatShading />
      </mesh>
      <mesh position={[0, 0.49, 0.02]}>
        <cylinderGeometry args={[0.022, 0.022, 0.64, 8]} />
        <meshStandardMaterial color="#5f493b" flatShading />
      </mesh>
      <group position={[0.024, 0.29, 0.018]} rotation={[0, Math.PI / 2, 0]}>
        <TrianglePlane color="#fff0cf" width={0.24} height={0.39} />
      </group>
      <group position={[-0.024, 0.32, 0.015]} rotation={[0, -Math.PI / 2, 0]}>
        <TrianglePlane color="#e69a84" width={0.19} height={0.31} />
      </group>
      <mesh position={[0, 0.43, -0.29]}>
        <cylinderGeometry args={[0.018, 0.018, 0.34, 7]} />
        <meshStandardMaterial color="#5f493b" flatShading />
      </mesh>
      <group position={[0.018, 0.56, -0.29]} rotation={[0, Math.PI / 2, 0]}>
        <TrianglePlane color="#f2cf70" width={0.12} height={0.1} />
      </group>
    </group>
  );
}

export function HarborTug() {
  return (
    <group>
      <group position={[0, 0.1, 0]}>
        <WedgeHull length={0.72} width={0.32} height={0.2} color="#c65e53" />
      </group>
      <mesh position={[0, 0.03, -0.015]}>
        <boxGeometry args={[0.325, 0.06, 0.6]} />
        <meshStandardMaterial color="#403e49" flatShading />
      </mesh>
      <mesh position={[0, 0.27, -0.09]} castShadow>
        <boxGeometry args={[0.25, 0.27, 0.3]} />
        <meshStandardMaterial color="#f4e7c5" flatShading />
      </mesh>
      <mesh position={[0, 0.425, -0.09]} castShadow>
        <boxGeometry args={[0.29, 0.055, 0.34]} />
        <meshStandardMaterial color="#527b87" flatShading />
      </mesh>
      <mesh position={[0, 0.51, -0.17]}>
        <cylinderGeometry args={[0.045, 0.055, 0.18, 8]} />
        <meshStandardMaterial color="#493f48" flatShading />
      </mesh>
      {[-0.07, 0.07].map((z) => (
        <mesh
          key={z}
          position={[0.13, 0.3, z - 0.09]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.035, 0.035, 0.018, 10]} />
          <meshBasicMaterial color="#65b5c7" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* Hull 0.9 long: stern at z -0.45, midbody to the bow shoulder at z 0.15, tip at 0.45. */
const FERRY_CONTAINERS: Array<{ pos: [number, number, number]; color: string }> = [
  { pos: [-0.075, 0.255, -0.2], color: "#d17a59" },
  { pos: [0.075, 0.255, -0.2], color: "#5f8f6a" },
  { pos: [-0.075, 0.255, -0.05], color: "#e2b44e" },
  { pos: [0.075, 0.255, -0.05], color: "#c65e53" },
  { pos: [-0.075, 0.255, 0.1], color: "#6d84b4" },
  { pos: [0.075, 0.255, 0.1], color: "#d17a59" },
  { pos: [-0.075, 0.345, -0.2], color: "#e8e0cc" },
  { pos: [0.075, 0.345, -0.05], color: "#e2b44e" },
  { pos: [-0.075, 0.345, -0.05], color: "#c65e53" },
];

export function CargoFerry() {
  return (
    <group>
      <group position={[0, 0.1, 0]}>
        <ContainerHull length={0.9} width={0.34} height={0.2} bowLength={0.3} color="#56788b" />
      </group>
      <group position={[0, 0.03, 0]}>
        <ContainerHull length={0.92} width={0.35} height={0.06} bowLength={0.31} color="#343b49" />
      </group>
      <mesh position={[0, 0.21, -0.15]}>
        <boxGeometry args={[0.3, 0.02, 0.56]} />
        <meshStandardMaterial color="#465a6a" flatShading />
      </mesh>
      {[-0.163, 0.163].map((x) => (
        <mesh key={x} position={[x, 0.215, -0.15]}>
          <boxGeometry args={[0.012, 0.03, 0.58]} />
          <meshStandardMaterial color="#d9d1ba" flatShading />
        </mesh>
      ))}
      {FERRY_CONTAINERS.map((box, index) => (
        <mesh key={index} position={box.pos} castShadow>
          <boxGeometry args={[0.13, 0.09, 0.13]} />
          <meshStandardMaterial color={box.color} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.31, -0.36]} castShadow>
        <boxGeometry args={[0.28, 0.22, 0.14]} />
        <meshStandardMaterial color="#e8e0cc" flatShading />
      </mesh>
      <mesh position={[0, 0.44, -0.36]} castShadow>
        <boxGeometry args={[0.32, 0.04, 0.16]} />
        <meshStandardMaterial color="#65717f" flatShading />
      </mesh>
      <mesh position={[0, 0.39, -0.29]}>
        <boxGeometry args={[0.22, 0.05, 0.01]} />
        <meshBasicMaterial color="#65b5c7" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.51, -0.4]} castShadow>
        <cylinderGeometry args={[0.028, 0.034, 0.1, 8]} />
        <meshStandardMaterial color="#c65e53" flatShading />
      </mesh>
      <mesh position={[0, 0.565, -0.4]}>
        <cylinderGeometry args={[0.03, 0.03, 0.012, 8]} />
        <meshStandardMaterial color="#343b49" flatShading />
      </mesh>
      <mesh position={[0, 0.28, 0.3]}>
        <cylinderGeometry args={[0.007, 0.007, 0.14, 6]} />
        <meshStandardMaterial color="#d9d1ba" flatShading />
      </mesh>
    </group>
  );
}

function WakeStipples() {
  return (
    <group position={[0, WAKE_SURFACE_EPSILON / SHIP_SCALE, -0.28]}>
      {[
        [-0.11, -0.08, 0.1],
        [0.09, -0.13, 0.075],
        [-0.15, -0.22, 0.065],
        [0.14, -0.29, 0.055],
        [-0.08, -0.38, 0.045],
        [0.07, -0.45, 0.04],
      ].map(([x, z, size], index) => (
        <mesh key={index} position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[size * 1.8, size]} />
          <meshBasicMaterial
            color="#d9fbf4"
            transparent
            opacity={0.46 - index * 0.045}
            depthWrite={false}
            toneMapped={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

interface MovingShipProps {
  anchor: THREE.Vector3;
  phase: number;
  reducedMotion: boolean;
  children: ReactNode;
}

function MovingShip({
  anchor,
  phase,
  reducedMotion,
  children,
}: MovingShipProps) {
  const group = useRef<THREE.Group>(null);
  const vessel = useRef<THREE.Group>(null);
  const frame = useMemo(() => {
    const north = UP.clone().addScaledVector(anchor, -UP.dot(anchor));
    if (north.lengthSq() < 1e-5) {
      north.set(0, 0, 1).addScaledVector(anchor, -anchor.z);
    }
    north.normalize();
    const east = new THREE.Vector3().crossVectors(north, anchor).normalize();
    return { north, east };
  }, [anchor]);
  const scratch = useMemo(
    () => ({
      tangent: new THREE.Vector3(),
      direction: new THREE.Vector3(),
      heading: new THREE.Vector3(),
      right: new THREE.Vector3(),
      matrix: new THREE.Matrix4(),
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (!group.current || !vessel.current) return;
    const time = reducedMotion ? 0 : clock.elapsedTime;
    const angle = time * 0.13 + phase;
    const orbitRadius = 0.11;
    scratch.tangent
      .copy(frame.east)
      .multiplyScalar(Math.cos(angle))
      .addScaledVector(frame.north, Math.sin(angle))
      .normalize();
    scratch.direction
      .copy(anchor)
      .multiplyScalar(Math.cos(orbitRadius))
      .addScaledVector(scratch.tangent, Math.sin(orbitRadius))
      .normalize();
    scratch.heading
      .copy(frame.east)
      .multiplyScalar(-Math.sin(angle))
      .addScaledVector(frame.north, Math.cos(angle))
      .normalize();
    scratch.right
      .crossVectors(scratch.direction, scratch.heading)
      .normalize();
    scratch.matrix.makeBasis(
      scratch.right,
      scratch.direction,
      scratch.heading,
    );
    group.current.quaternion.setFromRotationMatrix(scratch.matrix);
    const bob = reducedMotion ? 0 : Math.sin(time * 1.05 + phase) * 0.012;
    vessel.current.position.y = bob / SHIP_SCALE;
    group.current.position
      .copy(scratch.direction)
      .multiplyScalar(WATER_RADIUS + SHIP_ROOT_ELEVATION);
  });

  return (
    <group ref={group} scale={SHIP_SCALE}>
      <WakeStipples />
      <group ref={vessel}>{children}</group>
    </group>
  );
}

export function GlobeShips({ reducedMotion }: { reducedMotion: boolean }) {
  const anchors = useMemo(
    () => [
      new THREE.Vector3(0.62, 0.18, 0.76).normalize(),
      new THREE.Vector3(-0.72, 0.54, 0.43).normalize(),
      new THREE.Vector3(0.28, -0.69, -0.67).normalize(),
    ],
    [],
  );

  return (
    <group>
      <MovingShip anchor={anchors[0]} phase={0.35} reducedMotion={reducedMotion}>
        <Schooner />
      </MovingShip>
      <MovingShip anchor={anchors[1]} phase={2.4} reducedMotion={reducedMotion}>
        <HarborTug />
      </MovingShip>
      <MovingShip anchor={anchors[2]} phase={4.65} reducedMotion={reducedMotion}>
        <CargoFerry />
      </MovingShip>
    </group>
  );
}
