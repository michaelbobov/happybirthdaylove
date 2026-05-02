"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PhotoEnvelope } from "@/components/envelope/PhotoEnvelope";
import { HeroCollage } from "@/components/landing/HeroCollage";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { warmHandmade } from "@/lib/themes/warm-handmade";

const design = warmHandmade.designs[0]; // kraft-classic
const ENV_W = 1100;
const ENV_H = 706;
const APEX_Y = 0.55; // flap seam as fraction of ENV_H

// Vertical chrome above + below the envelope. We budget for headline + subtitle + CTAs
// to be visible above the fold; the scroll hint sits just below and is found on scroll.
const CHROME_Y = 380;
const SIDE_GUTTER = 32;

// Polaroid definitions — images, captions, and scatter destinations
const POLAROIDS = [
  {
    key: "p1",
    src: "https://images.unsplash.com/photo-1529636798458-92182e662485?w=600&q=75&auto=format&fit=crop",
    caption: "the shore",
    imgW: 160,
    imgH: 210,
    // final scatter: relative to starting point (top of flap seam, horizontally centered)
    toX: -288,
    toY: -325,
    toRot: -14,
  },
  {
    key: "p2",
    src: "https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=600&q=75&auto=format&fit=crop",
    caption: "always yours",
    imgW: 190,
    imgH: 150,
    toX: 12,
    toY: -362,
    toRot: 2,
  },
  {
    key: "p3",
    src: "https://images.unsplash.com/photo-1522441815192-d9f04eb0615c?w=600&q=75&auto=format&fit=crop",
    caption: "our anniversary",
    imgW: 158,
    imgH: 205,
    toX: 300,
    toY: -319,
    toRot: 16,
  },
] as const;

// Polaroid card component (self-contained, no GSAP — parent handles animation)
function ScatterPolaroid({
  src,
  caption,
  imgW,
  imgH,
  dataKey,
}: {
  src: string;
  caption: string;
  imgW: number;
  imgH: number;
  dataKey: string;
}) {
  const cardW = imgW + 22;
  return (
    <div
      data-polaroid={dataKey}
      style={{
        position: "absolute",
        // centered at the flap seam so GSAP x/y is purely for scatter
        top: ENV_H * APEX_Y - 10,
        left: `calc(50% - ${cardW / 2}px)`,
        width: cardW,
        zIndex: 10,
        pointerEvents: "none",
        willChange: "transform, opacity",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "11px 11px 40px",
          boxShadow: "0 24px 48px rgba(40,24,8,0.34), 0 4px 8px rgba(0,0,0,0.14)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          loading="lazy"
          draggable={false}
          style={{
            display: "block",
            width: imgW,
            height: imgH,
            objectFit: "cover",
            filter: "saturate(0.88) contrast(1.05)",
          }}
        />
        <div
          className="font-hand"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 8,
            textAlign: "center",
            fontSize: 16,
            color: "#2a2a2a",
          }}
        >
          {caption}
        </div>
      </div>
    </div>
  );
}

