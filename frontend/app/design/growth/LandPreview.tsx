"use client";

import dynamic from "next/dynamic";
import type { LocalBiomeId } from "@/components/world/biomes/types";

const DevelopedBiomeCanvas = dynamic(
  () => import("@/components/world/biomes/DevelopedBiomeCanvas").then((mod) => mod.DevelopedBiomeCanvas),
  { ssr: false },
);

const IceCanvas = dynamic(() => import("@/components/world/golden/WorldCanvas"), { ssr: false });

const DEVELOPED = new Set<LocalBiomeId>([
  "frontier-town",
  "coastal-ruins",
  "jungle-forest-village",
  "medieval-meadow-kingdom",
  "nordic-volcanic-highlands",
]);

export function LandPreview({
  visual,
  progress,
}: {
  visual: LocalBiomeId;
  progress: number;
}) {
  if (visual === "ice-golden") {
    return (
      <div className="growth-land-frame">
        <IceCanvas progress={progress} view="overview" onResidentFocus={() => undefined} />
      </div>
    );
  }

  if (DEVELOPED.has(visual)) {
    return (
      <div className="growth-land-frame">
        <DevelopedBiomeCanvas
          visual={visual as Exclude<LocalBiomeId, "ice-golden" | "island">}
          progress={progress}
        />
      </div>
    );
  }

  return (
    <div className="growth-land-frame growth-land-mock" data-progress={progress.toFixed(2)}>
      <p>Generic island fallback. No developed land is wired for this biome yet.</p>
    </div>
  );
}
