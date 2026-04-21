"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PhotoEnvelope } from "@/components/envelope/PhotoEnvelope";
import { HeroCollage } from "@/components/landing/HeroCollage";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { warmHandmade } from "@/lib/themes/warm-handmade";

const design = warmHandmade.designs[0]; // kraft-classic
const ENV_W = 760;
const ENV_H = 488;

// Where the flap apex sits as a fraction of ENV_H (PhotoEnvelope default apexY).
// The face address text sits in the body below this line.
const APEX_Y = 0.55;

export function HeroScroll() {
  const outerRef = useRef<HTMLDivElement>(null);
  const envelopeWrapRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const outer = outerRef.current;
    const wrap = envelopeWrapRef.current;
    if (!outer || !wrap) return;

    const flap = wrap.querySelector<HTMLElement>(".env-flap");
    const seal = wrap.querySelector<Element>(".wax-seal");
    const peek = wrap.querySelector<HTMLElement>(".env-peek");
    const address = addressRef.current;

    // Entrance
    gsap.fromTo(
      gsap.utils.toArray<HTMLElement>("[data-scroll-enter]", outer),
      { y: 32, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: "power3.out", delay: 0.12 },
    );
    gsap.fromTo(
      wrap,
      { y: 60, opacity: 0, scale: 0.93 },
      { y: 0, opacity: 1, scale: 1, duration: 1.2, delay: 0.45, ease: "back.out(1.15)" },
    );

    const tl = gsap.timeline();

    // 1. Seal cracks and vanishes
    if (seal) {
      tl.to(seal, { scale: 1.08, transformOrigin: "center", duration: 0.1 }, 0)
        .to(seal, { scale: 0, rotation: 22, opacity: 0, duration: 0.22, ease: "power2.in" }, 0.1);
    }

    // 2. Flap lifts open
    if (flap) {
      tl.to(flap, { rotationX: -175, transformPerspective: 900, duration: 0.58 }, 0.08);
    }

    // 3. Address text on envelope face fades as the letter rises over it
    if (address) {
      tl.to(address, { opacity: 0, duration: 0.28 }, 0.38);
    }

    // 4. Note rises dramatically from inside — travels ~38% of envelope height upward
    if (peek) {
      tl.fromTo(
        peek,
        { opacity: 0, y: ENV_H * 0.08 },
        { opacity: 1, y: -ENV_H * 0.35, duration: 0.46 },
        0.46,
      );
    }

    // 5. Scroll hint fades immediately
    if (scrollHintRef.current) {
      tl.to(scrollHintRef.current, { opacity: 0, y: -8, duration: 0.18 }, 0);
    }

    const trigger = ScrollTrigger.create({
      animation: tl,
      trigger: outer,
      start: "top top",
      end: "+=90%",
      pin: true,
      scrub: 1.6,
      anticipatePin: 1,
    });

    return () => { trigger.kill(); };
  }, []);

  return (
    <div ref={outerRef} className="relative" style={{ minHeight: "100vh" }}>
      <ThemeProvider
        themeId="warm-handmade"
        as="section"
        className="paper grain relative overflow-x-hidden"
        style={{ minHeight: "100vh" }}
      >
        <HeroCollage />

        <div
          className="relative flex flex-col items-center px-6 pt-16 pb-10 md:pt-20"
          style={{ zIndex: 1 }}
        >
          {/* ── Copy ─────────────────────────────────────────────────────── */}
          <div
            data-scroll-enter
            className="text-xs uppercase tracking-[0.22em] mb-4"
            style={{ color: "var(--color-muted)" }}
          >
            A letter, kept safe
          </div>

          <h1
            data-scroll-enter
            className="font-display text-5xl md:text-7xl leading-[1.04] text-center"
            style={{ color: "var(--color-ink)" }}
          >
            Letters that open
            <br />
            <span style={{ color: "var(--color-accent)" }}>when the moment does.</span>
          </h1>

          <p
            data-scroll-enter
            className="mt-5 max-w-lg text-center font-hand text-xl"
            style={{ color: "var(--color-muted)" }}
          >
            Tuck a photo, a song, a twenty, or a whole year of love into envelopes.
            Each one waits for its day — then opens like it was always meant to.
          </p>

          <div data-scroll-enter className="mt-7 flex flex-wrap justify-center gap-3">
            <a
              href="/create"
              className="rounded-full px-6 py-3 text-sm font-medium"
              style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
            >
              Start a bundle
            </a>
            <a
              href="#demo"
              className="rounded-full px-6 py-3 text-sm font-medium border"
              style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
            >
              Try it yourself
            </a>
          </div>

          <div
            ref={scrollHintRef}
            className="mt-5 text-xs uppercase tracking-[0.2em]"
            style={{ color: "var(--color-muted)" }}
          >
            scroll to open ↓
          </div>

          {/* ── Huge envelope ────────────────────────────────────────────── */}
          <div
            ref={envelopeWrapRef}
            className="mt-8 envelope-shadow"
            style={{
              position: "relative",
              perspective: 1400,
              transformStyle: "preserve-3d",
              width: ENV_W,
            }}
          >
            <PhotoEnvelope design={design} width={ENV_W} height={ENV_H} state="closed">
              {/*
               * Note that rises from inside the envelope.
               * overflow: hidden keeps text on the lined-paper peek.
               * Content is intentionally short so it fits the peek height.
               */}
              <div
                style={{
                  overflow: "hidden",
                  height: "100%",
                  padding: "16px 26px 0",
                  fontFamily: "var(--font-hand-warm)",
                  color: "#3b2a1e",
                  fontSize: 16,
                  lineHeight: 1.6,
                }}
              >
                <p>My love —</p>
                <p style={{ marginTop: 8 }}>
                  I wrote this for the days<br />I can&rsquo;t be there.
                </p>
                <p style={{ marginTop: 8 }}>
                  This is for you.
                </p>
              </div>
            </PhotoEnvelope>

            {/*
             * Address written on the envelope face — visible on the closed
             * envelope, fades out as the letter rises and covers it.
             * Positioned in the body area below the flap seam (APEX_Y).
             */}
            <div
              ref={addressRef}
              style={{
                position: "absolute",
                top: ENV_H * (APEX_Y + 0.1),
                left: "50%",
                transform: "translateX(-50%) rotate(-1deg)",
                textAlign: "center",
                fontFamily: "var(--font-hand-warm)",
                color: "rgba(40,24,8,0.62)",
                fontSize: 22,
                lineHeight: 1.55,
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              Open on our anniversary.
              <br />
              <span style={{ fontSize: 18, opacity: 0.75 }}>Open when you need it most.</span>
            </div>
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
