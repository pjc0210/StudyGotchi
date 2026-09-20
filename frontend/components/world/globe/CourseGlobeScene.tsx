"use client";

import {
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { GlobeCreatures } from "./GlobeCreatures";
import { GlobeOcean } from "./GlobeOcean";
import { GlobeRoutes } from "./GlobeRoutes";
import { GlobeShips } from "./GlobeShips";
import { GlobeTerrain } from "./GlobeTerrain";
import {
  GlobeTowns,
  type GlobeTownOpenEvent,
} from "./GlobeTown";
import {
  GLOBE_RADIUS,
  useGlobeSurfaceResources,
} from "./globe-materials";
import {
  PRODUCTION_PIXEL_GRAIN,
  seededCourseDirections,
} from "./globe-spec";
import type {
  CourseGlobeCourse,
  SpaceTheme,
  UnitDirection,
} from "./globe-types";
import { PixelComposer } from "./PixelComposer";

const LAYOUT_SEED = "studygotchi:production-course-globe";
const FOCUS_DIRECTION = new THREE.Vector3(0, 0.08, 1).normalize();
const SNAP_DAMPING = 7.5;

interface R3FPointerCaptureTarget extends EventTarget {
  hasPointerCapture(pointerId: number): boolean;
  setPointerCapture(pointerId: number): void;
  releasePointerCapture(pointerId: number): void;
}

function pointerCaptureTarget(event: ThreeEvent<PointerEvent>) {
  return event.target as R3FPointerCaptureTarget | null;
}

export type { GlobeTownOpenEvent } from "./GlobeTown";

export interface GlobeSpinApi {
  spin(horizontal: number, vertical: number): void;
  settle(): void;
}

export interface CourseGlobeSceneProps {
  courses: CourseGlobeCourse[];
  activeCourseId: string | null;
  theme: SpaceTheme;
  reducedMotion: boolean;
  onActiveCourseChange(courseId: string): void;
  onCourseTownOpen(event: GlobeTownOpenEvent): void;
  onPointerInteractionChange(interacting: boolean): void;
  spinApi: RefObject<GlobeSpinApi | null>;
}

export function shortestFocusQuaternion(
  current: THREE.Quaternion,
  courseDirection: THREE.Vector3,
  focusDirection: THREE.Vector3 = FOCUS_DIRECTION,
): THREE.Quaternion {
  const facing = courseDirection.clone().normalize().applyQuaternion(current);
  const correction = new THREE.Quaternion().setFromUnitVectors(
    facing,
    focusDirection.clone().normalize(),
  );
  return correction.multiply(current.clone()).normalize();
}

export function nearestFacingCourseId(
  current: THREE.Quaternion,
  courseIds: string[],
  directions: ReadonlyMap<string, UnitDirection>,
  focusDirection: THREE.Vector3 = FOCUS_DIRECTION,
): string | null {
  const focus = focusDirection.clone().normalize();
  let nearestId: string | null = null;
  let nearestDot = -Infinity;

  for (const courseId of courseIds) {
    const direction = directions.get(courseId);
    if (!direction) continue;
    const dot = new THREE.Vector3(...direction)
      .applyQuaternion(current)
      .dot(focus);
    if (dot > nearestDot) {
      nearestDot = dot;
      nearestId = courseId;
    }
  }

  return nearestId;
}

function SceneTheme({ theme }: { theme: SpaceTheme }) {
  const background = theme === "light" ? "#f4f0e5" : "#17152c";
  return (
    <>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, 42, 76]} />
    </>
  );
}

function Lights({ theme }: { theme: SpaceTheme }) {
  return (
    <>
      <hemisphereLight
        args={
          theme === "light"
            ? ["#fff8e8", "#8e879d", 1.18]
            : ["#b9c9ef", "#251d35", 0.72]
        }
      />
      <directionalLight
        position={[-7, 10, 9]}
        intensity={theme === "light" ? 2.05 : 2.35}
        color={theme === "light" ? "#fff3d7" : "#fff0d5"}
        castShadow
      />
    </>
  );
}

