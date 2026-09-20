"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { nearestCourseNeighbors } from "./globe-spec";
import type {
  CourseGlobeCourse,
  SpaceTheme,
  UnitDirection,
} from "./globe-types";
import { WATER_RADIUS } from "./globe-materials";

export function buildGreatCirclePoints(
  from: UnitDirection,
  to: UnitDirection,
  radius: number,
  endpointLift: number,
  segments = 32,
): THREE.Vector3[] {
  const start = new THREE.Vector3(...from).normalize();
  const end = new THREE.Vector3(...to).normalize();
  const rotation = new THREE.Quaternion().setFromUnitVectors(start, end);
  const steps = Math.max(1, Math.floor(segments));

  return Array.from({ length: steps + 1 }, (_, index) => {
    const progress = index / steps;
    const sampleRotation = new THREE.Quaternion().slerp(rotation, progress);
    const lift = endpointLift + Math.sin(Math.PI * progress) * 0.11;
    return start
      .clone()
      .applyQuaternion(sampleRotation)
      .normalize()
      .multiplyScalar(radius + lift);
  });
}

interface RouteLineProps {
  from: UnitDirection;
  to: UnitDirection;
  color: string;
  primary: boolean;
}

function RouteLine({ from, to, color, primary }: RouteLineProps) {
  const line = useMemo(() => {
    const samples = buildGreatCirclePoints(from, to, WATER_RADIUS, 0.075, 36);
    const stippled: THREE.Vector3[] = [];
    for (let index = 0; index < samples.length - 1; index++) {
      if (!primary && index % 3 === 1) continue;
      stippled.push(samples[index], samples[index + 1]);
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(stippled);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: primary ? 0.9 : 0.58,
      depthWrite: false,
      toneMapped: false,
    });
    return new THREE.LineSegments(geometry, material);
  }, [color, from, primary, to]);

  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );

  return <primitive object={line} />;
}

interface GlobeRoutesProps {
  activeCourseId: string | null;
  courses: CourseGlobeCourse[];
  directions: Map<string, UnitDirection>;
  theme: SpaceTheme;
}

export function GlobeRoutes({
  activeCourseId,
  courses,
  directions,
  theme,
}: GlobeRoutesProps) {
  if (!activeCourseId) return null;
  const source = directions.get(activeCourseId);
  if (!source) return null;

  const neighbors = nearestCourseNeighbors(
    activeCourseId,
    courses,
    directions,
    3,
  );
  const colors =
    theme === "light"
      ? ["#6b572b", "#476b75", "#715a82"]
      : ["#fff0ae", "#9ed9d0", "#c9c1ef"];

  return (
    <group>
      {neighbors.map((courseId, index) => {
        const destination = directions.get(courseId);
        return destination ? (
          <RouteLine
            key={`${activeCourseId}:${courseId}`}
            from={source}
            to={destination}
            color={colors[index]}
            primary={index === 0}
          />
        ) : null;
      })}
    </group>
  );
}
