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
  ScreenPoint,
  SpaceTheme,
  UnitDirection,
} from "./globe-types";
import { PixelComposer } from "./PixelComposer";
import { DIVE_MS, diveCameraPosition, easeInOutCubic } from "./globe-dive";
import { seatedCameraPosition } from "./globe-seat";
import { screenPointFromNdc } from "@/lib/world/earth-nav";

const LAYOUT_SEED = "studygotchi:production-course-globe";
const FOCUS_DIRECTION = new THREE.Vector3(-0.55, 0.48, 1).normalize();
const SNAP_DAMPING = 7.5;
const DRAG_THRESHOLD_PX = 8;

interface R3FPointerCaptureTarget extends EventTarget {
  hasPointerCapture(pointerId: number): boolean;
  setPointerCapture(pointerId: number): void;
  releasePointerCapture(pointerId: number): void;
}

function pointerCaptureTarget(event: ThreeEvent<PointerEvent>) {
  return event.target as R3FPointerCaptureTarget | null;
}

function nearestLandmarkToPointer(
  camera: THREE.Camera,
  clientX: number,
  clientY: number,
  size: { left: number; top: number; width: number; height: number },
  directions: ReadonlyMap<string, UnitDirection>,
  globe: THREE.Object3D,
): string | null {
  const ndc = new THREE.Vector2(
    ((clientX - size.left) / Math.max(1, size.width)) * 2 - 1,
    -((clientY - size.top) / Math.max(1, size.height)) * 2 + 1,
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, camera);
  globe.updateWorldMatrix(true, false);
  let best: string | null = null;
  let bestDist = 4.6;
  for (const [courseId, direction] of directions) {
    const world = new THREE.Vector3(...direction)
      .normalize()
      .multiplyScalar(GLOBE_RADIUS + 0.45)
      .applyMatrix4(globe.matrixWorld);
    const dist = raycaster.ray.distanceToPoint(world);
    if (dist < bestDist) {
      bestDist = dist;
      best = courseId;
    }
  }
  return best;
}

function landmarkFromIntersections(
  intersections: readonly { object: THREE.Object3D }[],
): string | null {
  for (const hit of intersections) {
    let current: THREE.Object3D | null = hit.object;
    while (current) {
      const courseId = current.userData.courseLandmark;
      if (typeof courseId === "string" && courseId) return courseId;
      current = current.parent;
    }
  }
  return null;
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
  diving: boolean;
  reducedMotion: boolean;
  onActiveCourseChange(courseId: string): void;
  onCourseTownOpen(event: GlobeTownOpenEvent): void;
  onLandmarkAnchor?(anchor: ScreenPoint | null): void;
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
  const gl = useThree((state) => state.gl);
  const fog = theme === "light" ? "#cfd6e4" : "#080716";
  useLayoutEffect(() => {
    gl.setClearColor(0x000000, 0);
  }, [gl, theme]);
  return <fog attach="fog" args={[fog, 36, 72]} />;
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

function AutoFitCamera({ locked }: { locked: boolean }) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;

  useLayoutEffect(() => {
    if (locked) return;
    const seat = seatedCameraPosition(
      { width, height },
      camera.fov,
      GLOBE_RADIUS,
    );
    camera.position.set(...seat.position);
    camera.lookAt(...seat.lookAt);
    camera.near = 0.1;
    camera.far = Math.max(80, seat.position[2] + 80);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }, [camera, height, locked, width]);

  return null;
}

