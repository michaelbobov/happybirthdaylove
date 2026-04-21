"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { gsap } from "gsap";

export function AudioNote({ src, durationSec }: { src: string; durationSec?: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!rootRef.current) return;
    gsap.fromTo(
      rootRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
    );
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play();
    setPlaying(!playing);
  };

  return (
    <div
      ref={rootRef}
      className="inline-flex items-center gap-4 p-4 rounded-full paper-sheet"
    >
      <button
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background: "var(--color-ink)",
          color: "var(--color-bg)",
        }}
      >
        {playing ? <Pause size={20} /> : <Play size={20} />}
      </button>
      <div className="flex items-end gap-[2px] h-6 w-40">
        {Array.from({ length: 28 }).map((_, i) => (
          <div
            key={i}
            className="w-[4px] rounded-full"
            style={{
              height: `${20 + Math.abs(Math.sin(i * 0.7)) * 60}%`,
              background: playing ? "var(--color-accent)" : "var(--color-muted)",
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>
      {durationSec ? (
        <div className="text-sm font-hand" style={{ color: "var(--color-muted)" }}>
          {Math.floor(durationSec / 60)}:{(Math.floor(durationSec) % 60).toString().padStart(2, "0")}
        </div>
      ) : null}
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setPlaying(false)}
        preload="metadata"
        className="hidden"
      />
    </div>
  );
}
