"use client";

import { useEffect, useRef } from "react";
import { resolveCssColor, useSpaceAttribute } from "./useSpaceAttribute";

/** World pixel: stars sit on this grid so they read as the same grain as the planet. */
const GRID = 2;
const SEED = 0x5747;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The sky both product pages share. Deterministic nebula dust plus pixel stars
 * on the space colour, redrawn when size or theme changes.
 */
export function SpaceField() {
  const ref = useRef<HTMLCanvasElement>(null);
  const theme = useSpaceAttribute();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement ?? canvas;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = parent.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const star = resolveCssColor(parent, "--space-star", theme === "dark" ? "#fff6df" : "#17151d");
      const soft = resolveCssColor(
        parent,
        "--space-star-soft",
        theme === "dark" ? "rgba(185,216,234,0.68)" : "rgba(23,21,29,0.42)",
      );
      const nebula = resolveCssColor(
        parent,
        "--space-nebula",
        theme === "dark" ? "rgba(88,64,140,0.38)" : "rgba(168,142,196,0.22)",
      );

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;

      const rng = mulberry32(SEED);
      for (let i = 0; i < 7; i++) {
        const x = rng() * w;
        const y = rng() * h;
        const radius = 80 + rng() * 220;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, nebula);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }

      const count = Math.round((w * h) / 5200);
      for (let i = 0; i < count; i++) {
        const x = Math.floor((rng() * w) / GRID) * GRID;
        const y = Math.floor((rng() * h) / GRID) * GRID;
        const band = rng();
        if (band < 0.58) {
          ctx.fillStyle = soft;
          ctx.fillRect(x, y, GRID, GRID);
        } else if (band < 0.9) {
          ctx.fillStyle = star;
          ctx.fillRect(x, y, GRID, GRID);
        } else {
          ctx.fillStyle = star;
          ctx.fillRect(x, y, GRID, GRID);
          ctx.fillStyle = soft;
          ctx.fillRect(x - GRID, y, GRID, GRID);
          ctx.fillRect(x + GRID, y, GRID, GRID);
          ctx.fillRect(x, y - GRID, GRID, GRID);
          ctx.fillRect(x, y + GRID, GRID, GRID);
        }
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [theme]);

  return <canvas ref={ref} className="sg-field" aria-hidden />;
}
