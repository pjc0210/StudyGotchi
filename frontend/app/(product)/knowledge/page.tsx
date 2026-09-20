import { Suspense } from "react";
import { ConstellationPage } from "@/components/constellation/ConstellationPage";

export default function KnowledgePage() {
  return (
    <Suspense fallback={<div className="grid h-dvh place-items-center text-[14px] text-paper-soft">Charting your sky…</div>}>
      <ConstellationPage />
    </Suspense>
  );
}
