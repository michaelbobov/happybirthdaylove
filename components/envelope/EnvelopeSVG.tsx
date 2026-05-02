"use client";

import { forwardRef, useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { EnvelopeDesign } from "@/lib/themes";
import type { EnvelopeStamp } from "@/lib/stamps";
import { EnvelopePatterns, patternFillUrl } from "./EnvelopePatterns";
import { WaxSeal } from "./WaxSeal";

export type EnvelopeSVGProps = {
  design: EnvelopeDesign;
  width?: number;
  height?: number;
  monogram?: string;
  /** If set, shown as a stamp in the top-right corner. */
  stampLabel?: string;
  /** Child elements to layer INSIDE the body (behind the flap). Usually a <LetterPeek />. */
  children?: ReactNode;
  /** Toggles classes so GSAP/CSS can animate the flap/seal states. */
  state?: "closed" | "opening" | "open";
  /** Called when user clicks the envelope (drives GSAP open on pages that use it). */
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
  /** Applied to the root svg element (for GSAP context). */
  svgClassName?: string;
  /** Overrides the design's default seal color. Hex string, e.g. "#c06a4a". */
  sealColorOverride?: string | null;
  /** Optional PNG asset used to render the seal instead of the drawn SVG shape. */
  sealImageUrl?: string;
  /** Decorative stamps positioned on the envelope body. Rendered behind the flap. */
  stamps?: EnvelopeStamp[];
};

/**
 * Generic envelope SVG. Layers:
 *   1. body (paper)  — bottom
 *   2. peek          — letter sticking out when opening
 *   3. flap          — top; rotated around its top edge to open
 *   4. seal          — sits on the flap at the overlap line
 *
 * All four are class-targeted so a GSAP timeline can animate them:
 *   .env-flap, .env-seal, .env-body, .env-peek
 */
export const EnvelopeSVG = forwardRef<SVGSVGElement, EnvelopeSVGProps>(function EnvelopeSVG(
  {
    design,
    width = 560,
    height = 360,
    monogram,
    stampLabel,
    children,
    state = "closed",
    onClick,
    style,
    className,
    svgClassName,
    sealColorOverride,
    sealImageUrl = "/images/seal.png",
    stamps,
  },
  ref,
) {
  const uid = useId().replace(/[:]/g, "");
  const prefix = `env-${uid}`;
  const patternUrl = patternFillUrl(prefix, design);

  // geometry: envelope body is a rounded rect; flap is a triangle with rounded apex
  const pad = 6;
  const bodyX = pad;
  const bodyY = height * 0.3;
  const bodyW = width - pad * 2;
  const bodyH = height - bodyY - pad;
  const flapTipY = pad;
  const flapApexX = width / 2;

  const sealX = flapApexX;
  const sealY = bodyY; // where flap meets body
  const sealR = Math.min(width, height) * 0.09;

  return (
    <div
      className={className}
      style={{ width, height, position: "relative", cursor: onClick ? "pointer" : "default", ...style }}
      onClick={onClick}
      data-state={state}
    >
      <svg
        ref={ref}
        className={svgClassName}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{ display: "block", overflow: "visible" }}
        role="img"
        aria-label={`${design.name} envelope`}
      >
        <EnvelopePatterns design={design} idPrefix={prefix} />

        {/* Body back layer */}
        <g className="env-body">
          <rect
            x={bodyX}
            y={bodyY}
            width={bodyW}
            height={bodyH}
            rx={12}
            ry={12}
            fill={design.paper}
          />
          {patternUrl ? (
            <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} rx={12} ry={12} fill={patternUrl} />
          ) : null}
          {/* inner side flaps (subtle) */}
          <path
            d={`M ${bodyX} ${bodyY} L ${width / 2} ${bodyY + bodyH * 0.45} L ${bodyX + bodyW} ${bodyY}`}
            fill={design.flap}
            opacity={0.45}
          />
          <path
            d={`M ${bodyX} ${bodyY + bodyH} L ${width / 2} ${bodyY + bodyH * 0.55} L ${bodyX + bodyW} ${bodyY + bodyH}`}
            fill={design.flap}
            opacity={0.3}
          />

          {/* User-placed decorative stamps on the envelope body */}
          {stamps && stamps.length > 0 ? (
            <g className="env-stamps">
              {stamps.map((s) => {
                const cx = (s.x / 100) * width;
                const cy = (s.y / 100) * height;
                const shorter = Math.min(width, height);
                const sizePx = (s.size / 100) * shorter;
                const transform = `rotate(${s.rotation} ${cx} ${cy})`;
                if (s.kind === "asset") {
                  return (
                    <image
                      key={s.id}
                      href={s.value}
                      x={cx - sizePx / 2}
                      y={cy - sizePx / 2}
                      width={sizePx}
                      height={sizePx}
                      transform={transform}
                      preserveAspectRatio="xMidYMid meet"
                      style={{
                        filter:
                          "drop-shadow(0 2px 2px rgba(0,0,0,0.18)) drop-shadow(0 0 0.5px rgba(0,0,0,0.3))",
                      }}
                    />
                  );
                }
                return (
                  <text
                    key={s.id}
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={sizePx}
                    fill={s.color ?? "currentColor"}
                    transform={transform}
                    style={{
                      userSelect: "none",
                      filter: "drop-shadow(0 1.5px 1px rgba(0,0,0,0.15))",
                    }}
                  >
                    {s.value}
                  </text>
                );
              })}
            </g>
          ) : null}

          {stampLabel ? (
            <g transform={`translate(${bodyX + bodyW - 72}, ${bodyY + 14})`}>
              <rect
                width={60}
                height={74}
                rx={3}
                fill="#ffffff"
                stroke={design.seal}
                strokeWidth={2}
                strokeDasharray="3 3"
              />
              <text
                x={30}
                y={44}
                textAnchor="middle"
                fontFamily="var(--font-display-warm, serif)"
                fontSize={18}
                fill={design.seal}
              >
                {stampLabel.slice(0, 8)}
              </text>
            </g>
          ) : null}
        </g>

        {/* Letter peek layer — animated in/out by GSAP */}
        <g className="env-peek" style={{ transformOrigin: `${width / 2}px ${bodyY}px` }}>
          {children}
        </g>

        {/* Flap — rotates around the top edge when opening */}
        <g
          className="env-flap"
          style={{ transformOrigin: `${flapApexX}px ${flapTipY}px`, transformBox: "fill-box" }}
        >
          <path
            d={`M ${bodyX} ${bodyY} L ${flapApexX} ${bodyY + bodyH * 0.52} L ${bodyX + bodyW} ${bodyY} L ${bodyX + bodyW} ${flapTipY} L ${bodyX} ${flapTipY} Z`}
            fill={design.flap}
          />
          {patternUrl ? (
            <path
              d={`M ${bodyX} ${bodyY} L ${flapApexX} ${bodyY + bodyH * 0.52} L ${bodyX + bodyW} ${bodyY} L ${bodyX + bodyW} ${flapTipY} L ${bodyX} ${flapTipY} Z`}
              fill={patternUrl}
              opacity={0.6}
            />
          ) : null}
          {/* fold line */}
          <path
            d={`M ${bodyX} ${bodyY} L ${flapApexX} ${bodyY + bodyH * 0.52} L ${bodyX + bodyW} ${bodyY}`}
            stroke={design.accent ?? design.seal}
            strokeOpacity={0.2}
            strokeWidth={1.2}
            fill="none"
          />
        </g>

        {/* Wax seal — sits on top of flap + body join */}
        <WaxSeal
          cx={sealX}
          cy={sealY}
          r={sealR}
          color={sealColorOverride ?? design.seal}
          monogram={monogram}
          imageUrl={sealImageUrl}
        />
      </svg>
    </div>
  );
});
