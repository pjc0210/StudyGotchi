"use client";

import { useEffect, useState } from "react";
import { PartyPopper } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { GapsResponse } from "@/lib/types";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState, SkeletonRows } from "@/components/common/LoadingState";
import { GapItem } from "./GapItem";

export function GapPanel({
  onGapsLoaded,
}: {
  onGapsLoaded?: (conceptIds: string[]) => void;
}) {
  const { target, selectedId, focusConcept } = useStore();
  const [data, setData] = useState<GapsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!target) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getGaps(target)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        onGapsLoaded?.(res.gaps.map((g) => g.concept_id));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Could not load your gaps.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // onGapsLoaded is a stable callback from the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, nonce]);

  if (!target) {
    return (
      <EmptyState
        title="No target available"
        body="Upload course material so the engine has concepts to aim at."
      />
    );
  }
  if (loading) return <SkeletonRows rows={3} />;
  if (error) return <ErrorState message={error} onRetry={() => setNonce((n) => n + 1)} />;
  if (!data || data.gaps.length === 0) {
    return (
      <EmptyState
        icon={<PartyPopper size={22} strokeWidth={1.5} />}
        title="No gaps for this target"
        body="Nothing is blocking you right now. Pick a different target to look further ahead."
      />
    );
  }

  return (
    <div className="p-4">
      <p className="mb-3 text-[12px] text-ink-dim">
        Ranked by the engine for <span className="text-ink">{data.target.label}</span>.
      </p>
      <ul className="space-y-2">
        {data.gaps.map((gap, i) => (
          <GapItem
            key={gap.concept_id}
            gap={gap}
            index={i}
            selected={selectedId === gap.concept_id}
            onSelect={() => focusConcept(gap.concept_id)}
          />
        ))}
      </ul>
    </div>
  );
}
