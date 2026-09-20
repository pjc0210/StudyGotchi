"use client";

import { GeneratedPixelSpiral } from "./GeneratedPixelSpiral";

/**
 * Tiny sky slot for the original generated spiral.
 * Sits behind constellation edges; ice land hides the whole layer.
 */
export function SkySpiral() {
  return (
    <div className="sg-sky-spiral" aria-hidden>
      <GeneratedPixelSpiral size={64} opacity={0.26} spin={180_000} />
    </div>
  );
}
