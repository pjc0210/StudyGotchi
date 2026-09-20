"use client";

import { WorldPage } from "@/components/world/WorldPage";
import { visualForGlobeBiome } from "@/components/world/biomes/types";
import type { GlobeBiome } from "@/components/world/globe/globe-types";
import type { IceDemoState } from "@/lib/world/demo-theater";
import type { WorldResponse } from "@/lib/world/types";

/**
 * A freshly mounted land after the globe unloads. The key on this tree is the
 * course id so each dive gets its own canvas and arrival, instead of morphing
 * the planet in place.
 */
export function BiomeLand({
  courseId,
  biome,
  arriving,
  focusDistrict,
  onFocusDistrict,
  onWorld,
  hoveredId,
  onHover,
  iceDemo,
}: {
  courseId: string;
  biome: GlobeBiome;
  arriving: boolean;
  focusDistrict?: string | null;
  onFocusDistrict?: (id: string | null) => void;
  onWorld?: (world: WorldResponse | null) => void;
  hoveredId?: string | null;
  onHover?: (conceptId: string | null) => void;
  iceDemo?: IceDemoState;
}) {
  return (
    <div
      className="biome-land-stage"
      data-biome={biome}
      data-visual={visualForGlobeBiome(biome)}
      data-arriving={arriving ? "true" : "false"}
    >
      <WorldPage
        courseId={courseId}
        visual={visualForGlobeBiome(biome)}
        onWorld={onWorld}
        hoveredId={hoveredId}
        onHover={onHover}
        iceDemo={iceDemo}
        focusDistrict={focusDistrict}
        onFocusDistrict={onFocusDistrict}
      />
    </div>
  );
}