export function HeroScroll() {
  const outerRef = useRef<HTMLDivElement>(null);
  const envelopeWrapRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const scrollArrowRef = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const sx = (vw - SIDE_GUTTER * 2) / ENV_W;
      const sy = (vh - CHROME_Y) / ENV_H;
      setScale(Math.max(0.42, Math.min(1, sx, sy)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const outer = outerRef.current;
    const wrap = envelopeWrapRef.current;
    if (!outer || !wrap) return;

    const flap = wrap.querySelector<HTMLElement>(".env-flap");
    const flapSeal = wrap.querySelector<Element>(".env-flap-seal");
    const seal = wrap.querySelector<Element>(".wax-seal");
    const peek = wrap.querySelector<HTMLElement>(".env-peek");
    const address = addressRef.current;
    const polaroids = POLAROIDS.map((p) =>
      wrap.querySelector<HTMLElement>(`[data-polaroid="${p.key}"]`),
    );

    // Entrance animations (one-shot on mount)
    gsap.fromTo(
      gsap.utils.toArray<HTMLElement>("[data-scroll-enter]", outer),
      { y: 28, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.95, stagger: 0.1, ease: "power3.out", delay: 0.1 },
    );
    gsap.fromTo(
      wrap,
      { y: 55, opacity: 0, scale: 0.94 },
      { y: 0, opacity: 1, scale: 1, duration: 1.15, delay: 0.4, ease: "back.out(1.1)" },
    );
    if (address) {
      const addressInner = address.querySelector<HTMLElement>("[data-address-text]");
      gsap.fromTo(
        address,
        { opacity: 1 },
        { opacity: 1, duration: 0.1 },
      );
      if (addressInner) {
        gsap.fromTo(
          addressInner,
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", duration: 1.05, ease: "power2.out", delay: 0.95 },
        );
      }
    }

    // Set polaroids' initial GSAP state (stacked inside the envelope, invisible)
    polaroids.forEach((el) => {
      if (el) gsap.set(el, { y: ENV_H * 0.12, x: 0, opacity: 0, rotation: 0, scale: 0.88 });
    });

    // Scroll-scrubbed timeline ──────────────────────────────────────────────
    // Items emerge one at a time so each gets its own "beat" of scroll.
    // Total timeline is spread across a larger scroll distance (end: "+=140%").
    const tl = gsap.timeline();

    // Act 1 — envelope opens
    if (seal && !flapSeal) {
      tl.to(seal, { scale: 1.08, transformOrigin: "center", duration: 0.1 }, 0)
        .to(seal, { scale: 0, rotation: 22, opacity: 0, duration: 0.22, ease: "power2.in" }, 0.1);
    }
    if (flapSeal) {
      tl.set(flapSeal, { zIndex: 4 }, 0.12);
    }
    const flapTargets = [flap, flapSeal].filter(Boolean) as Element[];
    if (flapTargets.length > 0) {
      tl.to(flapTargets, { rotationX: -175, transformPerspective: 900, duration: 0.55 }, 0.08);
    }
    if (address) {
      tl.to(address, { opacity: 0, duration: 0.2 }, 0.34);
    }
    // Act 2 — letter comes out first
    if (peek) {
      tl.fromTo(
        peek,
        { opacity: 0, y: ENV_H * 0.1 },
        { opacity: 1, y: -ENV_H * 0.34, duration: 0.3 },
        0.52,
      );
    }

    // Acts 3-5 — polaroids emerge one by one with clear gaps between each
    polaroids.forEach((el, i) => {
      if (!el) return;
      const { toX, toY, toRot } = POLAROIDS[i];
      tl.to(
        el,
        { x: toX, y: toY, opacity: 1, rotation: toRot, scale: 1, duration: 0.28, ease: "back.out(1.5)" },
        1.02 + i * 0.26, // each polaroid gets its own scroll window, well separated
      );
    });

    const trigger = ScrollTrigger.create({
      animation: tl,
      trigger: outer,
      start: "top top",
      end: "+=160%", // more scroll room so each item gets a clear beat
      pin: true,
      scrub: 1.4,
      anticipatePin: 1,
    });

    return () => { trigger.kill(); };
  }, []);

  useEffect(() => {
    const arrow = scrollArrowRef.current;
    if (!arrow) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const paths = gsap.utils.toArray<SVGPathElement>("path", arrow);
    const ctx = gsap.context(() => {
      paths.forEach((path) => {
        const length = path.getTotalLength();
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
        });
      });

      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.35 });
      tl.to(paths, {
        strokeDashoffset: 0,
        duration: 0.75,
        ease: "power2.out",
        stagger: 0.12,
      })
        .to({}, { duration: 0.8 })
        .set(paths, {
          strokeDashoffset: (_i, target) => (target as SVGPathElement).getTotalLength(),
        });
    }, arrow);

    return () => ctx.revert();
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
        <HeroAmbient />

        <div
          className="relative flex flex-col items-center px-6 pb-6 pt-20 md:pt-24"
          style={{ zIndex: 1 }}
        >
          {/* ── Headline ───────────────────────────────────────────────── */}
          <div className="relative mt-4 md:mt-5" style={{ top: 30 }}>
            <h1
              data-scroll-enter
              className="relative max-w-2xl text-center font-display text-3xl leading-[1.06] md:text-5xl"
              style={{
                color: "rgba(74,52,34,0.82)",
              }}
            >
              Send a little love for later.
            </h1>
          </div>

          {/* ── Huge envelope — the centerpiece (responsive scaler) ──── */}
          <div
            className="-mt-7 md:-mt-7"
            style={{
              width: ENV_W * scale,
              height: ENV_H * scale,
              position: "relative",
            }}
          >
            <div
              style={{
                width: ENV_W,
                height: ENV_H,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <div
                ref={envelopeWrapRef}
                className="envelope-shadow"
                style={{
                  position: "relative",
                  perspective: 1400,
                  transformStyle: "preserve-3d",
                  width: ENV_W,
                  height: ENV_H,
                }}
              >
            <PhotoEnvelope design={design} width={ENV_W} height={ENV_H} state="closed">
              {/* Letter note that peeks out when flap opens */}
              <div
                style={{
                  overflow: "hidden",
                  height: "100%",
                  padding: "14px 28px 0",
                  fontFamily: "var(--font-hand-warm)",
                  color: "#3b2a1e",
                  fontSize: 17,
                  lineHeight: 1.6,
                }}
              >
                <p>My love —</p>
                <p style={{ marginTop: 8 }}>
                  I wrote this for the days<br />I can&rsquo;t be there.
                </p>
              </div>
            </PhotoEnvelope>

            {/* Address on the envelope face — fades when contents emerge */}
            <div
              ref={addressRef}
              style={{
                position: "absolute",
                top: ENV_H * (APEX_Y + 0.1),
                left: "50%",
                transform: "translateX(-50%) rotate(-1deg)",
                textAlign: "center",
                fontFamily: "var(--font-hand-warm)",
                color: "rgba(40,24,8,0.6)",
                fontSize: 24,
                lineHeight: 1.55,
                pointerEvents: "none",
                whiteSpace: "nowrap",
              }}
            >
              <span data-address-text style={{ display: "inline-block" }}>
                Open when you miss me.
              </span>
            </div>

            {/* Polaroids — stacked at flap seam, scatter outward on scroll */}
            {POLAROIDS.map((p) => (
              <ScatterPolaroid
                key={p.key}
                dataKey={p.key}
                src={p.src}
                caption={p.caption}
                imgW={p.imgW}
                imgH={p.imgH}
              />
            ))}
              </div>
            </div>
          </div>

          {/* ── CTAs below the envelope ──────────────────────────────── */}
          <p
            data-scroll-enter
            className="-mt-14 text-center font-hand text-base md:-mt-12 md:text-lg"
            style={{ color: "rgba(139,116,85,0.82)" }}
          >
            Seal a memory now. Let them open it later.
          </p>

          <div data-scroll-enter className="mt-2 flex flex-wrap items-center justify-center gap-2.5">
            <a
              href="/create"
              className="group inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition-transform active:translate-y-[1px] sm:px-6 sm:py-3"
              style={{
                background: "var(--color-ink)",
                color: "var(--color-bg)",
                boxShadow: "0 2px 0 rgba(0,0,0,0.15), 0 12px 24px var(--color-shadow)",
              }}
            >
              Create a Bundle
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
            </a>
            <a
              href="#demo"
              className="whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-medium transition-colors sm:px-6 sm:py-3"
              style={{
                borderColor: "rgba(139,116,85,0.45)",
                color: "var(--color-muted)",
                background: "rgba(255,255,255,0.32)",
              }}
            >
              Preview the Magic
            </a>
          </div>

          <div
            ref={scrollHintRef}
            className="hero-scroll-hint mt-2.5 flex min-w-28 flex-col items-center gap-0.5 whitespace-nowrap font-hand"
            style={{ color: "rgba(160,40,34,0.58)" }}
          >
            <span className="hidden sm:inline" style={{ fontSize: 15 }}>scroll to open</span>
            <span className="sm:hidden" style={{ fontSize: 15 }}>scroll ↓</span>
            <svg ref={scrollArrowRef} width="20" height="30" viewBox="0 0 22 34" fill="none" aria-hidden="true">
              <path
                d="M11 2 C 9 10, 13 18, 11 28"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M5 22 L 11 30 L 17 22"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
        </div>
        <style jsx>{`
          .hero-scroll-hint svg {
            overflow: visible;
          }

          @media (prefers-reduced-motion: reduce) {
            .hero-scroll-hint svg {
              animation: none;
            }
          }
        `}</style>
      </ThemeProvider>
    </div>
  );
}

