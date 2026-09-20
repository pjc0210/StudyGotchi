"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { ApiError, getSharedWorld, getWorld, isIdentityReady, onIdentityChange, USE_MOCK } from "@/lib/api";
import fixture from "@/lib/world/fixture.json";
import type { WorldOut } from "@/lib/world/types";

const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false });

export type WorldSource = { kind: "own" } | { kind: "visit"; token: string };

function asWorld(raw: unknown): WorldOut | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as WorldOut;
  if (!Array.isArray(obj.places) || !Array.isArray(obj.spots) || !Array.isArray(obj.characters)) return null;
  return obj;
}

export function WorldPage({
  source = { kind: "own" },
  readOnly = false,
}: {
  source?: WorldSource;
  readOnly?: boolean;
}) {
  const { selectedId, select } = useStore();
  const [world, setWorld] = useState<WorldOut | null>(USE_MOCK ? (fixture as WorldOut) : null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [identityTick, setIdentityTick] = useState(0);

  useEffect(() => onIdentityChange(() => setIdentityTick((n) => n + 1)), []);

  useEffect(() => {
    if (USE_MOCK) {
      setWorld(fixture as WorldOut);
      return;
    }

    if (source.kind === "own" && !isIdentityReady()) return;

    let cancelled = false;
    const load = source.kind === "visit" ? getSharedWorld(source.token) : getWorld();
    load
      .then((raw) => {
        if (cancelled) return;
        const parsed = asWorld(raw);
        if (!parsed) throw new Error("World payload was not readable.");
        setWorld(parsed);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const missing = err instanceof ApiError && err.status === 404;
        if (source.kind === "own" && missing) {
          setWorld(fixture as WorldOut);
          setError(null);
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load this world.");
        if (source.kind === "own") setWorld(fixture as WorldOut);
      });

    return () => {
      cancelled = true;
    };
  }, [source, retry, identityTick]);

  if (error && !world) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#f3e4ee] px-6 text-center">
        <p className="text-[15px] font-semibold text-[#3a2f45]">{error}</p>
        <button
          type="button"
          onClick={() => setRetry((n) => n + 1)}
          className="rounded-full bg-[#4f8a4a] px-4 py-2 text-[13px] font-extrabold text-[#fffaf3]"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!world) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f3e4ee] text-[14px] font-semibold text-[#6b5f78]">
        Raising the island…
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0 w-full bg-[#f3e4ee]">
      <WorldCanvas world={world} readOnly={readOnly} selectedId={selectedId} onSelect={select} />
      {readOnly ? (
        <p className="pointer-events-none absolute left-4 top-4 rounded-full bg-[#fffaf3]/90 px-3 py-1 text-[12px] font-extrabold tracking-wide text-[#3a2f45] shadow-[0_3px_0_#3a2f45]">
          Visiting
        </p>
      ) : null}
    </div>
  );
}
