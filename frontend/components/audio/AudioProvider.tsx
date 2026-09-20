"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { BGM, type BgmTrack } from "@/lib/audio/catalog";
import { emit, type AudioEvent } from "@/lib/audio/events";
import { audio, type AudioState, type Bus } from "@/lib/audio/runtime";

export interface AudioApi {
  state: AudioState;
  /** what the music bus is playing, for the credit line the license asks for */
  nowPlaying: BgmTrack | null;
  unlock: () => Promise<boolean>;
  emit: (event: AudioEvent) => void;
  setGain: (bus: Bus, value: number) => void;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
}

const AudioApiContext = createContext<AudioApi | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(audio.subscribe, audio.getSnapshot, audio.getServerSnapshot);

  // The single-course path lands on the island without a course click, so the first pointer or
  // key anywhere doubles as the unlock gesture. Everything stays silent until then.
  useEffect(() => {
    const onGesture = () => {
      void audio.unlock();
    };
    window.addEventListener("pointerdown", onGesture, { once: true, capture: true });
    window.addEventListener("keydown", onGesture, { once: true, capture: true });
    return () => {
      window.removeEventListener("pointerdown", onGesture, { capture: true });
      window.removeEventListener("keydown", onGesture, { capture: true });
    };
  }, []);

  const value = useMemo<AudioApi>(
    () => ({
      state,
      nowPlaying: state.bgm ? BGM[state.bgm] : null,
      unlock: () => audio.unlock(),
      emit,
      setGain: (bus, v) => audio.setGain(bus, v),
      setMuted: (m) => audio.setMuted(m),
      toggleMuted: () => audio.toggleMuted(),
    }),
    [state],
  );

  return <AudioApiContext.Provider value={value}>{children}</AudioApiContext.Provider>;
}

export function useAudio(): AudioApi {
  const ctx = useContext(AudioApiContext);
  if (!ctx) throw new Error("useAudio must be used inside AudioProvider");
  return ctx;
}
