"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RevealedItem } from "@/lib/types";
import { ItemRenderer } from "./ItemRenderer";

type Props = {
  items: RevealedItem[];
  onDone?: () => void;
};

export function ItemViewer({ items, onDone }: Props) {
  const [idx, setIdx] = useState(0);
  // Track which direction the last navigation went, so animateIn uses the right axis.
  const pendingDir = useRef<"left" | "right">("left");
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Swipe tracking
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  // Show "swipe →" hint only on the very first card, fade it away after first interaction.
  const [showHint, setShowHint] = useState(true);
  const hintRef = useRef<HTMLDivElement>(null);

  // Entrance animation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    gsap.fromTo(el, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, ease: "power3.out" });
  }, []);

  const fadeHint = useCallback(() => {
    if (!showHint) return;
    const el = hintRef.current;
    if (el) gsap.to(el, { opacity: 0, y: 4, duration: 0.3, onComplete: () => setShowHint(false) });
    else setShowHint(false);
  }, [showHint]);

  // Fade hint out after 2.4 s if not dismissed by interaction
  useEffect(() => {
    if (!showHint) return;
    const id = setTimeout(() => fadeHint(), 2400);
    return () => clearTimeout(id);
  }, [fadeHint, showHint]);

  const animateOut = (dir: "left" | "right", cb: () => void) => {
    const el = cardRef.current;
    if (!el) { cb(); return; }
    gsap.to(el, {
      x: dir === "left" ? -72 : 72,
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: cb,
    });
  };

  const animateIn = (dir: "left" | "right") => {
    const el = cardRef.current;
    if (!el) return;
    gsap.fromTo(el,
      { x: dir === "left" ? 72 : -72, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.26, ease: "power2.out" },
    );
  };

  const go = (next: number, exitDir: "left" | "right") => {
    fadeHint();
    pendingDir.current = exitDir;
    animateOut(exitDir, () => setIdx(next));
  };

  useEffect(() => {
    animateIn(pendingDir.current);
  }, [idx]);

  // ── Pointer/touch swipe ────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    // Only register horizontal swipes with a clear directional bias
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && idx < items.length - 1) go(idx + 1, "left");
    if (dx > 0 && idx > 0) go(idx - 1, "right");
  };

  const item = items[idx];
  const isLast = idx === items.length - 1;
  const isFirst = idx === 0;

  return (
    <div ref={containerRef} className="flex flex-col items-center w-full">

      {/* Progress dots */}
      {items.length > 1 && (
        <div className="flex gap-2 mb-6">
          {items.map((_, i) => (
            <button
              type="button"
              key={i}
              onClick={() => i !== idx && go(i, i > idx ? "left" : "right")}
              style={{
                width: i === idx ? 20 : 8,
                height: 8,
                borderRadius: 4,
                background: i === idx ? "var(--color-accent)" : "var(--color-muted)",
                opacity: i === idx ? 1 : 0.45,
                border: "none",
                padding: 0,
                cursor: i === idx ? "default" : "pointer",
                transition: "width 0.25s, background 0.25s",
              }}
            />
          ))}
        </div>
      )}

      {/* Swipeable card area — stack of 3 layers */}
      <div
        className="w-full relative"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        style={{ touchAction: "pan-y" }}
      >
        {/* Ghost cards: the next 2 items peeking behind, paper-colored so no spoilers */}
        {[2, 1].map((depth) => {
          const ghostIdx = idx + depth;
          if (ghostIdx >= items.length) return null;
          return (
            <div
              key={ghostIdx}
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                justifyContent: "center",
                transform: `translateY(${depth * 7}px) translateX(${depth * 3}px) scale(${1 - depth * 0.035}) rotate(${depth * 1.4}deg)`,
                opacity: 1 - depth * 0.18,
                zIndex: -depth,
                pointerEvents: "none",
                // Clip to a card-shaped silhouette so only the back peeks out
                overflow: "hidden",
                filter: "brightness(0.92)",
              }}
            >
              {/* Blank card back — same dimensions as the real card, paper-toned */}
              <div
                style={{
                  width: "100%",
                  maxWidth: 480,
                  minHeight: 200,
                  background: "var(--color-paper, #fff)",
                  borderRadius: "var(--radius-lg, 12px)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                }}
              />
            </div>
          );
        })}

        {/* Active card */}
        <div ref={cardRef} className="w-full flex justify-center" style={{ position: "relative", zIndex: 1 }}>
          <ItemRenderer item={item} />
        </div>

        {/* First-item swipe hint */}
        {showHint && isFirst && items.length > 1 && (
          <div
            ref={hintRef}
            className="absolute bottom-0 right-4 flex items-center gap-1.5 pointer-events-none select-none"
            style={{ color: "var(--color-muted)", fontSize: 12, opacity: 0.75, zIndex: 2 }}
          >
            <span>swipe</span>
            <ChevronRight size={13} />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center gap-4">
        {!isFirst && (
          <button
            onClick={() => go(idx - 1, "right")}
            className="rounded-full p-2 border"
            style={{ borderColor: "var(--color-muted)", color: "var(--color-muted)" }}
            aria-label="Previous"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {!isLast ? (
          <button
            onClick={() => go(idx + 1, "left")}
            className="rounded-full px-6 py-2.5 text-sm font-medium"
            style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={onDone}
            className="rounded-full px-6 py-2.5 text-sm font-medium"
            style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
          >
            Done ✓
          </button>
        )}

        {!isLast && (
          <button
            onClick={() => go(idx + 1, "left")}
            className="rounded-full p-2 border"
            style={{ borderColor: "var(--color-muted)", color: "var(--color-muted)" }}
            aria-label="Next"
            tabIndex={-1}
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      <div className="mt-3 text-xs uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
        {idx + 1} of {items.length}
      </div>
    </div>
  );
}
