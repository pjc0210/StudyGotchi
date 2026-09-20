"use client";

import { useEffect, useMemo, useState } from "react";
import { PartyPopper } from "lucide-react";
import { formatScore } from "@/lib/graph";
import { useStore } from "@/lib/store";
import { weakAreaTracks, type WeakTrack } from "@/lib/world/pipeline-understanding";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonRows } from "@/components/common/LoadingState";

export function GapPanel({
  onGapsLoaded,
  onFocusTrack,
}: {
  onGapsLoaded?: (conceptIds: string[]) => void;
  onFocusTrack?: (conceptIds: string[]) => void;
}) {
  const { graph, selectedId, focusConcept } = useStore();
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);

  const tracks = useMemo(() => weakAreaTracks(graph.data?.nodes ?? []), [graph.data]);
  const trackKeys = useMemo(() => tracks.map((track) => track.id), [tracks]);

  useEffect(() => {
    onGapsLoaded?.(trackKeys);
  }, [trackKeys, onGapsLoaded]);

  if (!graph.data) return <SkeletonRows rows={3} />;
  if (tracks.length === 0) {
    return (
      <EmptyState
        icon={<PartyPopper size={22} strokeWidth={1.5} />}
        title="No weak tracks right now"
        body="Nothing is clustering as a gap. Keep a target in mind and the engine will rank the next ones."
      />
    );
  }

  const openTrack = (track: WeakTrack) => {
    setSelectedTrack(track.id);
    onFocusTrack?.(track.conceptIds);
    if (track.conceptIds[0]) focusConcept(track.conceptIds[0]);
  };

  return (
    <div className="sg-weak-tracks">
      <p className="sg-weak-lede">The three weakest clusters. A short red trace marks each, then fades.</p>
      <ul>
        {tracks.map((track) => (
          <li key={track.id}>
            <button
              type="button"
              className={`sg-weak-row${selectedTrack === track.id ? " is-on" : ""}`}
              aria-pressed={selectedTrack === track.id || track.conceptIds.includes(selectedId ?? "")}
              onClick={() => openTrack(track)}
            >
              <div className="sg-weak-head">
                <strong>{track.label}</strong>
                <span>{track.count}</span>
              </div>
              <div className="sg-weak-meta">
                <span>Mastery {formatScore(track.mastery)}</span>
                <span>Track</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
