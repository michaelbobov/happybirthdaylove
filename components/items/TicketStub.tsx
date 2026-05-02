"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

type Props = {
  src: string;
  caption?: string;
  /** Slight initial tilt, in degrees. */
  rotate?: number;
};

/**
 * A scanned paper ticket / stub. Renders the photo inside a perforated
 * ticket-shaped frame (notches on the sides, perforations at the tear line),
 * with a small stub on the right for a label. Animates in with a subtle
 * tear-off feel.
 */
export function TicketStub({ src, caption, rotate = -2 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { y: -40, opacity: 0, rotation: rotate + 8, scale: 0.95 },
      { y: 0, opacity: 1, rotation: rotate, scale: 1, duration: 0.8, ease: "back.out(1.3)" },
    );
  }, [rotate]);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        display: "inline-flex",
        filter: "drop-shadow(0 18px 28px rgba(0,0,0,0.22))",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/pin.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: "absolute",
          width: 38,
          height: "auto",
          left: 16,
          top: 12,
          zIndex: 2,
          transform: "rotate(-16deg)",
          transformOrigin: "50% 82%",
          filter: "drop-shadow(0 5px 7px rgba(8,18,45,0.24))",
          pointerEvents: "none",
        }}
      />
      {/* Main ticket body — CSS mask carves notches on both sides and tear
          perforations along the stub divider */}
      <div
        style={{
          position: "relative",
          background: "#fbf7ec",
          padding: "14px 18px 18px",
          minWidth: 260,
          maxWidth: 360,
          borderRadius: 4,
          // Two radial gradients = left+right notch cutouts via mask
          WebkitMaskImage:
            "radial-gradient(circle 12px at 0 50%, transparent 98%, black 100%), radial-gradient(circle 12px at 100% 50%, transparent 98%, black 100%)",
          WebkitMaskComposite: "source-in",
          maskImage:
            "radial-gradient(circle 12px at 0 50%, transparent 98%, black 100%), radial-gradient(circle 12px at 100% 50%, transparent 98%, black 100%)",
          maskComposite: "intersect",
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#8a6a4a",
            marginBottom: 6,
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          · Admit One ·
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={caption ?? ""}
          style={{
            display: "block",
            maxWidth: 320,
            maxHeight: 260,
            objectFit: "cover",
            borderRadius: 2,
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
            filter: "saturate(0.92) contrast(1.04)",
          }}
        />
        {caption && (
          <div
            className="font-hand"
            style={{
              marginTop: 10,
              fontSize: 16,
              color: "#2a2a2a",
              textAlign: "center",
              maxWidth: 320,
            }}
          >
            {caption}
          </div>
        )}

        {/* Perforation line — decorative */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: 58,
            top: 10,
            bottom: 10,
            width: 1,
            backgroundImage:
              "repeating-linear-gradient(to bottom, rgba(0,0,0,0.28) 0 3px, transparent 3px 7px)",
          }}
        />
      </div>
    </div>
  );
}
