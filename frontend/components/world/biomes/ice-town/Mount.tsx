"use client";

import { useCallback, useMemo, useState } from "react";
import { ICE_TOWN_LAYOUT as layout } from "./layout/biome-layout";
import { STATIONS, defaultOverride } from "./camera/stations";
import { BiomeScene } from "./scene/BiomeScene";
import type { LabState } from "./state";
import type { IceDemoState } from "@/lib/world/demo-theater";

export function IceTownMount({
  progress,
  focusDistrict = null,
  iceDemo,
  onFocusDistrict,
}: {
  progress: number;
  focusDistrict?: string | null;
  iceDemo?: IceDemoState;
  onFocusDistrict?: (id: string | null) => void;
}) {
  const fraction = Math.min(1, Math.max(0, progress));
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [localFocus, setLocalFocus] = useState<string | null>(null);
  const focus = onFocusDistrict ? focusDistrict : (focusDistrict ?? localFocus);
  const state = useMemo<LabState>(
    () => ({
      progress: Object.fromEntries(layout.districts.map((district) => [district.id, fraction])),
      residents: 0,
      seed: 7,
      night: iceDemo?.event === "fail",
      clouds: iceDemo?.event === "fail",
      snowfall: iceDemo?.event === "fail",
      whale: false,
      pixel: false,
      station: focus ? "district" : "overview",
      focusDistrict: focus,
      camera: defaultOverride(STATIONS.overview),
      catastrophe:
        iceDemo?.event === "fail"
          ? { districtId: "*", phase: "ruin", startedAt: 0 }
          : iceDemo?.event === "pass"
            ? { districtId: null, phase: "recovering", startedAt: 0 }
            : { districtId: null, phase: "calm", startedAt: 0 },
      diving: false,
    }),
    [focus, fraction, iceDemo?.event],
  );
  const onPickDistrict = useCallback(
    (id: string) => {
      const next = focus === id ? null : id;
      setLocalFocus(next);
      onFocusDistrict?.(next);
    },
    [focus, onFocusDistrict],
  );
  return (
    <BiomeScene
      layout={layout}
      state={state}
      onDiveEnd={() => undefined}
      onPickDistrict={onPickDistrict}
      hoveredId={hoveredId}
      onHover={setHoveredId}
    />
  );
}
