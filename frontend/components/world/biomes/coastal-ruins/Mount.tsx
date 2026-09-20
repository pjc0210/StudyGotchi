"use client";

import { useMemo } from "react";
import { COASTAL_RUINS_LAYOUT as layout } from "./layout/biome-layout";
import { STATIONS, defaultOverride } from "./camera/stations";
import { BiomeScene } from "./scene/BiomeScene";
import type { LabState } from "./state";
import { useLandArrival } from "../useLandArrival";

export function CoastalMount({ progress }: { progress: number }) {
  const fraction = Math.min(1, Math.max(0, progress));
  const { diving, onDiveEnd, station } = useLandArrival();
  const state = useMemo<LabState>(
    () => ({
      progress: Object.fromEntries(layout.districts.map((district) => [district.id, fraction])),
      residents: Math.max(8, Math.round(fraction * 18)),
      seed: 7,
      night: false,
      clouds: true,
      boatEvent: true,
      pixel: true,
      markerMode: false,
      station,
      focusDistrict: null,
      camera: defaultOverride(STATIONS[station]),
      catastrophe: { districtId: null, phase: "calm", startedAt: 0 },
      diving,
    }),
    [diving, fraction, station],
  );
  return <BiomeScene layout={layout} state={state} onDiveEnd={onDiveEnd} />;
}
