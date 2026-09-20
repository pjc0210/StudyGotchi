"use client";

import { useMemo } from "react";
import { JUNGLE_LAYOUT as L } from "./layout/jungle-layout";
import { STATIONS, defaultOverride } from "./camera/stations";
import { JungleScene } from "./scene/JungleScene";
import type { JungleState } from "./jungle-state";
import { useLandArrival } from "../useLandArrival";

export function JungleMount({ progress }: { progress: number }) {
  const fraction = Math.min(1, Math.max(0, progress));
  const { diving, onDiveEnd, station } = useLandArrival();
  const state = useMemo<JungleState>(
    () => ({
      progress: Object.fromEntries(L.districts.map((district) => [district.id, fraction])),
      residents: 10,
      seed: 7,
      night: false,
      mist: true,
      birds: true,
      waterEvent: true,
      pixel: true,
      station,
      focusDistrict: null,
      camera: defaultOverride(STATIONS[station]),
      catastrophe: { districtId: null, phase: "calm", startedAt: 0 },
      diving,
      comparison: false,
    }),
    [diving, fraction, station],
  );
  return <JungleScene state={state} onDiveEnd={onDiveEnd} />;
}
