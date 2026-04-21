"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

type Props = {
  amount: number;
  currency: string;
  instructions?: string;
  link?: string;
};

/**
 * Animated cash fly-out. Renders N "bill" rectangles that spray up and settle
 * as a card in the center. The spray uses staggered GSAP tweens with random arc.
 */
export function MoneyBurst({ amount, currency, instructions, link }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const bills = 14;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>(".bill"));
    gsap.set(els, { y: 60, opacity: 0, scale: 0.4 });
    els.forEach((b) => {
      const dx = (Math.random() - 0.5) * 420;
      const dy = -180 - Math.random() * 120;
      const rot = (Math.random() - 0.5) * 720;
      gsap
        .timeline()
        .to(b, {
          x: dx,
          y: dy,
          rotation: rot,
          opacity: 1,
          scale: 1,
          duration: 0.9 + Math.random() * 0.4,
          ease: "power2.out",
        })
        .to(b, {
          x: dx * 0.5,
          y: 40 + Math.random() * 60,
          rotation: rot * 0.2,
          duration: 1.1,
          ease: "power2.in",
        });
    });
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { scale: 0.6, opacity: 0, y: 30 },
        { scale: 1, opacity: 1, y: 0, delay: 1.2, duration: 0.7, ease: "back.out(1.8)" },
      );
    }
  }, []);

  const formatted = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount);

  return (
    <div ref={rootRef} className="relative flex items-center justify-center min-h-[320px]">
      {Array.from({ length: bills }).map((_, i) => (
        <div
          key={i}
          className="bill absolute rounded-sm"
          style={{
            width: 86,
            height: 40,
            background: "linear-gradient(135deg,#c1d9b6,#97b98a 60%,#789e6d)",
            boxShadow: "inset 0 0 0 2px #5c7d52, 0 8px 14px rgba(0,0,0,0.2)",
            transform: "translate(-50%,-50%)",
            left: "50%",
            top: "50%",
          }}
        />
      ))}
      <div
        ref={cardRef}
        className="relative rounded-[var(--radius-lg)] paper-sheet px-8 py-6 text-center"
        style={{
          color: "var(--color-ink)",
          minWidth: 280,
        }}
      >
        <div className="text-sm uppercase tracking-widest opacity-70">a little something</div>
        <div className="font-display text-5xl mt-1">{formatted}</div>
        {instructions ? (
          <div className="mt-2 font-hand text-lg" style={{ color: "var(--color-muted)" }}>
            {instructions}
          </div>
        ) : null}
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-3 text-sm underline"
            style={{ color: "var(--color-accent)" }}
          >
            Open payment link →
          </a>
        ) : null}
      </div>
    </div>
  );
}
