import { useEffect, useState } from "react";
import * as THREE from "three";
import {
  PIXEL_ATLAS_SIZE,
  WATER_FRAME_COUNT,
  WATER_PATTERN_SIZE,
  pixelGrassTone,
  sampleTerrain,
} from "./globe-spec";
import type { CourseGlobeCourse, GlobeBiome, UnitDirection } from "./globe-types";

export const GLOBE_RADIUS = 4.55;
export const WATER_RADIUS = GLOBE_RADIUS + 0.17;
export const GLOBE_WIDTH_SEGMENTS = 224;
export const GLOBE_HEIGHT_SEGMENTS = 160;

const OCEAN_FLOOR = new THREE.Color("#d9f5ed");
const WARM_SHORE = new THREE.Color("#f3e7bd");
const CONTINENT_GRASS = new THREE.Color("#78ad67");
const CONTINENT_HIGHLAND = new THREE.Color("#5f8c5e");
const PIXEL_GRASS_TONES: Partial<Record<-2 | -1 | 0 | 1 | 2, THREE.Color>> = {
  [-2]: new THREE.Color("#57894b"),
  [-1]: new THREE.Color("#679d58"),
  1: new THREE.Color("#87bb73"),
  2: new THREE.Color("#98cd80"),
};

const BIOME_PALETTES: Record<GlobeBiome, { ground: THREE.Color; accent: THREE.Color }> = {
  ice: { ground: new THREE.Color("#d8edf2"), accent: new THREE.Color("#8fc9d8") },
  city: { ground: new THREE.Color("#a99aba"), accent: new THREE.Color("#f0cf79") },
  meadow: { ground: new THREE.Color("#8dbf73"), accent: new THREE.Color("#e6d66f") },
  forest: { ground: new THREE.Color("#4f8062"), accent: new THREE.Color("#80ae72") },
  volcanic: { ground: new THREE.Color("#655467"), accent: new THREE.Color("#df8065") },
  sand: { ground: new THREE.Color("#d8bb74"), accent: new THREE.Color("#b9c96f") },
  coast: { ground: new THREE.Color("#73b6a3"), accent: new THREE.Color("#e0d58e") },
};

export interface GlobeSurfaceResources {
  terrainAtlas: THREE.DataTexture;
  terrainGeometry: THREE.SphereGeometry;
  waterGeometry: THREE.SphereGeometry;
}

interface SignatureValue<T> {
  signature: string;
  value: T;
}

export function matchingSignatureValue<T>(
  signature: string,
  owned: SignatureValue<T> | null,
): T | null {
  return owned?.signature === signature ? owned.value : null;
}

function directionFromOctahedralUv(u: number, v: number): UnitDirection {
  let x = u * 2 - 1;
  let y = v * 2 - 1;
  let z = 1 - Math.abs(x) - Math.abs(y);

  if (z < 0) {
    const oldX = x;
    x = (1 - Math.abs(y)) * (x < 0 ? -1 : 1);
    y = (1 - Math.abs(oldX)) * (y < 0 ? -1 : 1);
  }

  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

export function terrainLayoutSignature(
  courses: CourseGlobeCourse[],
  directions: Map<string, UnitDirection>,
): string {
  return JSON.stringify({
    courses: [...courses]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((course) => [course.id, course.biome]),
    directions: [...directions]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, direction]) => [id, ...direction]),
  });
}

function terrainColor(
  direction: UnitDirection,
  x: number,
  y: number,
  courses: CourseGlobeCourse[],
  directions: Map<string, UnitDirection>,
  courseById: ReadonlyMap<string, CourseGlobeCourse>,
) {
  const terrain = sampleTerrain(direction, courses, directions);
  if (!terrain.land) return { color: OCEAN_FLOOR.clone(), land: false };
  if (terrain.coast) return { color: WARM_SHORE.clone(), land: true };

  const highland = THREE.MathUtils.smoothstep(terrain.elevation, 0.23, 0.27);
  const color = CONTINENT_GRASS.clone().lerp(CONTINENT_HIGHLAND, highland * 0.2);
  const grassTone = pixelGrassTone(x, y);
  const grassColor = PIXEL_GRASS_TONES[grassTone];
  if (grassColor) {
    color.lerp(
      grassColor,
      (1 - terrain.biomeWeight) * (Math.abs(grassTone) === 2 ? 0.35 : 0.22),
    );
  }

  const course = courseById.get(terrain.ownerId);
  if (course && terrain.biomeWeight > 0) {
    const palette = BIOME_PALETTES[course.biome];
    color.lerp(palette.ground, terrain.biomeWeight * 0.86);
    color.lerp(
      palette.accent,
      THREE.MathUtils.smoothstep(terrain.biomeWeight, 0.72, 1) *
        (course.biome === "ice" ? 0.2 : 0.12),
    );
  }

  return { color, land: true };
}

