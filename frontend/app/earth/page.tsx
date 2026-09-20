import { Suspense } from "react";
import { WorldPage } from "@/components/world/WorldPage";

export default function EarthRoute() {
  return (
    <Suspense
      fallback={
        <div className="grid h-dvh place-items-center bg-[#f6efe4] text-[14px] font-medium text-[#7a7168]">
          Raising the island…
        </div>
      }
    >
      <div className="h-dvh">
        <WorldPage />
      </div>
    </Suspense>
  );
}
