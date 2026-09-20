"use client";

import { useEffect, useState } from "react";
import type { SpaceTheme } from "@/components/world/globe/globe-types";

function read(): SpaceTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.spaceTheme === "dark" ? "dark" : "light";
}

/**
 * The resolved space theme as the document carries it. `useSpaceTheme` owns the
 * preference and writes `data-space-theme`; anything that only needs to repaint
 * when the sky changes watches the attribute, so every instance agrees.
 */
export function useSpaceAttribute(): SpaceTheme {
  const [theme, setTheme] = useState<SpaceTheme>("light");

  useEffect(() => {
    setTheme(read());
    const observer = new MutationObserver(() => setTheme(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-space-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/** Resolve a CSS custom property that holds a colour to something a canvas can use. */
export function resolveCssColor(el: HTMLElement, variable: string, fallback: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${variable})`;
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  el.appendChild(probe);
  const value = getComputedStyle(probe).color;
  el.removeChild(probe);
  return value && value !== "rgba(0, 0, 0, 0)" ? value : fallback;
}
