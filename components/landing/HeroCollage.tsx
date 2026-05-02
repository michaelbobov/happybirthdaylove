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

// ─── Envelope with the label written ON the face ─────────────────────────────
function CollageEnvelope({
  design,
  w,
  h,
  label,
  monogram = "",
}: {
  design: EnvelopeDesign;
  w: number;
  h: number;
  label: string;
  labelSide?: "top" | "bottom" | "left"; // legacy, ignored
  monogram?: string;
}) {
  return (
    <div className="relative" style={{ width: w, height: h }}>
      <PhotoEnvelope design={design} width={w} height={h} monogram={monogram} state="closed" />
      {/* Address line written ON the envelope face, like a real letter */}
      <div
        className="font-hand absolute pointer-events-none"
        style={{
          left: "50%",
          top: h * 0.66,
          transform: "translateX(-50%) rotate(-1.5deg)",
          fontSize: Math.round(w * 0.062),
          color: "rgba(40,24,8,0.7)",
          whiteSpace: "nowrap",
          textAlign: "center",
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

// ─── Real ticket image (ticket.png) ───────────────────────────────────────────
function TicketImage({ w = 200 }: { w?: number }) {
  const pinW = Math.max(28, Math.min(46, w * 0.14));
  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        width: w,
        display: "block",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/ticket.png"
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          filter: "drop-shadow(0 14px 22px rgba(40,24,8,0.28))",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/pin.png"
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          width: pinW,
          height: "auto",
          left: w * 0.045,
          top: w * 0.035,
          transform: "rotate(-16deg)",
          transformOrigin: "50% 82%",
          filter: "drop-shadow(0 5px 7px rgba(8,18,45,0.24))",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ─── Postage stamp asset (stamp1.png) for use on collage items ────────────────
function StampImage({ w = 60 }: { w?: number }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/images/stamp1.png"
      alt=""
      draggable={false}
      style={{
        width: w,
        height: "auto",
        display: "block",
        filter: "drop-shadow(0 6px 10px rgba(40,24,8,0.32))",
      }}
    />
  );
}

// ─── Ticket stub (now styled like an airmail boarding pass) ───────────────────
function TicketStub({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      style={{
        width: 200,
        filter: "drop-shadow(0 14px 20px rgba(40,24,8,0.24))",
      }}
    >
      <div
        style={{
          background: "#faf1d8",
          border: "1px solid rgba(40,24,8,0.18)",
        }}
      >
        {/* Airmail diagonal stripe band */}
        <div
          style={{
            height: 8,
            background:
              "repeating-linear-gradient(135deg, var(--color-seal) 0 6px, transparent 6px 11px, #2c4a86 11px 17px, transparent 17px 22px)",
            opacity: 0.7,
          }}
        />
        <div className="flex items-stretch">
          <div className="flex-1 px-3 py-2">
            <div
              style={{
                fontSize: 8,
                letterSpacing: "0.24em",
                color: "var(--color-seal)",
                fontWeight: 600,
              }}
            >
              ✈ PAR AVION
            </div>
            <div
              className="font-display text-base leading-tight mt-0.5"
              style={{ color: "rgba(40,24,8,0.85)" }}
            >
              {title}
            </div>
            <div
              className="font-hand text-sm mt-0.5"
              style={{ color: "rgba(40,24,8,0.58)" }}
            >
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
            BOARDING · 5 / 12
          </div>
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

// ─── Tiny accent pieces ───────────────────────────────────────────────────────
function WashiTape({
  w = 70,
  tilt = 0,
  variant = "gold",
}: {
  w?: number;
  tilt?: number;
  variant?: "gold" | "rose" | "sage";
}) {
  const bg =
    variant === "gold"
      ? "linear-gradient(180deg,rgba(255,246,210,0.92),rgba(236,218,148,0.88))"
      : variant === "rose"
      ? "linear-gradient(180deg,rgba(248,210,210,0.95),rgba(228,168,168,0.9))"
      : "linear-gradient(180deg,rgba(214,228,200,0.95),rgba(170,196,150,0.9))";
  return (
    <div
      style={{
        width: w,
        height: 22,
        background: bg,
        transform: `rotate(${tilt}deg)`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
      }}
    />
  );
}

function Paperclip({ tilt = 0 }: { tilt?: number }) {
  return (
    <svg
      width="28"
      height="60"
      viewBox="0 0 28 60"
      fill="none"
      style={{ transform: `rotate(${tilt}deg)`, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.25))" }}
      aria-hidden="true"
    >
      <path
        d="M9 4 a 5 5 0 0 1 10 0 v 42 a 9 9 0 0 1 -18 0 v -34 a 5 5 0 0 1 10 0 v 30"
        stroke="#9aa1a6"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function HeartSticker({ size = 28, tilt = 0 }: { size?: number; tilt?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        transform: `rotate(${tilt}deg)`,
        filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.18))",
      }}
    >
      <svg viewBox="0 0 24 24" fill="var(--color-seal,#a02822)">
        <path d="M12 21s-7-4.5-9.5-9.2C.7 8.4 2.5 4 6.4 4c2 0 3.5 1.1 5.6 3.3C14.1 5.1 15.6 4 17.6 4c3.9 0 5.7 4.4 3.9 7.8C19 16.5 12 21 12 21z" />
      </svg>
    </div>
  );
}

function Pushpin({ color = "#c0392b" }: { color?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <defs>
        <radialGradient id={`pin-${color}`} cx="35%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="35%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      {/* shadow on board */}
      <ellipse cx="13" cy="18" rx="6" ry="1.6" fill="rgba(0,0,0,0.28)" />
      {/* dome */}
      <circle cx="11" cy="10" r="7.2" fill={`url(#pin-${color})`} />
      <circle cx="8.5" cy="7.5" r="1.6" fill="rgba(255,255,255,0.7)" />
    </svg>
  );
}

function BackboardScribble({
  text,
  size = 28,
  tilt = 0,
}: {
  text: string;
  size?: number;
  tilt?: number;
}) {
  return (
    <div
      className="font-hand select-none"
      style={{
        fontSize: size,
        color: "rgba(40,24,8,0.15)",
        transform: `rotate(${tilt}deg)`,
        whiteSpace: "nowrap",
        letterSpacing: "0.02em",
      }}
    >
      {text}
    </div>
  );
}

function BackboardCircle({
  size = 220,
  text,
  innerText,
  tilt = 0,
}: {
  size?: number;
  text?: string;
  innerText?: string;
  tilt?: number;
}) {
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  return (
    <div
      style={{
        width: size,
        height: size,
        transform: `rotate(${tilt}deg)`,
        opacity: 0.18,
        color: "var(--color-seal,#a02822)",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Outer dashed ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 5"
        />
        {/* Inner solid hairline ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r - 18}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.7"
        />
        {/* Curved text along upper arc */}
        {text && (
          <>
            <defs>
              <path
                id={`arc-${size}-${text}`}
                d={`M ${size / 2 - r + 12} ${size / 2} a ${r - 12} ${r - 12} 0 0 1 ${(r - 12) * 2} 0`}
              />
            </defs>
            <text
              fontFamily="var(--font-display-warm, Caveat, cursive)"
              fontSize={size * 0.07}
              letterSpacing={size * 0.02}
              fill="currentColor"
            >
              <textPath href={`#arc-${size}-${text}`} startOffset="50%" textAnchor="middle">
                {text}
              </textPath>
            </text>
          </>
        )}
        {/* Center */}
        {innerText && (
          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            fontFamily="var(--font-display-warm, Caveat, cursive)"
            fontSize={size * 0.18}
            fill="currentColor"
          >
            {innerText}
          </text>
        )}
        {/* Diagonal cancellation lines */}
        <line
          x1={size * 0.18}
          y1={size * 0.62}
          x2={size * 0.82}
          y2={size * 0.6}
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.6"
        />
        <line
          x1={size * 0.18}
          y1={size * 0.7}
          x2={size * 0.82}
          y2={size * 0.68}
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.4"
        />
      </svg>
    </div>
  );
}

function TackHole() {
  return (
    <div
      style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 35% 35%, rgba(60,40,20,0.5), rgba(20,10,5,0.85))",
        boxShadow:
          "inset 0 1px 1px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.3)",
        opacity: 0.55,
      }}
    />
  );
}

function TwineBow({ tilt = 0 }: { tilt?: number }) {
  return (
    <svg
      width="60"
      height="38"
      viewBox="0 0 60 38"
      fill="none"
      style={{ transform: `rotate(${tilt}deg)`, filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.18))" }}
      aria-hidden="true"
    >
      <path
        d="M30 20 C 14 6, 6 18, 16 26 C 22 30, 28 22, 30 20 C 32 22, 38 30, 44 26 C 54 18, 46 6, 30 20 Z"
        stroke="#b48a55"
        strokeWidth="1.6"
        fill="rgba(180,138,85,0.18)"
      />
      <path d="M30 20 L 20 36" stroke="#b48a55" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M30 20 L 40 36" stroke="#b48a55" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// ─── Artifact definitions ─────────────────────────────────────────────────────
type Artifact = {
  key: string;
  side: "left" | "right";
  top: string;
  edge: string; // CSS value for left: or right:
  rotate: number;
  delay: number;
  depth: number;
  z?: number;
  node: React.ReactNode;
};

// Layout philosophy: cluster items, vary x-positions wildly (don't hug the edge),
// allow overlap (z-index ordering), spread tilt range from -22° to +22°.
const artifacts: Artifact[] = [
  // ── BACKBOARD ATMOSPHERE (deepest layer — ghosted on the cork) ───────────
  {
    key: "board-postmark-1",
    side: "left",
    top: "8%",
    edge: "16%",
    rotate: -12,
    delay: 0.0,
    depth: 0.05,
    z: 0,
    node: <BackboardCircle size={210} text="ENVELOPED · KEPT SAFE" innerText="2026" tilt={-12} />,
  },
  {
    key: "board-postmark-2",
    side: "right",
    top: "44%",
    edge: "16%",
    rotate: 8,
    delay: 0.0,
    depth: 0.05,
    z: 0,
    node: <BackboardCircle size={180} text="LOVE LETTERS · EST. MMXXVI" innerText="♡" tilt={8} />,
  },
  {
    key: "tack-1",
    side: "left",
    top: "5%",
    edge: "32%",
    rotate: 0,
    delay: 0.0,
    depth: 0.05,
    z: 0,
    node: <TackHole />,
  },
  {
    key: "tack-2",
    side: "left",
    top: "48%",
    edge: "26%",
    rotate: 0,
    delay: 0.0,
    depth: 0.05,
    z: 0,
    node: <TackHole />,
  },
  {
    key: "tack-3",
    side: "left",
    top: "88%",
    edge: "30%",
    rotate: 0,
    delay: 0.0,
    depth: 0.05,
    z: 0,
    node: <TackHole />,
  },
  {
    key: "tack-4",
    side: "right",
    top: "12%",
    edge: "30%",
    rotate: 0,
    delay: 0.0,
    depth: 0.05,
    z: 0,
    node: <TackHole />,
  },
  {
    key: "tack-5",
    side: "right",
    top: "60%",
    edge: "32%",
    rotate: 0,
    delay: 0.0,
    depth: 0.05,
    z: 0,
    node: <TackHole />,
  },
  {
    key: "tack-6",
    side: "right",
    top: "92%",
    edge: "28%",
    rotate: 0,
    delay: 0.0,
    depth: 0.05,
    z: 0,
    node: <TackHole />,
  },

  // ── TOP-LEFT: kraft envelope (real site envelope) with stamp ─────────────
  {
    key: "env-kraft",
    side: "left",
    top: "1%",
    edge: "1%",
    rotate: -10,
    delay: 0.1,
    depth: 0.25,
    z: 2,
    node: (
      <CollageEnvelope
        design={d.kraft}
        w={264}
        h={168}
        label="open on 5 / 12"
        labelSide="bottom"
      />
    ),
  },

  // ── MID-LEFT CLUSTER: polaroid + scrap + paperclip ──────────────────────
  {
    key: "p-candles",
    side: "left",
    top: "23%",
    edge: "1%",
    rotate: -9,
    delay: 0.3,
    depth: 0.5,
    z: 2,
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
    top: "43%",
    edge: "9%",
    rotate: 7,
    delay: 0.45,
    depth: 0.6,
    z: 3,
    node: (
      <LetterScrap lines={["…I wrote this on a", "Tuesday while you", "were reading.", "Just wanted you", "to know."]} />
    ),
  },
  {
    key: "clip-1",
    side: "left",
    top: "41%",
    edge: "8%",
    rotate: -22,
    delay: 0.5,
    depth: 0.4,
    z: 6,
    node: <Paperclip tilt={-22} />,
  },
  {
    key: "ticket-img",
    side: "left",
    top: "65%",
    edge: "2%",
    rotate: -11,
    delay: 0.62,
    depth: 0.35,
    z: 3,
    node: <TicketImage w={280} />,
  },

  // ── TOP-RIGHT: couple polaroid — the one DOUBLE-TAPED at both corners ───
  {
    key: "p-couple",
    side: "right",
    top: "6%",
    edge: "4%",
    rotate: 10,
    delay: 0.2,
    depth: 0.45,
    z: 2,
    node: (
      <MiniPolaroid
        src="/images/couple.jpg"
        caption="us"
        imgW={122}
        imgH={162}
      />
    ),
  },
  {
    key: "tape-couple-l",
    side: "right",
    top: "5%",
    edge: "10%",
    rotate: -16,
    delay: 0.18,
    depth: 0.45,
    z: 6,
    node: <WashiTape w={56} tilt={-16} variant="sage" />,
  },
  {
    key: "tape-couple-r",
    side: "right",
    top: "5%",
    edge: "3%",
    rotate: 18,
    delay: 0.19,
    depth: 0.45,
    z: 6,
    node: <WashiTape w={56} tilt={18} variant="sage" />,
  },

  // ── MID-RIGHT: midnight envelope, slightly inset for collage feel ────────
  {
    key: "env-midnight",
    side: "right",
    top: "36%",
    edge: "5%",
    rotate: 11,
    delay: 0.5,
    depth: 0.4,
    z: 2,
    node: (
      <CollageEnvelope
        design={d.midnight}
        w={236}
        h={150}
        label="open when sad"
        labelSide="bottom"
      />
    ),
  },

  // ── BOTTOM-LEFT: postage stamps cluster ──────────────────────────────────
  {
    key: "stamps-bl",
    side: "left",
    top: "88%",
    edge: "13%",
    rotate: -8,
    delay: 0.85,
    depth: 0.2,
    z: 4,
    node: (
      <div className="flex items-end gap-1.5">
        <PostageStamp label="love" tilt={-6} />
        <PostageStamp label="1¢" tilt={9} />
      </div>
    ),
  },

  // ── BOTTOM-RIGHT: dog polaroid with tape + twine bow ─────────────────────
  {
    key: "p-dog",
    side: "right",
    top: "76%",
    edge: "1%",
    rotate: -6,
    delay: 0.78,
    depth: 0.3,
    z: 3,
    node: (
      <MiniPolaroid
        src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=70&auto=format&fit=crop"
        caption="goodest boy"
        imgW={140}
        imgH={140}
      />
    ),
  },

  // ── BACKBOARD WRITING (lowest z — handwritten on the corkboard itself) ──
  {
    key: "scribble-1",
    side: "left",
    top: "9%",
    edge: "18%",
    rotate: -4,
    delay: 0.0,
    depth: 0.1,
    z: 0,
    node: <BackboardScribble text="for keeps ✦" size={26} tilt={-4} />,
  },
  {
    key: "scribble-4",
    side: "right",
    top: "26%",
    edge: "18%",
    rotate: 5,
    delay: 0.0,
    depth: 0.1,
    z: 0,
    node: <BackboardScribble text="us, always" size={28} tilt={5} />,
  },
  {
    key: "scribble-5",
    side: "right",
    top: "82%",
    edge: "22%",
    rotate: -6,
    delay: 0.0,
    depth: 0.1,
    z: 0,
    node: <BackboardScribble text="2026 ♡" size={32} tilt={-6} />,
  },
  {
    key: "scribble-6",
    side: "left",
    top: "78%",
    edge: "14%",
    rotate: 4,
    delay: 0.0,
    depth: 0.1,
    z: 0,
    node: <BackboardScribble text="p.s. love you" size={24} tilt={4} />,
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
            zIndex: a.z ?? 1,
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
