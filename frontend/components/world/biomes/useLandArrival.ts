"use client";

import { useCallback, useEffect, useState } from "react";

const ARRIVE_MS = 1600;

/**
 * Fresh land mounts start in the dive/arrival beat, then settle to overview
 * so the biome camera animations actually play.
 */
export function useLandArrival() {
  const [diving, setDiving] = useState(true);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setDiving(false), reduced ? 80 : ARRIVE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const onDiveEnd = useCallback(() => setDiving(false), []);
  return {
    diving,
    onDiveEnd,
    station: (diving ? "arrival" : "overview") as "arrival" | "overview",
  };
}
