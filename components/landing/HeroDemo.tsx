"use client";

import { useEffect, useMemo, useState } from "react";
import { gsap } from "gsap";
import { themeList, type Theme } from "@/lib/themes";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { EnvelopeOpener } from "@/components/envelope/EnvelopeOpener";
import { Polaroid } from "@/components/items/Polaroid";
import { GiftCardReveal } from "@/components/items/GiftCardReveal";
import { MoneyBurst } from "@/components/items/MoneyBurst";

function PreviewLetterPeek() {
  return (
    <div
      style={{
        height: "100%",
        overflow: "hidden",
        padding: "14px 22px 0",
        fontFamily: "var(--font-hand-warm)",
        color: "#3b2a1e",
        fontSize: 15,
        lineHeight: 1.58,
      }}
    >
      <p>My love —</p>
      <p style={{ marginTop: 8 }}>
        I wrote this for the days<br />I can&rsquo;t be there.
      </p>
      <p style={{ marginTop: 8 }}>Always yours, M</p>
    </div>
  );
}

const samples = [
  {
    key: "love-note",
    label: "Love note",
    node: <PreviewLetterPeek />,
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

  return (
    <ThemeProvider themeId={themeId} as="section" className="paper grain relative overflow-hidden">
      <div id="demo" className="absolute -top-16" aria-hidden />
      <CustomizationAmbient />
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
            Build the moment, then open it.
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

            {/* Content picker */}
            <p className="mt-5 max-w-md text-sm font-hand" style={{ color: "var(--color-muted)" }}>
              Pick what&rsquo;s inside, then click the envelope to open it.
            </p>
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
              sealImageUrl="/images/seal.png"
              inlineReveal={samples[sampleIdx].key === "love-note"}
            >
              <div className={samples[sampleIdx].key === "love-note" ? "" : "pt-4"}>
                {samples[sampleIdx].node}
              </div>
            </EnvelopeOpener>
          </div>

        </div>
      </div>
    </ThemeProvider>
  );
}

function CustomizationAmbient() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <svg
        className="absolute hidden md:block"
        width="520"
        height="220"
        viewBox="0 0 520 220"
        fill="none"
        style={{ left: "4%", top: 72, opacity: 0.38 }}
      >
        <path
          d="M18 174 C 100 54, 178 220, 264 112 S 430 28, 500 116"
          stroke="var(--color-seal)"
          strokeWidth="2"
          strokeDasharray="7 10"
          strokeLinecap="round"
        />
        <path
          d="M486 100 L 506 116 L 482 124"
          stroke="var(--color-seal)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div
        className="absolute hidden md:block"
        style={{
          right: "7%",
          top: 84,
          width: 128,
          height: 128,
          border: "1.5px solid var(--color-seal)",
          borderRadius: "50%",
          opacity: 0.36,
          transform: "rotate(12deg)",
        }}
      />
      <div
        className="absolute hidden md:block"
        style={{
          right: "8.1%",
          top: 99,
          width: 96,
          height: 96,
          border: "1px dashed var(--color-seal)",
          borderRadius: "50%",
          opacity: 0.32,
          transform: "rotate(12deg)",
        }}
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/stamp1.png"
        alt=""
        draggable={false}
        className="absolute hidden md:block"
        style={{
          right: "10%",
          top: 116,
          width: 86,
          transform: "rotate(9deg)",
          opacity: 0.78,
          filter: "drop-shadow(0 10px 18px rgba(40,24,8,0.18))",
        }}
      />

      <div
        className="absolute hidden lg:block"
        style={{
          left: "7%",
          bottom: 48,
          width: 156,
          height: 78,
          borderRadius: 16,
          border: "1px solid rgba(139,116,85,0.35)",
          background: "rgba(255,255,255,0.24)",
          transform: "rotate(-8deg)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
        }}
      >
        <div style={{ position: "absolute", inset: 10, border: "1px dashed rgba(160,40,34,0.4)", borderRadius: 11 }} />
        <div
          className="font-hand"
          style={{
            position: "absolute",
            left: 22,
            top: 22,
            color: "rgba(74,52,34,0.45)",
            fontSize: 18,
          }}
        >
          tiny details
        </div>
      </div>

      {[
        { top: "16%", left: "22%", color: "var(--color-accent)", size: 6 },
        { top: "28%", right: "24%", color: "var(--color-seal)", size: 7 },
        { bottom: "20%", left: "34%", color: "var(--color-seal)", size: 5 },
        { bottom: "15%", right: "31%", color: "var(--color-accent)", size: 6 },
        { top: "52%", left: "3%", color: "var(--color-muted)", size: 5 },
        { top: "64%", right: "4%", color: "var(--color-muted)", size: 5 },
      ].map((speck, index) => (
        <div
          key={index}
          className="absolute rounded-full"
          style={{
            top: speck.top,
            bottom: speck.bottom,
            left: speck.left,
            right: speck.right,
            width: speck.size,
            height: speck.size,
            background: speck.color,
            opacity: 0.42,
          }}
        />
      ))}
    </div>
  );
}
