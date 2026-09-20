"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { ApiError, getSharedWorld, getWorld, isIdentityReady, onIdentityChange, USE_MOCK } from "@/lib/api";
import fixture from "@/lib/world/fixture.json";
import { asWorldResponse, changedRegions, toCanvasWorld } from "@/lib/world/adapter";
import type { WorldResponse } from "@/lib/world/types";

const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false });

export type WorldSource = { kind: "own" } | { kind: "visit"; token: string };

const FIXTURE = fixture as WorldResponse;

export function WorldPage({
  source = { kind: "own" },
  readOnly = false,
  onWorld,
  hoveredId,
  onHover,
}: {
  source?: WorldSource;
  readOnly?: boolean;
  /** Called with every payload the canvas draws, so a panel can read the same world. */
  onWorld?: (world: WorldResponse | null) => void;
  hoveredId?: string | null;
  onHover?: (conceptId: string | null) => void;
}) {
  const { selectedId, select, ingestVersion } = useStore();
  const [world, setWorld] = useState<WorldResponse | null>(USE_MOCK ? FIXTURE : null);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [identityTick, setIdentityTick] = useState(0);
  const previous = useRef<WorldResponse | null>(null);

  useEffect(() => onIdentityChange(() => setIdentityTick((n) => n + 1)), []);

  useEffect(() => {
    onWorld?.(world);
  }, [world, onWorld]);

  useEffect(() => {
    if (USE_MOCK) {
      setWorld(FIXTURE);
      return;
    }
    if (source.kind === "own" && !isIdentityReady()) return;

    let cancelled = false;
    const load = source.kind === "visit" ? getSharedWorld(source.token) : getWorld();
    load
      .then((raw) => {
        if (cancelled) return;
        const parsed = asWorldResponse(raw);
        if (!parsed) throw new Error("World payload was not readable.");
        const delta = changedRegions(previous.current, parsed);
        // The first paint is not a change; only later deltas should pulse.
        setChanged(previous.current ? delta : new Set());
        previous.current = parsed;
        setWorld(parsed);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load this world.");
        if (err instanceof ApiError && err.status === 404 && source.kind === "own") setWorld(null);
      });

    return () => {
      cancelled = true;
    };
  }, [source, retry, identityTick, ingestVersion]);

  // Pulses fade on their own after a few seconds.
  useEffect(() => {
    if (changed.size === 0) return;
    const t = setTimeout(() => setChanged(new Set()), 4500);
    return () => clearTimeout(t);
  }, [changed]);

  const canvasWorld = useMemo(() => (world ? toCanvasWorld(world) : null), [world]);

  if (error && !world) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-[15px] text-paper-ink">{error}</p>
        <button type="button" onClick={() => setRetry((n) => n + 1)} className="start-btn">
          Try again
        </button>
      </div>
    );
  }

  if (!canvasWorld) {
    return <div className="flex h-full items-center justify-center text-[14px] text-paper-soft">Raising the island…</div>;
  }

  return (
    <div className="relative h-full min-h-0 w-full">
      <WorldCanvas
        world={canvasWorld}
        readOnly={readOnly}
        selectedId={selectedId}
        onSelect={select}
        hoveredId={hoveredId}
        onHover={onHover}
        changedIds={changed}
      />
      {readOnly ? (
        <p className="state-chip pointer-events-none absolute left-4 top-4" style={{ ["--chip" as string]: "#7a7168" }}>
          Visiting
        </p>
      ) : null}
      {error ? (
        <p className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-paper-card px-3 py-1 text-[12px] text-paper-soft">
          {error}
        </p>
      ) : null}
    </div>
  );
}
