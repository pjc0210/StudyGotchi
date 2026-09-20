"use client";

import { use } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { WorldPage } from "@/components/world/WorldPage";

export default function VisitPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  return (
    <div className="earth-page">
      <SiteHeader />
      <div className="earth-stage">
        <WorldPage source={{ kind: "visit", token }} readOnly />
      </div>
    </div>
  );
}
