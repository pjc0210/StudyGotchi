"use client";

import { useMemo, useState } from "react";
import { FRONTIER_LAYOUT as L } from "./layout/biome-layout";
import { defaultOverride } from "./camera/stations";
import { FrontierScene } from "./scene/FrontierScene";
import type { LabState } from "./state";
import { useLandArrival } from "../useLandArrival";

export function FrontierMount({ progress }: { progress: number }) {
  const fraction = Math.min(1, Math.max(0, progress));
  const { diving, onDiveEnd, station } = useLandArrival();
  const [focus, setFocus] = useState<string | null>(null);
  const state = useMemo<LabState>(
    () => ({
      progress: Object.fromEntries(L.districts.map((district) => [district.id, fraction])),
      residents: Math.max(8, 10),
      seed: 7,
      night: false,
      dust: true,
      train: true,
      wildlife: true,
      pixel: true,
      station,
      focusDistrict: focus,
      camera: defaultOverride(station),
      catastrophe: { districtId: null, phase: "calm" },
    }),
    [focus, fraction, station],
  );
  return (
    <FrontierScene
      state={state}
      onPickDistrict={(id) => {
        setFocus(id);
        onDiveEnd();
      }}
    />
  );
}
