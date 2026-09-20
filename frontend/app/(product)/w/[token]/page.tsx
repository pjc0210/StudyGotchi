"use client";

import { use, useEffect } from "react";
import { emit } from "@/lib/audio/events";
import { WorldPage } from "@/components/world/WorldPage";

export default function VisitPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  // A visit lands straight on someone else's island: whoosh in (once a gesture unlocks audio),
  // bed follows the island's biome when the payload arrives.
  useEffect(() => {
    emit({ type: "enter-world" });
    emit({ type: "enter-island", biome: null, arrival: "visit" });
    return () => emit({ type: "leave-world" });
  }, []);

  return (
    <div className="earth-page">
      <div className="earth-stage">
        <WorldPage source={{ kind: "visit", token }} readOnly />
      </div>
    </div>
  );
}
