"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { PhotoEnvelope } from "@/components/envelope/PhotoEnvelope";
import type { EnvelopeDesign } from "@/lib/themes";
import { warmHandmade } from "@/lib/themes/warm-handmade";
import { modernPlayful } from "@/lib/themes/modern-playful";
import { cinematicGold } from "@/lib/themes/cinematic-gold";

/**
 * Scattered memory-wall collage flanking the hero.
 * pointer-events: none so the interactive demo stays fully clickable.
 * Hidden below lg breakpoint.
 */

// ─── Polaroid ────────────────────────────────────────────────────────────────
function MiniPolaroid({
  src,
  caption,
  imgW,
  imgH,
}: {
  src: string;
  caption: string;
  imgW: number;
  imgH: number;
}) {
  const totalW = imgW + 22;
  return (
    <div
      className="relative bg-white"
      style={{
        width: totalW,
        padding: "11px 11px 36px",
        boxShadow: "0 22px 38px rgba(40,24,8,0.3), 0 2px 6px rgba(0,0,0,0.12)",
      }}
    >
      {/* masking tape */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -11,
          left: "50%",
          width: 58,
          height: 18,
          transform: "translateX(-50%) rotate(-3deg)",
          background:
            "linear-gradient(180deg,rgba(255,246,210,0.92),rgba(236,218,148,0.88))",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      />
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
          filter: "saturate(0.86) contrast(1.06)",
        }}
      />
      <div
        className="absolute left-0 right-0 bottom-2 text-center font-hand"
        style={{ fontSize: 15, color: "#2a2a2a" }}
      >
        {caption}
      </div>
    </div>
  );
}

