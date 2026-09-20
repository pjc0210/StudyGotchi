"use client";

import { useCallback, useMemo, useState } from "react";
import { MEADOW_KINGDOM, generateKingdom } from "./layout/biome-layout";
import { STATIONS, defaultOverride } from "./camera/stations";
import { BiomeScene } from "./scene/BiomeScene";
import type { LabState } from "./state";
import { useLandArrival } from "../useLandArrival";

export function MeadowMount({ progress }: { progress: number }) {
  const fraction = Math.min(1, Math.max(0, progress));
  const { diving, onDiveEnd, station } = useLandArrival();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusDistrict, setFocusDistrict] = useState<string | null>(null);
  const layout = useMemo(() => generateKingdom(7), []);
  const state = useMemo<LabState>(
    () => ({
      progress: Object.fromEntries(MEADOW_KINGDOM.districts.map((district) => [district.id, fraction])),
      residents: 8,
      seed: 7,
      night: false,
      clouds: true,
      snowfall: false,
      whale: true,
      pixel: true,
      showReferences: false,
      station,
      focusDistrict,
      camera: defaultOverride(STATIONS[station]),
      catastrophe: { districtId: null, phase: "calm", startedAt: 0 },
      diving,
    }),
    [diving, focusDistrict, fraction, station],
  );
  const onPickDistrict = useCallback((id: string) => {
    setFocusDistrict((current) => (current === id ? null : id));
  }, []);
  return (
    <BiomeScene
      layout={layout}
      state={state}
      onDiveEnd={onDiveEnd}
      onPickDistrict={onPickDistrict}
      hoveredId={hoveredId}
      onHover={setHoveredId}
    />
  );
}
