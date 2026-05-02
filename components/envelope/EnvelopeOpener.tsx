"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { gsap } from "gsap";
import type { EnvelopeDesign } from "@/lib/themes";
import { getTheme } from "@/lib/themes";
import type { EnvelopeStamp } from "@/lib/stamps";
import { EnvelopeSVG } from "./EnvelopeSVG";
import { PhotoEnvelope } from "./PhotoEnvelope";
import { EnvelopeStampsOverlay } from "./EnvelopeStampsOverlay";

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
  /** Overrides the design's default seal color. Hex string. */
  sealColorOverride?: string | null;
  /** Optional PNG asset used to render the seal instead of the drawn SVG shape. */
  sealImageUrl?: string;
  /** Decorative stamps placed on the envelope front. */
  stamps?: EnvelopeStamp[];
  /** Keep the revealed child inside the envelope peek instead of rendering a full overlay. */
  inlineReveal?: boolean;
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
  sealColorOverride,
  sealImageUrl,
  stamps,
  inlineReveal = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const envelopeWrapRef = useRef<HTMLDivElement | null>(null);
  const tearAudioRef = useRef<HTMLAudioElement | null>(null);
  const [stage, setStage] = useState<"closed" | "opening" | "open">("closed");

  // Entry pop: on mount, scale/fade the envelope in with a bounce so it
  // obviously presents itself as interactive. One-shot.
  useEffect(() => {
    const el = envelopeWrapRef.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { scale: 0.82, y: 48, opacity: 0 },
      { scale: 1, y: 0, opacity: 1, duration: 0.95, ease: "back.out(1.4)", delay: 0.08 },
    );
  }, []);

  // Hover tilt (closed state) — tilts the inner wrapper; CSS bob on outer.
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

    const audio = tearAudioRef.current;
    if (audio) {
      audio.currentTime = 5;
      audio.play().catch(() => {});
    }

    const theme = getTheme(design.themeId);
    const D = theme.tokens.timing.openDuration;
    const ease = theme.tokens.timing.easing;

    const root = rootRef.current;
    const envelope = envelopeWrapRef.current;
    const content = contentRef.current;
    if (!root || !envelope || !content) return;

    const ctx = gsap.context(() => {
      // PhotoEnvelope uses HTML divs with the same class hooks; SVGEnvelope
      // uses <g> groups. GSAP handles both when typed as Element.
      const flap = root.querySelector(".env-flap") as Element | null;
      const seal = root.querySelector(".wax-seal") as Element | null;
      const sealTop = root.querySelector(".wax-seal-top") as Element | null;
      const sealBottom = root.querySelector(".wax-seal-bottom") as Element | null;
      const sealShadow = root.querySelector(".wax-seal-shadow") as Element | null;
      const peek = root.querySelector(".env-peek") as Element | null;

      const tl = gsap.timeline({
        defaults: { ease },
        onComplete: () => {
          setStage("open");
          onOpened?.();
        },
      });

      // 1. Wax seal tears: the upper wax lifts with the flap, while a lower
      //    remnant stays stuck to the envelope body.
      if (sealTop && sealBottom) {
        tl.to(seal, { scale: 1.03, duration: 0.12, transformOrigin: "center" }, 0);
        if (sealShadow) {
          tl.to(sealShadow, { opacity: 0.2, duration: 0.38, ease: "power2.out" }, 0.18);
        }
        tl.to(sealTop, {
          y: -height * 0.16,
          rotationX: -120,
          rotation: 0,
          opacity: 0,
          duration: D * 0.58,
          transformOrigin: "center bottom",
          transformPerspective: 800,
          ease: "power3.inOut",
        }, 0.24);
        gsap.set(sealBottom, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 });
      } else if (seal) {
        tl.to(seal, { scale: 1.08, duration: 0.18, transformOrigin: "center" }, 0)
          .to(seal, { scale: 0, rotation: 22, opacity: 0, duration: 0.25, ease: "power2.in" }, 0.18);
      }

      // 2. Flap lifts (rotate around top edge) — rotationX for 3D feel.
      // transformOrigin is set in CSS on each envelope (SVG: at the flap's
      // top edge; photo: at the envelope bounds' top-middle, which may be
      // inset from the PNG edge if the asset has padding). Letting CSS own
      // the origin keeps GSAP agnostic to the renderer.
      if (flap) {
        tl.to(
          flap,
          {
            rotationX: -175,
            duration: D * 0.55,
            transformPerspective: 800,
            ease: "power3.inOut",
          },
          0.32,
        );
      }

      // 3. Optional inline letter peek. Recipient openings should not show
      //    fake/default paper; only demos opt into inline reveal content.
      if (peek) {
        gsap.set(peek, { y: 40, opacity: 0 });
        if (inlineReveal) {
          tl.to(peek, { y: -height * 0.12, opacity: 1, duration: D * 0.35, ease: "power2.out" }, 0.5);
        }
      }

      // 4. Envelope softens into the background — stays in place as a
      //    holder so the revealed content looks like it's resting on top
      //    of the envelope, not replacing it.
      tl.to(
        envelope,
        { scale: 0.94, y: 18, opacity: 0.88, duration: 0.6, ease: "power2.out" },
        0.7 + D * 0.4,
      );

      // 5. Content emerges from the envelope body and lands above it.
      if (!inlineReveal) {
        gsap.set(content, { autoAlpha: 0, y: 50, scale: 0.9 });
        tl.to(
          content,
          { autoAlpha: 1, y: -10, scale: 1, duration: 0.85, ease: "power3.out" },
          "+=0.1",
        );
      }
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
      <audio ref={tearAudioRef} src="/sounds/tearsound.mp3" preload="auto" />
      {/* Envelope stays rendered at all stages — after open it settles behind
          the revealed content as a visual "holder" rather than disappearing. */}
      <div
        className={stage === "closed" ? "envelope-float" : undefined}
        style={{ position: "relative", zIndex: 0 }}
      >
        <div
          ref={envelopeWrapRef}
          className="envelope-shadow"
          style={{ transformStyle: "preserve-3d", willChange: "transform" }}
          onClick={play}
        >
            {design.imageUrl ? (
              <div style={{ position: "relative" }}>
              <PhotoEnvelope
                design={design}
                width={width}
                height={height}
                monogram={monogram}
                stampLabel={stampLabel}
                state={stage}
                sealColorOverride={sealColorOverride}
                sealImageUrl={sealImageUrl}
              >
                {inlineReveal ? children : null}
              </PhotoEnvelope>
              {stage === "closed" && <EnvelopeStampsOverlay stamps={stamps} width={width} height={height} />}
              </div>
            ) : (
              <EnvelopeSVG
                design={design}
                width={width}
                height={height}
                monogram={monogram}
                stampLabel={stampLabel}
                state={stage}
                sealColorOverride={sealColorOverride}
                sealImageUrl={sealImageUrl}
                stamps={stamps}
              >
                {inlineReveal ? children : null}
              </EnvelopeSVG>
            )}
        </div>
      </div>

      <div
        ref={contentRef}
        className="absolute inset-0 flex items-start justify-center pointer-events-none"
        style={{ visibility: stage === "open" ? "visible" : "hidden", zIndex: 2 }}
      >
        <div className="pointer-events-auto w-full">{inlineReveal ? null : children}</div>
      </div>
    </div>
  );
}
