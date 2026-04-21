"use client";

import { useEffect, useMemo, useState } from "react";
import { gsap } from "gsap";
import { themeList, type Theme, type ThemeId } from "@/lib/themes";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { EnvelopeOpener } from "@/components/envelope/EnvelopeOpener";
import { TextNote } from "@/components/items/TextNote";
import { Polaroid } from "@/components/items/Polaroid";
import { GiftCardReveal } from "@/components/items/GiftCardReveal";
import { MoneyBurst } from "@/components/items/MoneyBurst";

type HeroCopy = {
  eyebrow: string;
  headline: string;
  accent: string;
  subtitle: string;
  cta: string;
};

const heroCopy: Record<ThemeId, HeroCopy> = {
  "warm-handmade": {
    eyebrow: "A letter, kept safe",
    headline: "Letters that open",
    accent: "when the moment does.",
    subtitle:
      "Tuck a photo, a song, a twenty, or a whole year of love into envelopes. Each one waits for its day — then opens like it was always meant to.",
    cta: "Start a bundle",
  },
  "modern-playful": {
    eyebrow: "Future you ↔ past you",
    headline: "A hug,",
    accent: "mailed into the future.",
    subtitle:
      "Stack up envelopes with notes, GIFs, gift cards, cash. Schedule each one to pop open on the exact day it'll land best. Birthdays, milestones, bad Mondays.",
    cta: "Build one now",
  },
  "cinematic-gold": {
    eyebrow: "Sealed until the right hour",
    headline: "Some letters are meant",
    accent: "for later.",
    subtitle:
      "A vault of moments — released only when the clock allows it. Slow open. Real weight. The thing your grandchildren would actually keep.",
    cta: "Begin the vault",
  },
  "minimalist-ink": {
    eyebrow: "Time-locked",
    headline: "A letter,",
    accent: "timed.",
    subtitle:
      "Seal a note, a photo, or a gift. Set the hour. Trust the silence until it opens.",
    cta: "Compose",
  },
};

const samples = [
  {
    key: "love-note",
    label: "Love note",
    node: (
      <TextNote
        html="<p>My love —</p><p>I wrote this on a Tuesday while you were reading on the couch. I just wanted you to know.</p><p>Always yours,<br/>M</p>"
      />
    ),
  },
  {
    key: "polaroid",
    label: "Polaroid",
    node: (
      <Polaroid
        src="https://images.unsplash.com/photo-1522441815192-d9f04eb0615c?w=600"
        caption="our day at the shore"
      />
    ),
  },
  {
    key: "giftcard",
    label: "Gift card",
    node: (
      <GiftCardReveal
        vendor="Amazon"
        code="AMZN-7KQ2-WX8L-MR44"
        note="For all those late-night cookbook finds."
        amount={{ amount: 50, currency: "USD" }}
      />
    ),
  },
  {
    key: "money",
    label: "Cash",
    node: (
      <MoneyBurst
        amount={20}
        currency="USD"
        instructions="Open when you're hungry and too tired to cook."
      />
    ),
  },
];

export function HeroDemo() {
  const [themeId, setThemeId] = useState<Theme["id"]>("warm-handmade");
  const [sampleIdx, setSampleIdx] = useState(0);
  const theme = useMemo(() => themeList.find((t) => t.id === themeId)!, [themeId]);
  const [designIdx, setDesignIdx] = useState(0);
  const design = theme.designs[designIdx % theme.designs.length];
  const [openKey, setOpenKey] = useState(0); // remount opener to reset

  // Re-run the hero reveal every time the theme changes so the new copy
  // slides in instead of hard-swapping.
  useEffect(() => {
    gsap.utils.toArray<HTMLElement>("[data-hero-float]").forEach((el, i) => {
      gsap.fromTo(
        el,
        { y: 22, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, delay: 0.05 + i * 0.07, ease: "power3.out", overwrite: true },
      );
    });
  }, [themeId]);

  const copy = heroCopy[themeId];

  return (
    <ThemeProvider themeId={themeId} as="section" className="paper grain relative overflow-hidden">
      <div id="demo" className="absolute -top-16" aria-hidden />
      <div
        className="relative mx-auto max-w-7xl px-6 pt-14 pb-10 md:pt-20"
        style={{ zIndex: 1 }}
      >
        {/* Section label */}
        <div className="mb-10 text-center">
          <div
            className="text-xs uppercase tracking-[0.22em] mb-2"
            style={{ color: "var(--color-muted)" }}
          >
            Make it yours
          </div>
          <h2
            className="font-display text-3xl md:text-4xl"
            style={{ color: "var(--color-ink)" }}
          >
            {copy.headline} <span style={{ color: "var(--color-accent)" }}>{copy.accent}</span>
          </h2>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12">

          {/* ── Left: pickers ────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Theme picker */}
            <div className="mt-8 flex flex-wrap gap-2">
              {themeList.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setThemeId(t.id); setDesignIdx(0); setOpenKey((k) => k + 1); }}
                  className="rounded-full px-3 py-1.5 text-xs border"
                  style={{
                    background: t.id === themeId ? "var(--color-ink)" : "transparent",
                    color: t.id === themeId ? "var(--color-bg)" : "var(--color-ink)",
                    borderColor: "var(--color-ink)",
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {/* Design picker */}
            <div className="mt-2 flex flex-wrap gap-2">
              {theme.designs.map((d, i) => (
                <button
                  key={d.id}
                  onClick={() => { setDesignIdx(i); setOpenKey((k) => k + 1); }}
                  className="rounded-full px-3 py-1 text-[11px]"
                  style={{
                    background: i === designIdx ? "var(--color-accent)" : "transparent",
                    color: i === designIdx ? "var(--color-bg)" : "var(--color-muted)",
                    border: "1px solid var(--color-muted)",
                  }}
                >
                  {d.name}
                </button>
              ))}
            </div>

            {/* Content picker */}
            <div className="mt-2 flex flex-wrap gap-2">
              {samples.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => { setSampleIdx(i); setOpenKey((k) => k + 1); }}
                  className="rounded-full px-3 py-1 text-[11px]"
                  style={{
                    background: i === sampleIdx ? "var(--color-seal)" : "transparent",
                    color: i === sampleIdx ? "var(--color-bg)" : "var(--color-muted)",
                    border: "1px dashed var(--color-muted)",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Right: envelope — large, square to match PNG aspect ratio ── */}
          <div className="flex-none mt-12 lg:mt-0 flex flex-col items-center">
            <EnvelopeOpener
              key={openKey}
              design={design}
              monogram=""
              width={480}
              height={480}
            >
              <div className="pt-4">{samples[sampleIdx].node}</div>
            </EnvelopeOpener>
            <div className="mt-2 text-center text-xs" style={{ color: "var(--color-muted)" }}>
              click the envelope to open it
            </div>
          </div>

        </div>
      </div>
    </ThemeProvider>
  );
}
