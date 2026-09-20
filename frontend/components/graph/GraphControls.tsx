"use client";

import { Maximize2, Minus, Plus } from "lucide-react";

export function GraphControls({
  onFit,
  onZoomIn,
  onZoomOut,
}: {
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  const cls =
    "grid h-9 w-9 place-items-center text-ink-dim transition-colors hover:bg-white/[0.08] hover:text-white";

  return (
    <div className="flex overflow-hidden rounded-full border border-white/10 bg-[#101722]/90 p-1 shadow-xl shadow-black/30 backdrop-blur-sm">
      <button type="button" onClick={onZoomOut} aria-label="Zoom out" className={cls}>
        <Minus size={13} aria-hidden />
      </button>
      <span className="my-1 w-px bg-white/10" aria-hidden />
      <button type="button" onClick={onZoomIn} aria-label="Zoom in" className={cls}>
        <Plus size={13} aria-hidden />
      </button>
      <span className="my-1 w-px bg-white/10" aria-hidden />
      <button type="button" onClick={onFit} aria-label="Fit graph to view" className={cls}>
        <Maximize2 size={12} aria-hidden />
      </button>
    </div>
  );
}
