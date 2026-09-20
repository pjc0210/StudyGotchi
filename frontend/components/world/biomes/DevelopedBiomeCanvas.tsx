"use client";

import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useEffect, useState } from "react";
import type { LocalBiomeId } from "./types";

const FrontierMount = dynamic(() => import("./frontier-town/Mount").then((mod) => mod.FrontierMount), { ssr: false });
const CoastalMount = dynamic(() => import("./coastal-ruins/Mount").then((mod) => mod.CoastalMount), { ssr: false });
const JungleMount = dynamic(() => import("./jungle-forest-village/Mount").then((mod) => mod.JungleMount), { ssr: false });
const MeadowMount = dynamic(() => import("./medieval-meadow-kingdom/Mount").then((mod) => mod.MeadowMount), { ssr: false });
const NordicMount = dynamic(() => import("./nordic-volcanic-highlands/Mount").then((mod) => mod.NordicMount), { ssr: false });

export function DevelopedBiomeCanvas({
  visual,
  progress,
}: {
  visual: Exclude<LocalBiomeId, "ice-golden" | "island">;
  progress: number;
}) {
  const [dpr, setDpr] = useState<[number, number]>([1, 1.5]);
  const [frameloop, setFrameloop] = useState<"always" | "demand">("always");

  useEffect(() => {
    const onVis = () => setFrameloop(document.hidden ? "demand" : "always");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <Canvas
      data-land-mount={visual}
      dpr={dpr}
      frameloop={frameloop}
      camera={{ position: [0, 28, 72], fov: 26, near: 0.5, far: 900 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <PerformanceMonitor onDecline={() => setDpr([1, 1])} />
      {visual === "frontier-town" ? <FrontierMount progress={progress} /> : null}
      {visual === "coastal-ruins" ? <CoastalMount progress={progress} /> : null}
      {visual === "jungle-forest-village" ? <JungleMount progress={progress} /> : null}
      {visual === "medieval-meadow-kingdom" ? <MeadowMount progress={progress} /> : null}
      {visual === "nordic-volcanic-highlands" ? <NordicMount progress={progress} /> : null}
    </Canvas>
  );
}
