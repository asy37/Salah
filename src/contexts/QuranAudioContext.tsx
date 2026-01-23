import React, { createContext, useCallback, useMemo, useRef, type ReactNode } from "react";
import { useAyahPlayer } from "@/lib/hooks/audio-player/useAyahPlayer";

type QuranAudioContextValue = {
  play: (ayahNumber: number) => void;
  pause: () => void;
  stop: () => void;
  setOnAyahFinish: (fn: (() => void) | undefined) => void;
};

const QuranAudioContext = createContext<QuranAudioContextValue | null>(null);

export function QuranAudioProvider({ children }: Readonly<{ children: ReactNode }>) {
  const onFinishRef = useRef<(() => void) | undefined>(undefined);
  const onFinish = useCallback(() => {
    onFinishRef.current?.();
  }, []);

  const ayahPlayer = useAyahPlayer(onFinish);

  const setOnAyahFinish = useCallback((fn: (() => void) | undefined) => {
    onFinishRef.current = fn;
  }, []);

  const value = useMemo<QuranAudioContextValue>(
    () => ({
      play: ayahPlayer.play,
      pause: ayahPlayer.pause,
      stop: ayahPlayer.stop,
      setOnAyahFinish,
    }),
    [ayahPlayer.play, ayahPlayer.pause, ayahPlayer.stop, setOnAyahFinish]
  );

  return (
    <QuranAudioContext.Provider value={value}>
      {children}
    </QuranAudioContext.Provider>
  );
}

export function useQuranAudio(): QuranAudioContextValue {
  const ctx = React.useContext(QuranAudioContext);
  if (!ctx) {
    throw new Error("useQuranAudio must be used within QuranAudioProvider");
  }
  return ctx;
}