function DiveCamera({
  diving,
  reducedMotion,
}: {
  diving: boolean;
  reducedMotion: boolean;
}) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const start = useRef(new THREE.Vector3());
  const dest = useRef(new THREE.Vector3());
  const progress = useRef(0);
  const active = useRef(false);

  useLayoutEffect(() => {
    if (!diving) {
      active.current = false;
      progress.current = 0;
      return;
    }
    start.current.copy(camera.position);
    dest.current.set(
      ...diveCameraPosition([
        camera.position.x,
        camera.position.y,
        camera.position.z,
      ]),
    );
    progress.current = 0;
    active.current = true;
  }, [camera, diving]);

  useFrame((_, delta) => {
    if (!active.current || reducedMotion) return;
    progress.current = Math.min(1, progress.current + delta / (DIVE_MS / 1000));
    const t = easeInOutCubic(progress.current);
    camera.position.lerpVectors(start.current, dest.current, t);
    camera.lookAt(0, -0.7, 0);
    camera.updateMatrixWorld();
  });

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
  onLandmarkAnchor?(anchor: ScreenPoint | null): void;
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
  onLandmarkAnchor,
  onPointerInteractionChange,
  spinApi,
}: OrbitingGlobeProps) {
  const group = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Quaternion());
  const interacting = useRef(false);
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const dragOrigin = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
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
    if (group.current && !interacting.current) {
      if (reducedMotion) {
        group.current.quaternion.copy(target.current);
      } else {
        const blend = 1 - Math.exp(-SNAP_DAMPING * delta);
        group.current.quaternion.slerp(target.current, blend);
      }
    }
    if (!onLandmarkAnchor || !group.current || !activeCourseId) {
      onLandmarkAnchor?.(null);
      return;
    }
    const direction = directions.get(activeCourseId);
    if (!direction) {
      onLandmarkAnchor(null);
      return;
    }
    group.current.updateWorldMatrix(true, false);
    const world = new THREE.Vector3(...direction)
      .normalize()
      .multiplyScalar(GLOBE_RADIUS + 0.85)
      .applyMatrix4(group.current.matrixWorld);
    const facing = new THREE.Vector3(...direction).applyQuaternion(group.current.quaternion);
    const toCamera = camera.position
      .clone()
      .sub(group.current.getWorldPosition(new THREE.Vector3()))
      .normalize();
    if (facing.dot(toCamera) < 0.08) {
      onLandmarkAnchor(null);
      return;
    }
    onLandmarkAnchor(screenPointFromNdc(world.project(camera), size));
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
    dragging.current = true;
    dragMoved.current = false;
    lastPointer.current = {
      x: event.nativeEvent.clientX,
      y: event.nativeEvent.clientY,
    };
    dragOrigin.current = lastPointer.current;
    pointerCaptureTarget(event)?.setPointerCapture(event.pointerId);
  };

  const pointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    event.stopPropagation();
    const x = event.nativeEvent.clientX;
    const y = event.nativeEvent.clientY;
    if (!dragMoved.current) {
      const travel = Math.hypot(x - dragOrigin.current.x, y - dragOrigin.current.y);
      if (travel < DRAG_THRESHOLD_PX) return;
      dragMoved.current = true;
      interacting.current = true;
      onPointerInteractionChange(true);
      document.body.style.cursor = "grabbing";
    }
    const dx = x - lastPointer.current.x;
    const dy = y - lastPointer.current.y;
    lastPointer.current = { x, y };
    spin(dx * 0.006, dy * 0.006);
  };

  const finishPointerDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    event.stopPropagation();
    const moved = dragMoved.current;
    dragging.current = false;
    dragMoved.current = false;
    const captureTarget = pointerCaptureTarget(event);
    if (captureTarget?.hasPointerCapture(event.pointerId)) {
      captureTarget.releasePointerCapture(event.pointerId);
    }
    document.body.style.cursor = "grab";
    if (!moved) {
      const courseId =
        landmarkFromIntersections(event.intersections) ??
        (group.current
          ? nearestLandmarkToPointer(
              camera,
              event.nativeEvent.clientX,
              event.nativeEvent.clientY,
              size,
              directions,
              group.current,
            )
          : null);
      if (courseId && group.current) {
        group.current.updateWorldMatrix(true, false);
        const direction = directions.get(courseId);
        const projected = (
          direction
            ? new THREE.Vector3(...direction)
                .normalize()
                .multiplyScalar(GLOBE_RADIUS)
                .applyMatrix4(group.current.matrixWorld)
            : group.current.getWorldPosition(new THREE.Vector3())
        ).project(camera);
        onActiveCourseChange(courseId);
        onCourseTownOpen({
          courseId,
          anchor: {
            x: size.left + ((projected.x + 1) * size.width) / 2,
            y: size.top + ((1 - projected.y) * size.height) / 2,
          },
        });
      }
    } else {
      settle();
    }
    interacting.current = false;
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
        night={theme === "dark"}
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
        <sphereGeometry args={[GLOBE_RADIUS + 0.08, 48, 32]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function CourseGlobeScene({
  courses,
  activeCourseId,
  theme,
  diving,
  reducedMotion,
  onActiveCourseChange,
  onCourseTownOpen,
  onLandmarkAnchor,
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
      <AutoFitCamera locked={diving} />
      <DiveCamera diving={diving} reducedMotion={reducedMotion} />
      <StarField theme={theme} />
      <OrbitingGlobe
        courses={courses}
        activeCourseId={activeCourseId}
        directions={directions}
        theme={theme}
        reducedMotion={reducedMotion}
        onActiveCourseChange={onActiveCourseChange}
        onCourseTownOpen={onCourseTownOpen}
        onLandmarkAnchor={onLandmarkAnchor}
        onPointerInteractionChange={onPointerInteractionChange}
        spinApi={spinApi}
      />
      <PixelComposer pixelSize={PRODUCTION_PIXEL_GRAIN} />
    </>
  );
}
