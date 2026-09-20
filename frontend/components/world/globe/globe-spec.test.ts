import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  PIXEL_ATLAS_SIZE,
  PRODUCTION_PIXEL_GRAIN,
  WATER_FRAME_COUNT,
  WATER_PATTERN_SIZE,
  continentLobes,
  pixelGrassTone,
  sampleTerrain,
  seededCourseDirections,
  waterFrameState,
} from "./globe-spec";
import {
  buildTerrainAtlasTexture,
  buildWaterFrameData,
  buildWaterPatternFrame,
  matchingSignatureValue,
  terrainLayoutSignature,
} from "./globe-materials";
import type { CourseGlobeCourse, UnitDirection } from "./globe-types";

const IDS = ["6.1210", "18.06", "8.02", "21W.789"];
const COURSES: CourseGlobeCourse[] = IDS.map((id, index) => ({
  id,
  code: id,
  name: `Course ${index + 1}`,
  biome: (["ice", "city", "forest", "volcanic"] as const)[index],
  progress: null,
  stats: null,
}));

function courseDirections() {
  const values = seededCourseDirections(IDS, "student-a");
  return new Map(IDS.map((id, index) => [id, values[index]]));
}

describe("production course globe", () => {
  it("uses the approved finer production fidelity", () => {
    expect(PRODUCTION_PIXEL_GRAIN).toBe(1.5);
    expect(PIXEL_ATLAS_SIZE).toBeGreaterThanOrEqual(320);
    expect(WATER_PATTERN_SIZE).toBeGreaterThanOrEqual(48);
  });

  it("places arbitrary course ids deterministically", () => {
    expect(seededCourseDirections(IDS, "student-a")).toEqual(
      seededCourseDirections(IDS, "student-a"),
    );
    expect(seededCourseDirections(IDS, "student-a")).not.toEqual(
      seededCourseDirections(IDS, "student-b"),
    );
  });

  it("never builds continents from one circular cap", () => {
    const directions = new Map(
      IDS.map((id, index) => [id, seededCourseDirections(IDS, "student-a")[index]]),
    );
    const lobes = continentLobes(directions);
    for (const group of new Set(lobes.map((lobe) => lobe.group))) {
      expect(lobes.filter((lobe) => lobe.group === group).length).toBeGreaterThanOrEqual(4);
    }
  });

  it("reuses continent lobes for repeated terrain samples on the same directions map", () => {
    const directions = new Map(
      IDS.map((id, index) => [id, seededCourseDirections(IDS, "student-a")[index]]),
    );
    const lobesBefore = continentLobes(directions);
    sampleTerrain([0, 0, 1], [], directions);
    sampleTerrain([0, 1, 0], [], directions);
    sampleTerrain([-1, 0, 0], [], directions);
    expect(continentLobes(directions)).toBe(lobesBefore);
  });

  it("creates sparse deterministic grass clusters", () => {
    const tones = Array.from({ length: 256 }, (_, index) =>
      pixelGrassTone(index % 16, Math.floor(index / 16)),
    );
    expect(new Set(tones).size).toBeGreaterThanOrEqual(4);
    expect(tones.filter(Boolean).length).toBeLessThan(72);
  });

  it("interpolates a seamless pixel-water loop", () => {
    expect(WATER_FRAME_COUNT).toBe(48);
    expect(waterFrameState(0)).toEqual({ current: 0, next: 1, mix: 0 });
    expect(waterFrameState(75).mix).toBeCloseTo(0.5);
  });

  it("keys generated surface resources by stable course layout", () => {
    const directions = courseDirections();
    const reversedCourses = [...COURSES].reverse();
    const reversedDirections = new Map([...directions].reverse());
    const movedDirections = new Map(directions);
    movedDirections.set("6.1210", [0, 0, 1] satisfies UnitDirection);
    const extraDirections = new Map(directions);
    extraDirections.set("extra", [1, 0, 0]);

    expect(terrainLayoutSignature(reversedCourses, reversedDirections)).toBe(
      terrainLayoutSignature(COURSES, directions),
    );
    expect(terrainLayoutSignature(COURSES, movedDirections)).not.toBe(
      terrainLayoutSignature(COURSES, directions),
    );
    expect(terrainLayoutSignature(COURSES, extraDirections)).not.toBe(
      terrainLayoutSignature(COURSES, directions),
    );
  });

  it("hides stale resources until the current signature is ready", () => {
    const resources = { marker: "old-layout" };
    const owned = { signature: "layout-a", value: resources };

    expect(matchingSignatureValue("layout-a", owned)).toBe(resources);
    expect(matchingSignatureValue("layout-b", owned)).toBeNull();
    expect(matchingSignatureValue("layout-a", null)).toBeNull();
  });

  it("builds one detailed octahedral atlas with binary land alpha", () => {
    const texture = buildTerrainAtlasTexture(COURSES, courseDirections());
    const data = texture.image.data as Uint8Array;
    const alpha = Array.from({ length: data.length / 4 }, (_, index) => data[index * 4 + 3]);
    const landColors = new Set<string>();

    for (let offset = 0; offset < data.length; offset += 4) {
      if (data[offset + 3] === 255) {
        landColors.add(`${data[offset]}:${data[offset + 1]}:${data[offset + 2]}`);
      }
    }

    expect(texture.image.width).toBe(320);
    expect(texture.image.height).toBe(320);
    expect(new Set(alpha)).toEqual(new Set([0, 255]));
    expect(landColors.size).toBeGreaterThan(12);
    expect(texture.minFilter).toBe(THREE.NearestFilter);
    expect(texture.magFilter).toBe(THREE.NearestFilter);
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    const oceanOffset = alpha.findIndex((value) => value === 0) * 4;
    expect([...data.slice(oceanOffset, oceanOffset + 3)]).toEqual([217, 245, 237]);
    texture.dispose();
  });

  it("regenerates terrain after an in-place direction mutation", () => {
    const directions = courseDirections();
    const before = buildTerrainAtlasTexture(COURSES, directions);
    const beforeData = [...(before.image.data as Uint8Array)];
    directions.set("6.1210", [0, 0, 1]);
    const after = buildTerrainAtlasTexture(COURSES, directions);
    const afterData = [...(after.image.data as Uint8Array)];

    expect(afterData).not.toEqual(beforeData);
    before.dispose();
    after.dispose();
  });

  it("generates a deterministic seamless indexed water cycle", () => {
    const first = buildWaterFrameData();
    const second = buildWaterFrameData();
    const values = new Set(first.flatMap((frame) => [...frame]));

    expect(first).toHaveLength(48);
    expect(first.every((frame) => frame.length === 48 * 48)).toBe(true);
    expect(values).toEqual(new Set([0, 150, 255]));
    expect(first.map((frame) => [...frame])).toEqual(second.map((frame) => [...frame]));
    expect(first[47]).not.toEqual(first[0]);
    expect(buildWaterPatternFrame(48)).toEqual(buildWaterPatternFrame(0));
  });
});