// ─── Envelope with a floating handwritten label ───────────────────────────────
function CollageEnvelope({
  design,
  w,
  h,
  label,
  labelSide = "bottom",
  monogram = "",
}: {
  design: EnvelopeDesign;
  w: number;
  h: number;
  label: string;
  labelSide?: "top" | "bottom" | "left";
  monogram?: string;
}) {
  return (
    <div className="relative" style={{ width: w }}>
      <PhotoEnvelope design={design} width={w} height={h} monogram={monogram} state="closed" />
      <div
        className="font-hand absolute"
        style={{
          fontSize: 14,
          color: "rgba(40,24,8,0.65)",
          whiteSpace: "nowrap",
          transform: "rotate(-2deg)",
          ...(labelSide === "bottom" && { bottom: -22, left: 10 }),
          ...(labelSide === "top" && { top: -20, left: 12 }),
          ...(labelSide === "left" && { top: "38%", left: -14, transform: "rotate(-90deg) translateX(-50%)" }),
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ─── Torn letter scrap ────────────────────────────────────────────────────────
function LetterScrap({ lines, w = 210 }: { lines: string[]; w?: number }) {
  return (
    <div
      className="font-hand relative px-5 py-4"
      style={{
        width: w,
        background: "#fbf3df",
        color: "rgba(40,24,8,0.76)",
        fontSize: 16,
        lineHeight: 1.4,
        boxShadow: "0 16px 28px rgba(40,24,8,0.22), 0 1px 2px rgba(0,0,0,0.07)",
        clipPath:
          "polygon(3% 5%, 97% 2%, 99% 97%, 93% 100%, 5% 99%, 1% 93%, 2% 7%)",
      }}
    >
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

// ─── Postage stamps ───────────────────────────────────────────────────────────
function PostageStamp({ label, tilt = 0 }: { label: string; tilt?: number }) {
  return (
    <div
      style={{
        width: 66,
        height: 80,
        padding: 5,
        transform: `rotate(${tilt}deg)`,
        background: "#fff",
        boxShadow: "0 8px 16px rgba(40,24,8,0.2)",
        backgroundImage:
          "radial-gradient(circle at 0 0,transparent 3px,white 3.5px)",
        backgroundSize: "10px 10px",
        backgroundPosition: "-5px -5px",
      }}
    >
      <div
        className="font-display flex h-full w-full items-center justify-center text-center"
        style={{
          border: "1.5px dashed var(--color-seal,#a02822)",
          color: "var(--color-seal,#a02822)",
          fontSize: 14,
          lineHeight: 1.1,
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ─── Ticket stub ──────────────────────────────────────────────────────────────
function TicketStub({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      style={{
        width: 192,
        filter: "drop-shadow(0 14px 20px rgba(40,24,8,0.24))",
      }}
    >
      <div
        className="flex items-stretch"
        style={{ background: "#faf1d8", border: "1px solid rgba(40,24,8,0.18)" }}
      >
        <div className="flex-1 px-3 py-3">
          <div className="font-display text-base leading-tight" style={{ color: "rgba(40,24,8,0.85)" }}>
            {title}
          </div>
          <div className="font-hand text-sm mt-0.5" style={{ color: "rgba(40,24,8,0.58)" }}>
            {subtitle}
          </div>
        </div>
        <div
          className="flex items-center justify-center px-2"
          style={{
            borderLeft: "1px dashed rgba(40,24,8,0.28)",
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontSize: 9,
            letterSpacing: "0.22em",
            color: "rgba(40,24,8,0.5)",
          }}
        >
          ADMIT ONE
        </div>
      </div>
    </div>
  );
}

// ─── Designs shorthand ────────────────────────────────────────────────────────
const d = {
  kraft: warmHandmade.designs[0],        // kraft-classic
  cream: warmHandmade.designs[1],        // cream-scallop
  sage: warmHandmade.designs[2],         // sage-botanical
  blush: warmHandmade.designs[3],        // blush-linen
  candy: modernPlayful.designs[0],       // candy-stripe
  midnight: cinematicGold.designs[0],    // cinematic-midnight
} as const;

// ─── Artifact definitions ─────────────────────────────────────────────────────
type Artifact = {
  key: string;
  side: "left" | "right";
  top: string;
  edge: string; // CSS value for left: or right:
  rotate: number;
  delay: number;
  depth: number;
  node: React.ReactNode;
};

const artifacts: Artifact[] = [
  // ── LEFT ──────────────────────────────────────────────────────────────────
  {
    key: "env-kraft",
    side: "left",
    top: "2%",
    edge: "-24px",
    rotate: -8,
    delay: 0.1,
    depth: 0.25,
    node: (
      <CollageEnvelope
        design={d.kraft}
        w={264}
        h={168}
        label="Open on 5 / 12"
        labelSide="bottom"
      />
    ),
  },
  {
    key: "p-candles",
    side: "left",
    top: "29%",
    edge: "14px",
    rotate: -4,
    delay: 0.3,
    depth: 0.5,
    node: (
      <MiniPolaroid
        src="https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=400&q=70&auto=format&fit=crop"
        caption="her 30th"
        imgW={134}
        imgH={178}
      />
    ),
  },
  {
    key: "scrap",
    side: "left",
    top: "51%",
    edge: "-6px",
    rotate: 3,
    delay: 0.55,
    depth: 0.6,
    node: (
      <LetterScrap lines={["…I wrote this on a", "Tuesday while you", "were reading.", "Just wanted you", "to know."]} />
    ),
  },
  {
    key: "p-shore",
    side: "left",
    top: "70%",
    edge: "18px",
    rotate: -7,
    delay: 0.75,
    depth: 0.35,
    node: (
      <MiniPolaroid
        src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=70&auto=format&fit=crop"
        caption="our anniversary"
        imgW={188}
        imgH={124}
      />
    ),
  },
  {
    key: "stamps",
    side: "left",
    top: "87%",
    edge: "28px",
    rotate: -11,
    delay: 0.9,
    depth: 0.2,
    node: (
      <div className="flex items-end gap-1.5">
        <PostageStamp label="love" tilt={-6} />
        <PostageStamp label="1¢" tilt={9} />
      </div>
    ),
  },

  // ── RIGHT ─────────────────────────────────────────────────────────────────
  {
    key: "p-couple",
    side: "right",
    top: "4%",
    edge: "10px",
    rotate: 9,
    delay: 0.2,
    depth: 0.45,
    node: (
      <MiniPolaroid
        src="https://images.unsplash.com/photo-1529636798458-92182e662485?w=400&q=70&auto=format&fit=crop"
        caption="the shore"
        imgW={122}
        imgH={162}
      />
    ),
  },
  {
    key: "env-blush",
    side: "right",
    top: "25%",
    edge: "-18px",
    rotate: 6,
    delay: 0.4,
    depth: 0.3,
    node: (
      <CollageEnvelope
        design={d.blush}
        w={250}
        h={158}
        label="when you miss me"
        labelSide="bottom"
      />
    ),
  },
  {
    key: "ticket",
    side: "right",
    top: "48%",
    edge: "22px",
    rotate: -5,
    delay: 0.65,
    depth: 0.4,
    node: <TicketStub title="Anniversary" subtitle="row 7, seat 12" />,
  },
  {
    key: "env-midnight",
    side: "right",
    top: "60%",
    edge: "-14px",
    rotate: 10,
    delay: 0.8,
    depth: 0.55,
    node: (
      <CollageEnvelope
        design={d.midnight}
        w={238}
        h={152}
        label="open when sad"
        labelSide="bottom"
      />
    ),
  },
  {
    key: "p-dog",
    side: "right",
    top: "79%",
    edge: "16px",
    rotate: 4,
    delay: 0.95,
    depth: 0.25,
    node: (
      <MiniPolaroid
        src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=70&auto=format&fit=crop"
        caption="goodest boy"
        imgW={140}
        imgH={140}
      />
    ),
  },
];

// ─── Main component ───────────────────────────────────────────────────────────
export function HeroCollage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const items = gsap.utils.toArray<HTMLElement>("[data-collage-item]", root);

    items.forEach((el) => {
      const side = el.dataset.side as "left" | "right";
      const delay = Number(el.dataset.delay ?? 0);
      const rot = Number(el.dataset.rotate ?? 0);
      gsap.fromTo(
        el,
        { x: side === "left" ? -80 : 80, y: -16, opacity: 0, rotate: rot + (side === "left" ? -14 : 14) },
        { x: 0, y: 0, opacity: 1, rotate: rot, duration: 1.2, delay: 0.15 + delay, ease: "power3.out" },
      );
    });

    const onScroll = () => {
      const rect = root.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
      items.forEach((el) => {
        const depth = Number(el.dataset.depth ?? 0.3);
        gsap.to(el, { y: -progress * 170 * depth, duration: 0.55, ease: "power2.out", overwrite: "auto" });
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-visible hidden lg:block"
      style={{ zIndex: 0 }}
    >
      {artifacts.map((a) => (
        <div
          key={a.key}
          data-collage-item
          data-side={a.side}
          data-delay={a.delay}
          data-rotate={a.rotate}
          data-depth={a.depth}
          className="absolute"
          style={{
            top: a.top,
            [a.side]: a.edge,
            willChange: "transform, opacity",
            rotate: `${a.rotate}deg`,
          }}
        >
          {a.node}
        </div>
      ))}
    </div>
  );
}
