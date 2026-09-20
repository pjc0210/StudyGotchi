"use client";

import { useLayoutEffect, useState } from "react";

export interface GlobePin {
  id: string;
  label: string;
  active?: boolean;
}

// Pin anchors as percentages of the globe box, on the visible land masses.
const PIN_SPOTS: [number, number][] = [
  [30, 30],
  [54, 33],
  [40, 56],
  [68, 26],
  [56, 62],
  [78, 48],
];

function sizeFromWindow() {
  return (window.innerWidth * 4) / 7;
}

/** PJ's globe: a square 4/7 of the window width, sitting bottom-right. Pins mark courses. */
export function EarthGlobe({
  pins = [],
  onPin,
  decorative = false,
}: {
  pins?: GlobePin[];
  onPin?: (id: string) => void;
  decorative?: boolean;
}) {
  const [size, setSize] = useState(0);

  useLayoutEffect(() => {
    const apply = () => {
      const next = sizeFromWindow();
      setSize(next);
      document.documentElement.style.setProperty("--globe-size", `${next}px`);
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  const shift = size / 4;

  return (
    <div
      className="earth-globe"
      aria-hidden={decorative || undefined}
      style={size ? { width: size, height: size, right: -shift, bottom: -shift } : undefined}
    >
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" style={{ pointerEvents: "none" }}>
        <circle cx="500" cy="500" r="500" fill="#b9d4e8" />
        <path
          fill="#cfe0bc"
          d="M190 300c48-82 148-108 218-78 46 20 78 58 68 108-12 58-4 96 36 122 26 18 16 52-12 62-52 20-108-12-154-8-56 4-96-40-120-84-20-36-52-76-36-122z"
        />
        <path
          fill="#d8e8c8"
          d="M328 528c30-10 56 16 62 48 8 40 24 76 6 114-14 32-52 50-80 34-32-18-42-62-36-98 6-34 18-72 48-98z"
        />
        <path
          fill="#c9dcb4"
          d="M492 278c40-20 86-6 100 28 12 26-8 52 8 74 20 30 24 68 8 98-18 36-64 54-96 38-38-18-50-66-40-104 8-30 4-66 20-134z"
        />
        <path
          fill="#d6e6c4"
          d="M512 498c34 8 62 42 56 78-6 44-20 88-58 106-30 14-60-8-64-38-6-42 12-88 32-122 10-18 22-28 34-24z"
        />
        <path
          fill="#c4d8b0"
          d="M612 242c76-28 158 4 186 72 20 46 6 94-26 126-28 28-74 20-102-6-42-36-74-28-92-72-16-40 2-94 34-120z"
        />
        <path
          fill="#d2e2ba"
          d="M752 554c30-8 58 14 62 42 4 30-20 52-48 54-30 2-56-24-54-50 2-26 18-40 40-46z"
        />
        <ellipse cx="500" cy="68" rx="216" ry="72" fill="#e9f2f6" />
        <ellipse cx="500" cy="932" rx="186" ry="60" fill="#e9f2f6" />
      </svg>
      {pins.slice(0, PIN_SPOTS.length).map((pin, i) => {
        const [x, y] = PIN_SPOTS[i];
        return (
          <button
            key={pin.id}
            type="button"
            className={`globe-pin${pin.active ? " active" : ""}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            onClick={() => onPin?.(pin.id)}
            aria-label={`Open ${pin.label}`}
          >
            <span className="label">{pin.label}</span>
            <span className="needle" />
            <span className="dot" />
          </button>
        );
      })}
    </div>
  );
}
