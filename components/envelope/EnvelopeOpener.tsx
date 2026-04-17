"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { gsap } from "gsap";
import type { EnvelopeDesign } from "@/lib/themes";
import { getTheme } from "@/lib/themes";
import { EnvelopeSVG } from "./EnvelopeSVG";

type Props = {
  design: EnvelopeDesign;
  monogram?: string;
  stampLabel?: string;
  /** Content revealed *after* the flap opens — shown full-screen inside a stage. */
  children: ReactNode;
  /** Called once the full open timeline finishes — recipient can now interact with items. */
  onOpened?: () => void;
  /** If true, skip the closed-state click and auto-open on mount. */
  autoOpen?: boolean;
  width?: number;
  height?: number;
};

/**
 * Orchestrates the envelope opening sequence:
 *   1. gentle hover tilt on closed state
 *   2. on click → seal scale/crack + fragment scatter
 *   3. flap rotates open (rotationX)
 *   4. letter (children) slides out from envelope body
 *   5. envelope fades/scales down, stage fills with content
 */
export function EnvelopeOpener({
  design,
  monogram,
  stampLabel,
  children,
  onOpened,
  autoOpen = false,
  width = 560,
  height = 360,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const envelopeWrapRef = useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = useState<"closed" | "opening" | "open">("closed");

  // Hover tilt (closed state)
  useEffect(() => {
    if (stage !== "closed") return;
    const el = envelopeWrapRef.current;
    if (!el) return;
    const q = gsap.quickTo(el, "rotateY", { duration: 0.6, ease: "power2.out" });
    const qX = gsap.quickTo(el, "rotateX", { duration: 0.6, ease: "power2.out" });
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      q(dx * 10);
      qX(-dy * 8);
    };
    const onLeave = () => {
      q(0);
      qX(0);
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [stage]);

  const play = () => {
    if (stage !== "closed") return;
    setStage("opening");

    const theme = getTheme(design.themeId);
    const D = theme.tokens.timing.openDuration;
    const ease = theme.tokens.timing.easing;

    const root = rootRef.current;
    const envelope = envelopeWrapRef.current;
    const content = contentRef.current;
    if (!root || !envelope || !content) return;

    const ctx = gsap.context(() => {
      const flap = root.querySelector(".env-flap") as SVGGElement | null;
      const seal = root.querySelector(".wax-seal") as SVGGElement | null;
      const peek = root.querySelector(".env-peek") as SVGGElement | null;

      const tl = gsap.timeline({
        defaults: { ease },
        onComplete: () => {
          setStage("open");
          onOpened?.();
        },
      });

      // 1. Seal crack: scale up, rotate, flash, then shrink away
      if (seal) {
        tl.to(seal, { scale: 1.08, duration: 0.18, transformOrigin: "center" }, 0)
          .to(seal, { scale: 0, rotation: 22, opacity: 0, duration: 0.25, ease: "power2.in" }, 0.18);
      }

      // 2. Flap lifts (rotate around top edge) — rotationX for 3D feel
      if (flap) {
        tl.to(
          flap,
          {
            rotationX: -175,
            duration: D * 0.55,
            transformPerspective: 800,
            transformOrigin: "50% 0%",
            ease: "power3.inOut",
          },
          0.32,
        );
      }

      // 3. Letter peek rises out of body
      if (peek) {
        gsap.set(peek, { y: 40, opacity: 0 });
        tl.to(
          peek,
          { y: -height * 0.15, opacity: 1, duration: D * 0.5, ease: "power2.out" },
          0.5,
        );
      }

      // 4. Envelope itself floats back/down as content takes over
      tl.to(
        envelope,
        { scale: 0.72, y: 80, opacity: 0.0, duration: 0.7, ease: "power2.in" },
        0.7 + D * 0.4,
      );

      // 5. Reveal content stage
      gsap.set(content, { autoAlpha: 0, y: 30 });
      tl.to(content, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" }, "-=0.4");
    }, root);

    return () => ctx.revert();
  };

  useEffect(() => {
    if (autoOpen && stage === "closed") {
      const id = requestAnimationFrame(() => play());
      return () => cancelAnimationFrame(id);
    }
    // `play` is intentionally omitted: it reads `stage` and we only want the
    // first-mount trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, stage]);

  return (
    <div
      ref={rootRef}
      className="relative w-full min-h-[520px] flex items-center justify-center select-none"
      style={{ perspective: 1400 }}
    >
      {stage !== "open" ? (
        <div
          ref={envelopeWrapRef}
          className="envelope-shadow"
          style={{ transformStyle: "preserve-3d", willChange: "transform" }}
          onClick={play}
        >
          <EnvelopeSVG
            design={design}
            width={width}
            height={height}
            monogram={monogram}
            stampLabel={stampLabel}
            state={stage}
          >
            {/* peek: a letter corner sticking out */}
            <rect
              x={width * 0.15}
              y={height * 0.25}
              width={width * 0.7}
              height={height * 0.45}
              rx={6}
              fill="#ffffff"
              stroke="rgba(0,0,0,0.12)"
            />
            <line
              x1={width * 0.22}
              y1={height * 0.4}
              x2={width * 0.78}
              y2={height * 0.4}
              stroke="#c9b08a"
              strokeWidth={1}
            />
            <line
              x1={width * 0.22}
              y1={height * 0.48}
              x2={width * 0.68}
              y2={height * 0.48}
              stroke="#c9b08a"
              strokeWidth={1}
            />
            <line
              x1={width * 0.22}
              y1={height * 0.56}
              x2={width * 0.74}
              y2={height * 0.56}
              stroke="#c9b08a"
              strokeWidth={1}
            />
          </EnvelopeSVG>
          {stage === "closed" ? (
            <div
              className="absolute inset-x-0 -bottom-10 text-center text-sm font-hand"
              style={{ color: "var(--color-muted)" }}
            >
              tap to open
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        ref={contentRef}
        className="absolute inset-0 flex items-start justify-center pointer-events-none"
        style={{ visibility: stage === "open" ? "visible" : "hidden" }}
      >
        <div className="pointer-events-auto w-full">{children}</div>
      </div>
    </div>
  );
}
