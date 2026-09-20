"use client";

import { use } from "react";
import Link from "next/link";
import { WorldPage } from "@/components/world/WorldPage";

export default function VisitPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  return (
    <>
      <div className="flex h-dvh flex-col bg-[#f3e4ee]">
        <header className="flex h-12 shrink-0 items-center justify-between px-4">
          <p className="font-toy text-[13px] font-extrabold tracking-wide text-[#3a2f45]">Visiting a world</p>
          <Link href="/" className="font-toy text-[13px] font-bold text-[#6b5f78] underline-offset-4 hover:underline">
            StudyGotchi
          </Link>
        </header>
        <div className="min-h-0 flex-1">
          <WorldPage source={{ kind: "visit", token }} readOnly />
        </div>
      </div>
    </>
  );
}