function AutoFitCamera() {
  const size = useThree((state) => state.size);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const aspect = Math.max(0.35, size.width / Math.max(1, size.height));
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const limitingFov = Math.min(verticalFov, horizontalFov);
  const distance = 5.65 / Math.sin(Math.max(0.12, limitingFov / 2));

  useLayoutEffect(() => {
    camera.position.set(0, distance * 0.07 - 0.7, distance);
    camera.lookAt(0, -0.7, 0);
    camera.near = Math.max(0.1, distance - 8);
    camera.far = distance + 80;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }, [camera, distance]);

  return null;
}

function StarField({ theme }: { theme: SpaceTheme }) {
  const geometries = useMemo(
    () =>
      [0, 1, 2].map((sizeBand) => {
        const points: number[] = [];
        for (let index = sizeBand; index < 57; index += 3) {
          const seed = index + 1;
          const x = Math.sin(seed * 12.9898) * 12.5;
          const y = Math.sin(seed * 5.3983 + 1.7) * 8;
          const z = -8.5 - ((seed * 37) % 10);
          points.push(x, y, z);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(points, 3),
        );
        return geometry;
      }),
    [],
  );

  useEffect(
    () => () => {
      for (const geometry of geometries) geometry.dispose();
    },
    [geometries],
  );

  const colors =
    theme === "light"
      ? ["#11131a", "#191923", "#090b10"]
      : ["#fff2cf", "#b7e7e5", "#d8f4ee"];

  return (
    <group>
      {geometries.map((geometry, index) => (
        <points key={index} geometry={geometry} frustumCulled={false}>
          <pointsMaterial
            color={colors[index]}
            size={0.045 + index * 0.011}
            sizeAttenuation
            fog={false}
          />
        </points>
      ))}
    </group>
  );
}

interface OrbitingGlobeProps {
  courses: CourseGlobeCourse[];
  activeCourseId: string | null;
  directions: Map<string, UnitDirection>;
  theme: SpaceTheme;
  reducedMotion: boolean;
  onActiveCourseChange(courseId: string): void;
  onCourseTownOpen(event: GlobeTownOpenEvent): void;
  onPointerInteractionChange(interacting: boolean): void;
  spinApi: RefObject<GlobeSpinApi | null>;
}

