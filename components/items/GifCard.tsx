"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function GifCard({ url, caption }: { url: string; caption?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { scale: 0.6, opacity: 0, rotation: -6 },
      { scale: 1, opacity: 1, rotation: 0, duration: 0.7, ease: "back.out(2)" },
    );
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={ref}
        className="rounded-[var(--radius-lg)] overflow-hidden"
        style={{
          boxShadow: "0 18px 40px var(--color-shadow)",
          border: "6px solid var(--color-paper)",
          background: "var(--color-paper)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={caption ?? "gif"} className="block max-w-sm max-h-80 object-cover" />
      </div>
      {caption ? (
        <div className="font-hand text-lg" style={{ color: "var(--color-ink)" }}>
          {caption}
        </div>
      ) : null}
    </div>
  );
}
