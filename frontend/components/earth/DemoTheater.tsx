"use client";

import { useCallback, useEffect, useState } from "react";
import {
  buildConfettiPieces,
  parseDemoKey,
  type DemoProgressBeat,
  type DemoResultEvent,
  type IceDemoState,
} from "@/lib/world/demo-theater";

export interface DemoTheaterProps {
  enabled: boolean;
  demo: IceDemoState;
  onChange(next: IceDemoState): void;
}

/** Keys stay live. The 1/2/3/F/P chips stay off the page. */
export function DemoTheater({ enabled, demo, onChange }: DemoTheaterProps) {
  const [confetti, setConfetti] = useState(0);

  const apply = useCallback(
    (partial: { beat?: DemoProgressBeat; event?: DemoResultEvent }) => {
      const next: IceDemoState = {
        beat: partial.beat ?? demo.beat,
        event: partial.event ?? (partial.beat ? "idle" : demo.event),
      };
      if (partial.event === "pass") {
        next.beat = next.beat === "empty" ? "half" : "full";
        setConfetti((n) => n + 1);
      }
      if (partial.beat) next.event = "idle";
      onChange(next);
    },
    [demo.beat, demo.event, onChange],
  );

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const parsed = parseDemoKey(event.key);
      if (!parsed) return;
      event.preventDefault();
      apply(parsed);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [apply, enabled]);

  if (!enabled) return null;
  return confetti > 0 ? <DemoConfetti key={confetti} /> : null;
}

function DemoConfetti() {
  const pieces = buildConfettiPieces();
  return (
    <div className="demo-confetti" aria-hidden data-count={pieces.length}>
      {pieces.map((piece) => (
        <i
          key={piece.id}
          style={{
            left: `${piece.left}%`,
            width: piece.width,
            height: piece.height,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            background: piece.color,
            ["--sway" as string]: `${(piece.id % 2 === 0 ? 1 : -1) * (12 + (piece.id % 7) * 6)}px`,
            transform: `rotate(${piece.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
