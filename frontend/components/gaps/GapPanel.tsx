"use client";

import { useEffect, useMemo, useState } from "react";
import { PartyPopper } from "lucide-react";
import { formatScore } from "@/lib/graph";
import { buildGraphModel } from "@/lib/graphModel";
import { useStore } from "@/lib/store";
import { pickWeakSequences, type WeakSequence } from "@/lib/weak-sequences";
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
  const [selectedSequence, setSelectedSequence] = useState<string | null>(null);

  const sequences = useMemo(() => {
    const model = buildGraphModel(graph.data, []);
    return pickWeakSequences(graph.data?.nodes ?? [], model.links);
  }, [graph.data]);
  const sequenceKeys = useMemo(
    () => sequences.flatMap((sequence) => sequence.nodeIds),
    [sequences],
  );

  useEffect(() => {
    onGapsLoaded?.(sequenceKeys);
  }, [sequenceKeys, onGapsLoaded]);

  if (!graph.data) return <SkeletonRows rows={3} />;
  if (sequences.length === 0) {
    return (
      <EmptyState
        icon={<PartyPopper size={22} strokeWidth={1.5} />}
        title="No gaps right now"
        body="Nothing specific needs work. Keep a target in mind and the engine will rank the next connections."
      />
    );
  }

  const openSequence = (sequence: WeakSequence) => {
    setSelectedSequence(sequence.id);
    onFocusTrack?.(sequence.nodeIds);
    if (sequence.nodeIds[0]) focusConcept(sequence.nodeIds[0]);
  };

  return (
    <div className="sg-weak-tracks">
      <p className="sg-weak-lede">
        {sequences.length} specific connections that need work. Red traces mark each chain while you stay on Weak Areas.
      </p>
      <ul>
        {sequences.map((sequence) => (
          <li key={sequence.id}>
            <button
              type="button"
              className={`sg-weak-row${selectedSequence === sequence.id ? " is-on" : ""}`}
              aria-pressed={selectedSequence === sequence.id || sequence.nodeIds.includes(selectedId ?? "")}
              onClick={() => openSequence(sequence)}
            >
              <div className="sg-weak-head">
                <strong>{sequence.labels.join(" → ")}</strong>
                <span>{sequence.nodeIds.length}</span>
              </div>
              <div className="sg-weak-meta">
                <span>Mastery {formatScore(sequence.mastery)}</span>
                <span>Needs work</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
