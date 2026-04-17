"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

type Props = {
  html: string;
  caption?: string;
};

/**
 * Handwritten letter. Paper card with a line-by-line reveal driven by GSAP.
 * We treat each block-level node as a "line" and stagger their opacity/translate.
 */
export function TextNote({ html, caption }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const lines = Array.from(root.querySelectorAll<HTMLElement>("[data-line]"));
    if (!lines.length) return;
    gsap.set(lines, { y: 14, opacity: 0 });
    gsap.to(lines, {
      y: 0,
      opacity: 1,
      duration: 0.65,
      ease: "power2.out",
      stagger: 0.18,
      delay: 0.1,
    });
  }, [html]);

  // Wrap each root-level HTML node with data-line so we can stagger them.
  const wrapped = wrapLines(html);

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        ref={rootRef}
        className="relative paper rounded-[var(--radius-lg)] p-8 md:p-10 shadow-xl"
        style={{
          color: "var(--color-ink)",
          minHeight: 240,
          boxShadow: "0 12px 40px var(--color-shadow), inset 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        <div
          className="font-hand text-2xl md:text-3xl leading-[1.7]"
          dangerouslySetInnerHTML={{ __html: wrapped }}
        />
      </div>
      {caption ? (
        <div
          className="mt-3 text-center text-sm font-hand"
          style={{ color: "var(--color-muted)" }}
        >
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