function OrbitingGlobe({
  courses,
  activeCourseId,
  directions,
  theme,
  reducedMotion,
  onActiveCourseChange,
  onCourseTownOpen,
  onPointerInteractionChange,
  spinApi,
}: OrbitingGlobeProps) {
  const group = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Quaternion());
  const interacting = useRef(false);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const camera = useThree((state) => state.camera);
  const cameraRight = useRef(new THREE.Vector3());
  const yawRotation = useRef(new THREE.Quaternion());
  const pitchRotation = useRef(new THREE.Quaternion());
  const resources = useGlobeSurfaceResources(courses, directions);
  const courseIds = useMemo(() => courses.map((course) => course.id), [courses]);

  useEffect(() => {
    if (!activeCourseId) return;
    const direction = directions.get(activeCourseId);
    if (!direction) return;
    target.current.copy(
      shortestFocusQuaternion(
        group.current?.quaternion ?? new THREE.Quaternion(),
        new THREE.Vector3(...direction),
      ),
    );
  }, [activeCourseId, directions]);

  useEffect(
    () => () => {
      dragging.current = false;
      interacting.current = false;
      onPointerInteractionChange(false);
      document.body.style.cursor = "auto";
    },
    [onPointerInteractionChange],
  );

  useFrame((_, delta) => {
    if (!group.current || interacting.current) return;
    if (reducedMotion) {
      group.current.quaternion.copy(target.current);
      return;
    }
    const blend = 1 - Math.exp(-SNAP_DAMPING * delta);
    group.current.quaternion.slerp(target.current, blend);
  });

  const spin = (horizontal: number, vertical: number) => {
    if (!group.current) return;
    interacting.current = true;
    cameraRight.current
      .set(1, 0, 0)
      .applyQuaternion(camera.quaternion)
      .normalize();
    yawRotation.current.setFromAxisAngle(camera.up, horizontal);
    pitchRotation.current.setFromAxisAngle(cameraRight.current, vertical);
    group.current.quaternion
      .premultiply(yawRotation.current)
      .premultiply(pitchRotation.current)
      .normalize();
    target.current.copy(group.current.quaternion);
  };

  const settle = () => {
    if (!group.current) return;
    interacting.current = false;
    const nearestId = nearestFacingCourseId(
      group.current.quaternion,
      courseIds,
      directions,
    );
    if (!nearestId) return;
    const direction = directions.get(nearestId);
    if (!direction) return;
    target.current.copy(
      shortestFocusQuaternion(
        group.current.quaternion,
        new THREE.Vector3(...direction),
      ),
    );
    onActiveCourseChange(nearestId);
  };

  useImperativeHandle(spinApi, () => ({ spin, settle }));

  const pointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onPointerInteractionChange(true);
    dragging.current = true;
    interacting.current = true;
    lastPointer.current = {
      x: event.nativeEvent.clientX,
      y: event.nativeEvent.clientY,
    };
    pointerCaptureTarget(event)?.setPointerCapture(event.pointerId);
    document.body.style.cursor = "grabbing";
  };

  const pointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    event.stopPropagation();
    const x = event.nativeEvent.clientX;
    const y = event.nativeEvent.clientY;
    const dx = x - lastPointer.current.x;
    const dy = y - lastPointer.current.y;
    lastPointer.current = { x, y };
    spin(dx * 0.006, dy * 0.006);
  };

  const finishPointerDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    event.stopPropagation();
    dragging.current = false;
    const captureTarget = pointerCaptureTarget(event);
    if (captureTarget?.hasPointerCapture(event.pointerId)) {
      captureTarget.releasePointerCapture(event.pointerId);
    }
    document.body.style.cursor = "grab";
    settle();
    onPointerInteractionChange(false);
  };

  return (
    <group ref={group} position={[0, -0.7, 0]}>
      {resources ? (
        <>
          <GlobeTerrain
            terrainAtlas={resources.terrainAtlas}
            geometry={resources.terrainGeometry}
          />
          <GlobeOcean
            terrainAtlas={resources.terrainAtlas}
            geometry={resources.waterGeometry}
            reducedMotion={reducedMotion}
          />
        </>
      ) : null}
      <GlobeShips reducedMotion={reducedMotion} />
      <GlobeRoutes
        activeCourseId={activeCourseId}
        courses={courses}
        directions={directions}
        theme={theme}
      />
      <GlobeTowns
        courses={courses}
        directions={directions}
        activeCourseId={activeCourseId}
        onActiveCourseChange={onActiveCourseChange}
        onCourseTownOpen={onCourseTownOpen}
      />
      <GlobeCreatures
        courses={courses}
        directions={directions}
        reducedMotion={reducedMotion}
      />
      <mesh
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={finishPointerDrag}
        onLostPointerCapture={finishPointerDrag}
        onPointerOver={() => {
          if (!dragging.current) document.body.style.cursor = "grab";
        }}
        onPointerOut={() => {
          if (!dragging.current) document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[GLOBE_RADIUS + 0.8, 48, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function CourseGlobeScene({
  courses,
  activeCourseId,
  theme,
  reducedMotion,
  onActiveCourseChange,
  onCourseTownOpen,
  onPointerInteractionChange,
  spinApi,
}: CourseGlobeSceneProps) {
  const layoutKey = courses
    .map((course) => course.id)
    .sort()
    .join("\u0000");
  const directions = useMemo(() => {
    const values = seededCourseDirections(
      courses.map((course) => course.id),
      LAYOUT_SEED,
    );
    return new Map(
      courses.map(
        (course, index) =>
          [course.id, values[index]] as [string, UnitDirection],
      ),
    );
    // The key includes every id that affects the deterministic layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  return (
    <>
      <SceneTheme theme={theme} />
      <Lights theme={theme} />
      <AutoFitCamera />
      <StarField theme={theme} />
      <OrbitingGlobe
        courses={courses}
        activeCourseId={activeCourseId}
        directions={directions}
        theme={theme}
        reducedMotion={reducedMotion}
        onActiveCourseChange={onActiveCourseChange}
        onCourseTownOpen={onCourseTownOpen}
        onPointerInteractionChange={onPointerInteractionChange}
        spinApi={spinApi}
      />
      <PixelComposer pixelSize={PRODUCTION_PIXEL_GRAIN} />
    </>
  );
}
