"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { FULL_CREDITS_HREF, usedBgmTracks, type BgmTrack } from "@/lib/audio/catalog";
import { emit } from "@/lib/audio/events";
import { useAudio } from "./AudioProvider";
import type { Bus } from "@/lib/audio/runtime";

const BUSES: { bus: Bus; label: string; hint: string }[] = [
  { bus: "music", label: "Music", hint: "The bed under the world" },
  { bus: "sfx", label: "Sounds", hint: "Taps, sprouts, landings" },
  { bus: "voice", label: "Voices", hint: "Creatures saying their names" },
];

function chipLine(track: BgmTrack | null, unlocked: boolean, muted: boolean): string {
  if (muted) return track ? `Muted · ${track.title}` : "Muted";
  if (!unlocked) return "Tap anywhere to start the music";
  if (!track) return "Quiet for now";
  return `${track.title} · ${track.artist}`;
}

export function AudioChrome({ variant = "paper" }: { variant?: "paper" | "ink" }) {
  const { state, nowPlaying, setGain, toggleMuted, unlock } = useAudio();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const credits = usedBgmTracks();

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const muted = state.muted;
  const line = chipLine(nowPlaying, state.unlocked, muted);

  return (
    <div ref={root} className={`audio-chrome audio-chrome--${variant}`}>
      <button
        type="button"
        className="audio-chrome-mute"
        aria-pressed={muted}
        aria-label={muted ? "Unmute" : "Mute"}
        onClick={() => {
          void unlock();
          toggleMuted();
        }}
      >
        {muted ? <VolumeX size={15} strokeWidth={2.1} aria-hidden /> : <Volume2 size={15} strokeWidth={2.1} aria-hidden />}
      </button>

      <button
        type="button"
        className="audio-chrome-chip"
        aria-expanded={open}
        aria-controls={titleId}
        onClick={() => {
          emit({ type: "ui", kind: "tap" });
          void unlock();
          setOpen((v) => !v);
        }}
      >
        <span className="audio-chrome-mark" aria-hidden>
          ♪
        </span>
        <span className="audio-chrome-line">{line}</span>
      </button>

      {open ? (
        <div className="audio-chrome-panel sg-enter" id={titleId} role="dialog" aria-label="Sound">
          <header className="audio-chrome-head">
            <p className="audio-chrome-kicker">Now playing</p>
            {nowPlaying ? (
              <p className="audio-chrome-credit">
                <a href={nowPlaying.source} target="_blank" rel="noreferrer">
                  {nowPlaying.credit}
                </a>
              </p>
            ) : (
              <p className="audio-chrome-credit">Nothing on the music bus yet. A tap on the world starts it.</p>
            )}
          </header>

          <ul className="audio-chrome-mix">
            {BUSES.map(({ bus, label, hint }) => (
              <li key={bus}>
                <label>
                  <span>
                    {label}
                    <small>{hint}</small>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={state.gains[bus]}
                    aria-valuetext={`${Math.round(state.gains[bus] * 100)} percent`}
                    onChange={(e) => setGain(bus, Number(e.target.value))}
                  />
                </label>
              </li>
            ))}
          </ul>

          <section className="audio-chrome-thanks" aria-label="Music credits">
            <h2>Thanks</h2>
            <ul>
              {credits.map((track) => (
                <li key={track.id}>
                  <a href={track.source} target="_blank" rel="noreferrer">
                    {track.title}
                  </a>
                  <span>
                    {track.artist} · {track.license}
                  </span>
                </li>
              ))}
            </ul>
            <a className="audio-chrome-full" href={FULL_CREDITS_HREF} target="_blank" rel="noreferrer">
              Full credits
            </a>
          </section>
        </div>
      ) : null}
    </div>
  );
}
