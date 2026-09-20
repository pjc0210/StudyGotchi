import { Suspense } from "react";
import { EarthShell } from "@/components/earth/EarthShell";

export default function EarthRoute() {
  return (
    <Suspense fallback={<div className="grid h-dvh place-items-center text-[14px] text-paper-soft">Raising the island…</div>}>
      <EarthShell />
    </Suspense>
  );
}
