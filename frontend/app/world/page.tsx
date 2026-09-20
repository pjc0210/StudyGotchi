import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";

export default function WorldRoute() {
  return (
    <Suspense
      fallback={
        <div className="grid h-dvh place-items-center bg-[#f3e4ee] font-toy text-[14px] font-semibold text-[#6b5f78]">
          Raising the island…
        </div>
      }
    >
      <AppShell initial="world" />
    </Suspense>
  );
}
