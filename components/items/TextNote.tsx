"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import type { ItemPayload } from "@/lib/types";
import { paperBg } from "@/app/bundle/[id]/edit/PositionedLetterCanvas";

type Props = {
  payload: Extract<ItemPayload, { type: "text" }>;
  caption?: string;
};

/**
 * Handwritten letter. Paper card with a line-by-line reveal driven by GSAP.
 * We treat each block-level node as a "line" and stagger their opacity/translate.
 */
export function TextNote({ payload, caption }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  const isPositioned = payload.mode === "positioned";
  const isDrawn      = payload.mode === "drawn";
  const isTyped      = !isPositioned && !isDrawn;
  const html = isTyped ? (payload.html ?? "") : "";
  const fontFamily = isTyped ? (payload.fontFamily ?? "var(--font-hand)") : undefined;
  const paperStyle = payload.paperStyle as Parameters<typeof paperBg>[0] | undefined;

  useEffect(() => {
    if (!isTyped) return;
    const root = rootRef.current;
    if (!root) return;
    const lines = Array.from(root.querySelectorAll<HTMLElement>("[data-line]"));
    if (!lines.length) return;
    gsap.set(lines, { y: 14, opacity: 0 });
    gsap.to(lines, { y: 0, opacity: 1, duration: 0.65, ease: "power2.out", stagger: 0.18, delay: 0.1 });
  }, [html, isPositioned]);

  if (isDrawn) {
    const strokes = payload.strokes ?? [];
    return (
      <div className="w-full max-w-xl mx-auto">
        <div
          className="relative paper-sheet rounded-[var(--radius-lg)]"
          style={{
            aspectRatio: "560/380",
            backgroundImage: paperBg(paperStyle ?? "blank"),
            backgroundPosition: "0 36px",
            boxShadow: "0 12px 40px var(--color-shadow), inset 0 0 0 1px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          <svg viewBox="0 0 100 67.857" preserveAspectRatio="none"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            {strokes.map((s, i) => (
              <path key={i}
                d={s.points.map((p, j) => `${j === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ")}
                stroke={s.color} fill="none"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ strokeWidth: `${s.width * 1.5}px` }} />
            ))}
          </svg>
        </div>
        {caption && (
          <div className="mt-3 text-center text-sm font-hand" style={{ color: "var(--color-muted)" }}>
            {caption}
          </div>
        )}
      </div>
    );
  }

  if (isPositioned) {
    const blocks = payload.blocks ?? [];
    const stickers = payload.stickers ?? [];
    return (
      <div className="w-full max-w-xl mx-auto">
        <div
          className="relative paper-sheet rounded-[var(--radius-lg)]"
          style={{
            aspectRatio: "560/380",
            backgroundImage: paperBg(paperStyle ?? "lined"),
            backgroundPosition: "0 36px",
            boxShadow: "0 12px 40px var(--color-shadow), inset 0 0 0 1px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          {blocks.map((block) => (
            <div
              key={block.id}
              style={{
                position: "absolute",
                left: `${block.x}%`,
                top: `${block.y}%`,
                maxWidth: `${Math.max(20, 98 - block.x)}%`,
                fontFamily: block.fontFamily,
                fontSize: block.fontSize,
                color: block.color,
                fontWeight: block.bold ? 700 : 400,
                fontStyle: block.italic ? "italic" : "normal",
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {block.text}
            </div>
          ))}
          {stickers.map((s) => (
            <div
              key={s.id}
              style={{
                position: "absolute",
                left: `${s.x}%`,
                top: `${s.y}%`,
                transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
                fontSize: s.size,
                lineHeight: 1,
                userSelect: "none",
                pointerEvents: "none",
              }}
            >
              {s.emoji}
            </div>
          ))}
        </div>
        {caption && (
          <div className="mt-3 text-center text-sm font-hand" style={{ color: "var(--color-muted)" }}>
            {caption}
          </div>
        )}
      </div>
    );
  }

  const wrapped = wrapLines(html);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        ref={rootRef}
        className="relative paper-sheet rounded-[var(--radius-lg)] p-8 md:p-10"
        style={{
          color: "var(--color-ink)",
          minHeight: 240,
          fontFamily,
          backgroundImage: paperBg(paperStyle ?? "blank"),
          backgroundPosition: "0 36px",
          boxShadow: "0 12px 40px var(--color-shadow), inset 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        <div
          className="text-2xl md:text-3xl leading-[1.7]"
          dangerouslySetInnerHTML={{ __html: wrapped }}
        />
      </div>
      {caption ? (
        <div className="mt-3 text-center text-sm font-hand" style={{ color: "var(--color-muted)" }}>
          {caption}
        </div>
      ) : null}
    </div>
  );
}

function wrapLines(html: string): string {
  // Very simple pass: split on </p>|</div>|<br/>|\n\n and wrap each chunk.
  const chunks = html
    .split(/(<\/p>|<\/div>|<br\s*\/?>|\n\n)/gi)
    .reduce<string[]>((acc, piece) => {
      if (!piece) return acc;
      if (/<\/(p|div)>|<br\s*\/?>|\n\n/i.test(piece)) {
        if (acc.length > 0) acc[acc.length - 1] += piece;
        return acc;
      }
      acc.push(piece);
      return acc;
    }, [])
    .filter((s) => s.trim().length > 0);

  if (chunks.length === 0) {
    return `<div data-line>${html}</div>`;
  }
  return chunks.map((c) => `<div data-line>${c}</div>`).join("");
}
