"use client";

import { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { markerIdForCourse } from "@/lib/world/globe-courses";
import { BouquetBase } from "./bouquet/BouquetBase";
import { Creature } from "./bouquet/Creature";
import { WorldProps } from "./bouquet/WorldProps";
import { MARKERS } from "./bouquet/markers";
import { propCountFromProgress } from "./bouquet/bouquet-state";
import { courseMarkerState, sampleTerrain } from "./globe-spec";
import { GLOBE_RADIUS } from "./globe-materials";
import { LANDMARK_REF_FIT, LANDMARK_REF_SCALE, PLANET_SEAT } from "./globe-seat";
import type {
  CourseGlobeCourse,
  ScreenPoint,
  UnitDirection,
} from "./globe-types";

const UP = new THREE.Vector3(0, 1, 0);
export const GLOBE_BOUQUET_SCALE =
  LANDMARK_REF_SCALE * (LANDMARK_REF_FIT / PLANET_SEAT.radiusFit);
const ACTIVE_POP = 1.48;
const ACTIVE_LIFT = 2.8;

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
    event.stopPropagation();
    raiseFlag();
  };

  return (
    <group
      ref={group}
      position={position}
      quaternion={quaternion}
      scale={active ? scale * ACTIVE_POP : scale}
      userData={{ courseLandmark: course.id }}
      onClick={(event) => {
        event.stopPropagation();
        openTown(event);
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onPointerOver={(event) => {
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
        {markerState.pawnCount > 1 ? <Creature /> : null}
        {active ? (
          <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[16.4, 19.8, 28]} />
            <meshBasicMaterial color="#fff0ae" toneMapped={false} />
          </mesh>
        ) : null}
        <mesh position={[0, 36, 0]} userData={{ courseLandmark: course.id }}>
          <sphereGeometry args={[88, 14, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {active ? (
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
