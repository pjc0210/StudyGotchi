"use client";

import { useMemo, useRef } from "react";
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
import type {
  CourseGlobeCourse,
  ScreenPoint,
  UnitDirection,
} from "./globe-types";

const UP = new THREE.Vector3(0, 1, 0);
export const GLOBE_BOUQUET_SCALE = 0.026;

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
  onActivate(courseId: string): void;
  onOpen(event: GlobeTownOpenEvent): void;
}

export function GlobeTown({
  course,
  direction,
  courses,
  directions,
  active,
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

  const openTown = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
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

  return (
    <group
      ref={group}
      position={position}
      quaternion={quaternion}
      scale={active ? scale * 1.08 : scale}
      onClick={openTown}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <BouquetBase marker={marker} />
      <WorldProps
        marker={marker}
        propCount={propCountFromProgress(course.progress)}
        night={false}
      />
      {markerState.pawnCount > 1 ? <Creature /> : null}
      {active ? (
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[17.2, 18.6, 24]} />
          <meshBasicMaterial color="#fff0ae" toneMapped={false} />
        </mesh>
      ) : null}
      <mesh position={[0, 16, 0]}>
        <sphereGeometry args={[18, 10, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

interface GlobeTownsProps {
  courses: CourseGlobeCourse[];
  directions: Map<string, UnitDirection>;
  activeCourseId: string | null;
  onActiveCourseChange(courseId: string): void;
  onCourseTownOpen(event: GlobeTownOpenEvent): void;
}

export function GlobeTowns({
  courses,
  directions,
  activeCourseId,
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
            onActivate={onActiveCourseChange}
            onOpen={onCourseTownOpen}
          />
        ) : null;
      })}
    </group>
  );
}
