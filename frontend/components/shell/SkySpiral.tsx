"use client";

import { SPIRAL_SKY_SIZE_PX, SPIRAL_SPIN_PERIOD_MS } from "@/lib/space-field";
import { GeneratedPixelSpiral } from "./GeneratedPixelSpiral";

/**
 * Sky slot for the original generated spiral, shared by the globe and
 * Information. Sits above the star canvas, below constellation edges and UI;
 * ice land hides the whole layer. Opacity and the light-sky darkening live on
 * `.sg-sky-spiral` in product.css so they can follow `data-space-theme`.
 */
export function SkySpiral() {
  return (
    <div className="sg-sky-spiral" aria-hidden>
      <GeneratedPixelSpiral size={SPIRAL_SKY_SIZE_PX} opacity={1} spin={SPIRAL_SPIN_PERIOD_MS} />
    </div>
  );
}
