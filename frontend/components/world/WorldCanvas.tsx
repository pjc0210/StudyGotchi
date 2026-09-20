"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Island } from "./Island";
import type { WorldCanvasProps } from "@/lib/world/types";

export default function WorldCanvas(props: WorldCanvasProps) {
  const [dpr, setDpr] = useState<[number, number]>([1, 1.5]);
  const [frameloop, setFrameloop] = useState<"always" | "demand">("always");

  useEffect(() => {
    const onVis = () => setFrameloop(document.hidden ? "demand" : "always");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <Canvas
      dpr={dpr}
      frameloop={frameloop}
      camera={{ position: [0, 19, 27], fov: 42 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <PerformanceMonitor onDecline={() => setDpr([1, 1])} />
      <Island {...props} />
    </Canvas>
  );
}