// ─── Hero stamp (stamp1.png) + cancellation mark, pinned to envelope top-right
// The kraft envelope PNG (1024x1024) gets object-fit:contain inside our 1100x706
// wrap, so the *visible* envelope sits in roughly x:239–861, y:148–549 of the wrap.
// We position relative to those visible bounds, not the wrap's outer rectangle.
function HeroStamp() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 175,
        right: 265,
        zIndex: 5,
        pointerEvents: "none",
        transform: "rotate(7deg)",
      }}
    >
      {/* Cancellation rings — small, contained to stay within the envelope face */}
      <div
        style={{
          position: "absolute",
          top: 26,
          left: -28,
          width: 88,
          height: 88,
          border: "1.5px solid var(--color-seal)",
          borderRadius: "50%",
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 36,
          left: -16,
          width: 68,
          height: 68,
          border: "1px dashed var(--color-seal)",
          borderRadius: "50%",
          opacity: 0.45,
        }}
      />
      {/* The actual stamp asset */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/stamp1.png"
        alt=""
        draggable={false}
        style={{
          position: "relative",
          width: 110,
          height: "auto",
          display: "block",
          filter: "drop-shadow(0 8px 14px rgba(40,24,8,0.32))",
        }}
      />
    </div>
  );
}

// ─── Ambient decor (airmail edges, par avion, specks) ─────────────────────────
function HeroAmbient() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Soft halo behind the centerpiece */}
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: 980,
          height: 980,
          transform: "translate(-50%, -42%)",
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0.45), transparent 70%)",
          filter: "blur(10px)",
        }}
      />

      {/* Airmail diagonal edge stripes */}
      <div
        className="absolute left-0 top-0 h-full w-3 hidden md:block"
        style={{
          background:
            "repeating-linear-gradient(135deg, var(--color-seal) 0 10px, transparent 10px 18px, #2c4a86 18px 28px, transparent 28px 36px)",
          opacity: 0.45,
        }}
      />
      <div
        className="absolute right-0 top-0 h-full w-3 hidden md:block"
        style={{
          background:
            "repeating-linear-gradient(135deg, var(--color-seal) 0 10px, transparent 10px 18px, #2c4a86 18px 28px, transparent 28px 36px)",
          opacity: 0.45,
        }}
      />

      {/* Bottom-left date postmark — round with concentric ring */}
      <div
        className="absolute hidden md:flex flex-col items-center justify-center rounded-full"
        style={{
          bottom: 36,
          left: 36,
          width: 92,
          height: 92,
          transform: "rotate(-8deg)",
          border: "1.5px solid var(--color-seal)",
          color: "var(--color-seal)",
          background: "rgba(246,236,217,0.35)",
          fontFamily: "var(--font-display-warm)",
          opacity: 0.85,
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Enveloped
        </div>
        <div style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>2026</div>
        <div style={{ fontSize: 9, letterSpacing: "0.22em", marginTop: 2, opacity: 0.7 }}>
          · APR ·
        </div>
      </div>

      {/* Scattered confetti specks across the hero */}
      {[
        { top: "12%", left: "32%", color: "var(--color-seal)", size: 7 },
        { top: "18%", right: "30%", color: "var(--color-accent)", size: 6 },
        { top: "70%", left: "26%", color: "var(--color-accent)", size: 6 },
        { top: "78%", right: "28%", color: "var(--color-seal)", size: 7 },
        { top: "44%", left: "4%", color: "var(--color-muted)", size: 5 },
        { top: "52%", right: "4%", color: "var(--color-muted)", size: 5 },
      ].map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            top: s.top,
            left: s.left,
            right: s.right,
            width: s.size,
            height: s.size,
            background: s.color,
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  );
}