export function buildTerrainAtlasTexture(
  courses: CourseGlobeCourse[],
  directions: Map<string, UnitDirection>,
): THREE.DataTexture {
  return buildTerrainAtlasTextureFromSnapshot(courses, cloneDirections(directions));
}

function cloneDirections(directions: Map<string, UnitDirection>) {
  return new Map(
    [...directions].map(
      ([id, direction]) => [id, [...direction] as UnitDirection] as const,
    ),
  );
}

function buildTerrainAtlasTextureFromSnapshot(
  courses: CourseGlobeCourse[],
  directions: Map<string, UnitDirection>,
): THREE.DataTexture {
  const data = new Uint8Array(PIXEL_ATLAS_SIZE * PIXEL_ATLAS_SIZE * 4);
  const courseById = new Map(courses.map((course) => [course.id, course]));

  for (let y = 0; y < PIXEL_ATLAS_SIZE; y++) {
    for (let x = 0; x < PIXEL_ATLAS_SIZE; x++) {
      const direction = directionFromOctahedralUv(
        (x + 0.5) / PIXEL_ATLAS_SIZE,
        (y + 0.5) / PIXEL_ATLAS_SIZE,
      );
      const { color, land } = terrainColor(
        direction,
        x,
        y,
        courses,
        directions,
        courseById,
      );
      color.convertLinearToSRGB();
      const offset = (y * PIXEL_ATLAS_SIZE + x) * 4;
      data[offset] = Math.round(color.r * 255);
      data[offset + 1] = Math.round(color.g * 255);
      data[offset + 2] = Math.round(color.b * 255);
      data[offset + 3] = land ? 255 : 0;
    }
  }

  const texture = new THREE.DataTexture(
    data,
    PIXEL_ATLAS_SIZE,
    PIXEL_ATLAS_SIZE,
    THREE.RGBAFormat,
  );
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function buildTerrainGeometry(
  courses: CourseGlobeCourse[],
  directions: Map<string, UnitDirection>,
) {
  const geometry = new THREE.SphereGeometry(
    GLOBE_RADIUS,
    GLOBE_WIDTH_SEGMENTS,
    GLOBE_HEIGHT_SEGMENTS,
  );
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;

  for (let index = 0; index < positions.count; index++) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const inverseLength = 1 / (Math.hypot(x, y, z) || 1);
    const direction: UnitDirection = [
      x * inverseLength,
      y * inverseLength,
      z * inverseLength,
    ];
    const terrain = sampleTerrain(direction, courses, directions);
    const radius = GLOBE_RADIUS + terrain.elevation;
    positions.setXYZ(
      index,
      direction[0] * radius,
      direction[1] * radius,
      direction[2] * radius,
    );
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

interface WaterWavelet {
  x: number;
  y: number;
  length: number;
  phase: number;
  speedX: -1 | 1;
  speedY: -1 | 0 | 1;
  bend: -1 | 1;
  value: 150 | 255;
}

function waterWavelets(): WaterWavelet[] {
  return Array.from({ length: 15 }, (_, index) => {
    const random = (salt: number) => {
      const value = Math.sin((index + 1) * (12.9898 + salt * 17.17)) * 43758.5453;
      return value - Math.floor(value);
    };
    return {
      x: Math.floor(random(1) * WATER_PATTERN_SIZE),
      y: Math.floor(random(2) * WATER_PATTERN_SIZE),
      length: 3 + Math.floor(random(3) * 7),
      phase: Math.floor(random(4) * WATER_FRAME_COUNT),
      speedX: random(5) > 0.5 ? 1 : -1,
      speedY: random(6) > 0.68 ? (random(7) > 0.5 ? 1 : -1) : 0,
      bend: random(8) > 0.5 ? 1 : -1,
      value: random(9) > 0.7 ? 255 : 150,
    };
  });
}

function renderWaterPatternFrame(frame: number, wavelets: WaterWavelet[]) {
  const data = new Uint8Array(WATER_PATTERN_SIZE * WATER_PATTERN_SIZE);
  const wrappedFrame =
    ((Math.floor(frame) % WATER_FRAME_COUNT) + WATER_FRAME_COUNT) % WATER_FRAME_COUNT;
  for (const wavelet of wavelets) {
    const localFrame = (wrappedFrame + wavelet.phase) % WATER_FRAME_COUNT;
    const originX =
      (wavelet.x + wavelet.speedX * localFrame + WATER_PATTERN_SIZE * 2) %
      WATER_PATTERN_SIZE;
    const originY =
      (wavelet.y + wavelet.speedY * localFrame + WATER_PATTERN_SIZE * 2) %
      WATER_PATTERN_SIZE;

    for (let step = 0; step < wavelet.length; step++) {
      if ((step + wavelet.phase) % 5 === 4) continue;
      const x = (originX + step) % WATER_PATTERN_SIZE;
      const curve = Math.round(
        Math.sin((step / Math.max(1, wavelet.length - 1)) * Math.PI),
      );
      const y = (originY + curve * wavelet.bend + WATER_PATTERN_SIZE) % WATER_PATTERN_SIZE;
      const offset = y * WATER_PATTERN_SIZE + x;
      data[offset] = Math.max(data[offset], wavelet.value);
    }
  }
  return data;
}

export function buildWaterPatternFrame(frame: number): Uint8Array {
  return renderWaterPatternFrame(frame, waterWavelets());
}

export function buildWaterFrameData(): Uint8Array[] {
  const wavelets = waterWavelets();
  return Array.from({ length: WATER_FRAME_COUNT }, (_, frame) =>
    renderWaterPatternFrame(frame, wavelets),
  );
}

export function buildWaterFrameTextures(): THREE.DataTexture[] {
  return buildWaterFrameData().map((data) => {
    const texture = new THREE.DataTexture(
      data,
      WATER_PATTERN_SIZE,
      WATER_PATTERN_SIZE,
      THREE.RedFormat,
    );
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  });
}

function buildSurfaceResources(
  courses: CourseGlobeCourse[],
  directions: Map<string, UnitDirection>,
): GlobeSurfaceResources {
  const directionSnapshot = cloneDirections(directions);
  return {
    terrainAtlas: buildTerrainAtlasTextureFromSnapshot(courses, directionSnapshot),
    terrainGeometry: buildTerrainGeometry(courses, directionSnapshot),
    waterGeometry: new THREE.SphereGeometry(
      WATER_RADIUS,
      GLOBE_WIDTH_SEGMENTS,
      GLOBE_HEIGHT_SEGMENTS,
    ),
  };
}

export function useGlobeSurfaceResources(
  courses: CourseGlobeCourse[],
  directions: Map<string, UnitDirection>,
): GlobeSurfaceResources | null {
  const signature = terrainLayoutSignature(courses, directions);
  const [owned, setOwned] = useState<SignatureValue<GlobeSurfaceResources> | null>(null);

  useEffect(
    () => {
      const entry = {
        signature,
        value: buildSurfaceResources(courses, directions),
      };
      setOwned(entry);

      return () => {
        setOwned((current) => (current === entry ? null : current));
        // Cleanup runs after the mismatch render has detached consumers. Deferring
        // one microtask also lets child passive cleanups release their materials first.
        queueMicrotask(() => {
          entry.value.terrainAtlas.dispose();
          entry.value.terrainGeometry.dispose();
          entry.value.waterGeometry.dispose();
        });
      };
    },
    // The signature contains every course/direction value that affects generated resources.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature],
  );

  return matchingSignatureValue(signature, owned);
}
