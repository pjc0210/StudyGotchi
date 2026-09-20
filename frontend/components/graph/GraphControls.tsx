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
  return (
    <div className="sg-seg" role="group" aria-label="Camera">
      <button type="button" onClick={onZoomOut} aria-label="Zoom out" className="sg-seg-item" style={{ padding: "0 10px" }}>
        <Minus size={13} aria-hidden />
      </button>
      <button type="button" onClick={onZoomIn} aria-label="Zoom in" className="sg-seg-item" style={{ padding: "0 10px" }}>
        <Plus size={13} aria-hidden />
      </button>
      <button type="button" onClick={onFit} aria-label="Fit everything in view" className="sg-seg-item" style={{ padding: "0 10px" }}>
        <Maximize2 size={12} aria-hidden />
      </button>
    </div>
  );
}
