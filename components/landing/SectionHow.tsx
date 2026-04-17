"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Calendar, HeartHandshake, Lock, Gift, Image as ImageIcon, Mic } from "lucide-react";

const steps = [
  {
    icon: HeartHandshake,
    title: "1. Build a bundle",
    body: "Pick a theme and a person. Add as many envelopes as you want — one for each moment you want to be there.",
  },
  {
    icon: Calendar,
    title: "2. Set each trigger",
    body: "Open on a date, an anniversary, or a feeling. Lock each envelope until the moment is right.",
  },
  {
    icon: Lock,
    title: "3. Keep it safe",
    body: "Everything inside is encrypted. Gift card codes, photos, and private notes only decrypt when the timer runs out.",
  },
  {
    icon: Gift,
    title: "4. Send one link",
    body: "They get a quiet little URL. No app to install. They can claim it to an account to keep it forever.",
  },
];

const contentTypes = [
  { icon: ImageIcon, label: "Photos & polaroids" },
  { icon: Mic, label: "Voice notes" },
  { icon: Gift, label: "Gift card codes" },
  { icon: HeartHandshake, label: "Cash or payment links" },
];

export function SectionHow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const cards = ref.current.querySelectorAll<HTMLElement>("[data-card]");
    gsap.fromTo(
      cards,
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: undefined,
      },
    );
  }, []);

  return (
    <section id="how" ref={ref} className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="font-display text-4xl md:text-5xl text-center" style={{ color: "var(--color-ink)" }}>
        One bundle. Every moment you need to show up.
      </h2>
      <p className="text-center mt-3 font-hand text-lg" style={{ color: "var(--color-muted)" }}>
        &ldquo;Open when you&rsquo;re missing me. Open on May 12. Open on our anniversary.&rdquo;
      </p>
      <div className="mt-14 grid md:grid-cols-4 gap-6">
        {steps.map((s) => (
          <div
            key={s.title}
            data-card
            className="paper rounded-[var(--radius-lg)] p-6"
            style={{ boxShadow: "0 10px 28px var(--color-shadow)" }}
          >
            <s.icon size={22} style={{ color: "var(--color-accent)" }} />
            <h3 className="mt-4 font-display text-xl" style={{ color: "var(--color-ink)" }}>
              {s.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
              {s.body}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-14 flex flex-wrap justify-center gap-3">
        {contentTypes.map((c) => (
          <div
            key={c.label}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
            style={{ borderColor: "var(--color-muted)", color: "var(--color-ink)" }}
          >
            <c.icon size={14} /> {c.label}
          </div>
        ))}
      </div>
    </section>
  );
}
