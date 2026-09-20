export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Facing floor: N · normalize(camera − planetCenter) must exceed this.
 * 0.08 ≈ cos(85.4°). For a seated camera, the visual limb sits at N·V ≈ R/D
 * (typically 0.2–0.5), so grazing towns stay hittable. Pins that have slipped
 * around the limb into sliver / back-side territory fall below the floor.
 */
export const LANDMARK_FACING_EPSILON = 0.08;

/** Sphere hit must be this much closer than the pin before we call it occluded. */
export const LANDMARK_OCCLUSION_EPSILON = 1e-4;

/** World-unit distance from the pointer ray to a pin that still counts as a hit. */
export const LANDMARK_PICK_RADIUS = 1.55;

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function length(a: Vec3): number {
  return Math.hypot(a.x, a.y, a.z);
}

function normalize(a: Vec3): Vec3 {
  const hyp = length(a);
  if (hyp === 0) return { x: 0, y: 0, z: 0 };
  return { x: a.x / hyp, y: a.y / hyp, z: a.z / hyp };
}

export function landmarkFacingDot(pin: Vec3, camera: Vec3, planetCenter: Vec3): number {
  const normal = normalize(sub(pin, planetCenter));
  const viewDir = normalize(sub(camera, planetCenter));
  return dot(normal, viewDir);
}

export function isLandmarkFacing(
  pin: Vec3,
  camera: Vec3,
  planetCenter: Vec3,
  threshold = LANDMARK_FACING_EPSILON,
): boolean {
  return landmarkFacingDot(pin, camera, planetCenter) > threshold;
}

function nearestSphereHit(
  origin: Vec3,
  direction: Vec3,
  center: Vec3,
  radius: number,
): number | null {
  const oc = sub(origin, center);
  const a = dot(direction, direction);
  if (a === 0) return null;
  const b = 2 * dot(oc, direction);
  const c = dot(oc, oc) - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  const t0 = (-b - root) / (2 * a);
  const t1 = (-b + root) / (2 * a);
  if (t0 >= 0) return t0;
  if (t1 >= 0) return t1;
  return null;
}

export function isLandmarkOccludedByGlobe(
  pin: Vec3,
  camera: Vec3,
  planetCenter: Vec3,
  planetRadius: number,
  epsilon = LANDMARK_OCCLUSION_EPSILON,
): boolean {
  const toPin = sub(pin, camera);
  const distance = length(toPin);
  if (distance === 0) return false;
  const direction = normalize(toPin);
  const hit = nearestSphereHit(camera, direction, planetCenter, planetRadius);
  if (hit === null) return false;
  return hit + epsilon < distance;
}

export function isLandmarkOnScreen(ndc: Vec3): boolean {
  return ndc.x >= -1 && ndc.x <= 1 && ndc.y >= -1 && ndc.y <= 1 && ndc.z >= -1 && ndc.z <= 1;
}

export function isLandmarkVisible(args: {
  pin: Vec3;
  camera: Vec3;
  planetCenter: Vec3;
  planetRadius: number;
  ndc?: Vec3;
  facingThreshold?: number;
}): boolean {
  if (args.ndc && !isLandmarkOnScreen(args.ndc)) return false;
  if (!isLandmarkFacing(args.pin, args.camera, args.planetCenter, args.facingThreshold)) {
    return false;
  }
  return !isLandmarkOccludedByGlobe(
    args.pin,
    args.camera,
    args.planetCenter,
    args.planetRadius,
  );
}

function distanceToRay(pin: Vec3, origin: Vec3, direction: Vec3): number {
  const offset = sub(pin, origin);
  const along = dot(offset, direction);
  if (along <= 0) return Number.POSITIVE_INFINITY;
  const closest = {
    x: origin.x + direction.x * along,
    y: origin.y + direction.y * along,
    z: origin.z + direction.z * along,
  };
  return length(sub(pin, closest));
}

export function pickNearestVisibleLandmark(args: {
  rayOrigin: Vec3;
  rayDirection: Vec3;
  landmarks: readonly { id: string; pin: Vec3; ndc?: Vec3 }[];
  camera: Vec3;
  planetCenter: Vec3;
  planetRadius: number;
  pickRadius?: number;
}): string | null {
  const direction = normalize(args.rayDirection);
  const radius = args.pickRadius ?? LANDMARK_PICK_RADIUS;
  let bestId: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const landmark of args.landmarks) {
    if (
      !isLandmarkVisible({
        pin: landmark.pin,
        camera: args.camera,
        planetCenter: args.planetCenter,
        planetRadius: args.planetRadius,
        ndc: landmark.ndc,
      })
    ) {
      continue;
    }
    if (distanceToRay(landmark.pin, args.rayOrigin, direction) > radius) continue;
    const distance = length(sub(landmark.pin, args.camera));
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = landmark.id;
    }
  }

  return bestId;
}
