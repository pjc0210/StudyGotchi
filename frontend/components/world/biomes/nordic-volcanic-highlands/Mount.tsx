"use client";

import { useMemo } from "react";
import { NORDIC_LAYOUT } from "./layout/biome-layout";
import { STATIONS, defaultOverride } from "./camera/stations";
import { BiomeScene } from "./scene/BiomeScene";
import type { LabState } from "./state";
import { useLandArrival } from "../useLandArrival";

export function NordicMount({ progress }: { progress: number }) {
  const fraction = Math.min(1, Math.max(0, progress));
  const { diving, onDiveEnd, station } = useLandArrival();
  const state = useMemo<LabState>(
    () => ({
      progress: Object.fromEntries(NORDIC_LAYOUT.districts.map((district) => [district.id, fraction])),
      residents: 10,
      seed: 7,
      night: false,
      aurora: true,
      mist: true,
      ambient: true,
      pixel: true,
      station,
      focusDistrict: null,
      camera: defaultOverride(STATIONS[station]),
      catastrophe: { districtId: null, phase: "calm", startedAt: 0 },
      diving,
    }),
    [diving, fraction, station],
  );
  return (
    <BiomeScene
      layout={NORDIC_LAYOUT}
      state={state}
      onDiveEnd={onDiveEnd}
      onPickDistrict={() => undefined}
    />
  );
}
