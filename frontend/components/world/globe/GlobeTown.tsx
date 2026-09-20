"use client";

import { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { showGlobeLandmarkNumberPin } from "@/lib/world/earth-nav";
import { isLandmarkVisible } from "@/lib/world/landmark-hit";
import { markerIdForCourse } from "@/lib/world/globe-courses";
import { BouquetBase } from "./bouquet/BouquetBase";
import { WorldProps } from "./bouquet/WorldProps";
import { MARKERS } from "./bouquet/markers";
import { propCountFromProgress } from "./bouquet/bouquet-state";
import { GLOBE_ACTIVE_POP, GLOBE_BOUQUET_SCALE } from "./globe-parade";
import { courseMarkerState, sampleTerrain } from "./globe-spec";
import { GLOBE_RADIUS } from "./globe-materials";
import type {
  CourseGlobeCourse,
  ScreenPoint,
  UnitDirection,
} from "./globe-types";

export { GLOBE_BOUQUET_SCALE };

const UP = new THREE.Vector3(0, 1, 0);
const ACTIVE_LIFT = 2.8;
const LANDMARK_DEAD_LAYER = 31;

export interface GlobeTownOpenEvent {
  courseId: string;
  anchor: ScreenPoint;
}

interface GlobeTownProps {
  course: CourseGlobeCourse;
  direction: UnitDirection;
  courses: CourseGlobeCourse[];
  directions: Map<string, UnitDirection>;
  active: boolean;
  night: boolean;
  onActivate(courseId: string): void;
  onOpen(event: GlobeTownOpenEvent): void;
}

export function GlobeTown({
  course,
  direction,
  courses,
  directions,
  active,
  night,
  onActivate,
  onOpen,
}: GlobeTownProps) {
  const group = useRef<THREE.Group>(null);
  const hittable = useRef(true);
  const pinWorld = useRef(new THREE.Vector3());
  const planetCenter = useRef(new THREE.Vector3());
  const { camera, size } = useThree();
  const markerState = courseMarkerState(course.progress);
  const marker =
    MARKERS.find((entry) => entry.id === markerIdForCourse(course)) ?? MARKERS[0];
  const normal = useMemo(() => new THREE.Vector3(...direction).normalize(), [direction]);
  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(UP, normal),
    [normal],
  );
  const terrain = sampleTerrain(direction, courses, directions);
  const position = useMemo(
    () =>
      normal
        .clone()
        .multiplyScalar(GLOBE_RADIUS + Math.max(0, terrain.elevation) + 0.02),
    [normal, terrain.elevation],
  );
  const scale = GLOBE_BOUQUET_SCALE * markerState.footprintScale;

  useFrame(() => {
    const root = group.current;
    if (!root) return;
    root.updateWorldMatrix(true, false);
    root.getWorldPosition(pinWorld.current);
    const center = root.parent
      ? root.parent.getWorldPosition(planetCenter.current)
      : planetCenter.current.set(0, -0.7, 0);
    const next = isLandmarkVisible({
      pin: pinWorld.current,
      camera: camera.position,
      planetCenter: center,
      planetRadius: GLOBE_RADIUS,
    });
    hittable.current = next;
    root.traverse((obj) => {
      obj.layers.set(next ? 0 : LANDMARK_DEAD_LAYER);
    });
  });

  const raiseFlag = () => {
    if (!group.current) return;
    group.current.updateWorldMatrix(true, false);
    const projected = group.current
      .getWorldPosition(new THREE.Vector3())
      .project(camera);
    const anchor = {
      x: size.left + ((projected.x + 1) * size.width) / 2,
      y: size.top + ((1 - projected.y) * size.height) / 2,
    };
    onActivate(course.id);
    onOpen({ courseId: course.id, anchor });
  };

  const openTown = (event: ThreeEvent<MouseEvent>) => {
    if (!hittable.current) return;
    event.stopPropagation();
    raiseFlag();
  };

  return (
    <group
      ref={group}
      position={position}
      quaternion={quaternion}
      scale={active ? scale * GLOBE_ACTIVE_POP : scale}
      userData={{ courseLandmark: course.id }}
      onClick={(event) => {
        if (!hittable.current) return;
        event.stopPropagation();
        openTown(event);
      }}
      onPointerOver={(event) => {
        if (!hittable.current) return;
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <group position={active ? [0, ACTIVE_LIFT, 0] : [0, 0, 0]}>
        <BouquetBase marker={marker} />
        <WorldProps
          marker={marker}
          propCount={propCountFromProgress(course.progress)}
          night={night}
        />
        {active ? (
          <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[16.4, 19.8, 28]} />
            <meshBasicMaterial color="#fff0ae" toneMapped={false} />
          </mesh>
        ) : null}
        {active && showGlobeLandmarkNumberPin() ? (
          <Html
            position={[0, 42, 0]}
            center
            occlude={false}
            zIndexRange={[30, 0]}
            style={{ pointerEvents: "none" }}
          >
            <span className="landmark-pin" aria-hidden>
              <span className="landmark-pin-mast" />
              <span className="landmark-pin-flag">{course.code ?? "Pin"}</span>
            </span>
          </Html>
        ) : null}
      </group>
    </group>
  );
}

interface GlobeTownsProps {
  courses: CourseGlobeCourse[];
  directions: Map<string, UnitDirection>;
  activeCourseId: string | null;
  night?: boolean;
  onActiveCourseChange(courseId: string): void;
  onCourseTownOpen(event: GlobeTownOpenEvent): void;
}

export function GlobeTowns({
  courses,
  directions,
  activeCourseId,
  night = false,
  onActiveCourseChange,
  onCourseTownOpen,
}: GlobeTownsProps) {
  return (
    <group>
      {courses.map((course) => {
        const direction = directions.get(course.id);
        return direction ? (
          <GlobeTown
            key={course.id}
            course={course}
            direction={direction}
            courses={courses}
            directions={directions}
            active={course.id === activeCourseId}
            night={night}
            onActivate={onActiveCourseChange}
            onOpen={onCourseTownOpen}
          />
        ) : null;
      })}
    </group>
  );
}
