"use client";

import { useEffect, useMemo, useState } from "react";
import { gsap } from "gsap";
import { themeList, type Theme } from "@/lib/themes";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { EnvelopeOpener } from "@/components/envelope/EnvelopeOpener";
import { TextNote } from "@/components/items/TextNote";
import { Polaroid } from "@/components/items/Polaroid";
import { GiftCardReveal } from "@/components/items/GiftCardReveal";
import { MoneyBurst } from "@/components/items/MoneyBurst";

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

  // subtle float on hero header
  useEffect(() => {
    gsap.utils.toArray<HTMLElement>("[data-hero-float]").forEach((el, i) => {
      gsap.fromTo(
        el,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, delay: 0.1 + i * 0.08, ease: "power3.out" },
      );
    });
  }, []);

  return (
    <ThemeProvider themeId={themeId} as="section" className="paper grain relative">
      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-24 md:pt-24">
        <div className="text-center">
          <h1
            data-hero-float
            className="font-display text-5xl md:text-7xl leading-[1.05]"
            style={{ color: "var(--color-ink)" }}
          >
            Letters that open
            <br />
            <span style={{ color: "var(--color-accent)" }}>when the moment does.</span>
          </h1>
          <p
            data-hero-float
            className="mx-auto mt-6 max-w-xl font-hand text-xl"
            style={{ color: "var(--color-muted)" }}
          >
            Bundle a stack of envelopes — each one locked to a date, a feeling, or a
            moment you know is coming. Tuck a photo, a song, a gift card, or a twenty inside.
            They&rsquo;ll open them when the time is right.
          </p>
          <div data-hero-float className="mt-8 flex justify-center gap-3">
            <a
              href="/create"
              className="rounded-full px-6 py-3 text-sm font-medium"
              style={{
                background: "var(--color-ink)",
                color: "var(--color-bg)",
              }}
            >
              Start a bundle
            </a>
            <a
              href="#how"
              className="rounded-full px-6 py-3 text-sm font-medium border"
              style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
            >
              See how it works
            </a>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-2">
          {themeList.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setThemeId(t.id);
                setDesignIdx(0);
                setOpenKey((k) => k + 1);
              }}
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

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {theme.designs.map((d, i) => (
            <button
              key={d.id}
              onClick={() => {
                setDesignIdx(i);
                setOpenKey((k) => k + 1);
              }}
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

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {samples.map((s, i) => (
            <button
              key={s.key}
              onClick={() => {
                setSampleIdx(i);
                setOpenKey((k) => k + 1);
              }}
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

        <div className="mt-10">
          <EnvelopeOpener
            key={openKey}
            design={design}
            monogram=""
            stampLabel="OPEN"
          >
            <div className="pt-4">{samples[sampleIdx].node}</div>
          </EnvelopeOpener>
          <div className="text-center mt-2 text-xs" style={{ color: "var(--color-muted)" }}>
            try different themes · envelopes · contents above
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
