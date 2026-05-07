"use client";

import { forwardRef, useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { EnvelopeDesign } from "@/lib/themes";
import {
  DEFAULT_FRONT_TEXT_COLOR,
  DEFAULT_FRONT_TEXT_FONT,
  DEFAULT_FRONT_TEXT_POSITION,
  DEFAULT_FRONT_TEXT_ROTATION,
  DEFAULT_FRONT_TEXT_SIZE,
  ENVELOPE_FRONT_TEXT_STAMP_ID,
  type EnvelopeStamp,
} from "@/lib/stamps";
import { captionHorizontalRangePct, measureEnvelopeTextBoxPct } from "@/lib/envelope-text-layout";
import { EnvelopePatterns, patternFillUrl } from "./EnvelopePatterns";
import { PostmarkGroup } from "./Postmark";
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
  /** Sender-facing text shown on the envelope front. */
  frontText?: string | null;
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
    frontText,
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
  const text = frontText?.trim();
  const frontTextPlacement = stamps?.find((s) => s.id === ENVELOPE_FRONT_TEXT_STAMP_ID);
  const decorativeStamps = stamps?.filter((s) => s.id !== ENVELOPE_FRONT_TEXT_STAMP_ID);
  const frontTextX = ((frontTextPlacement?.x ?? DEFAULT_FRONT_TEXT_POSITION.x) / 100) * width;
  const frontTextY = ((frontTextPlacement?.y ?? DEFAULT_FRONT_TEXT_POSITION.y) / 100) * height;
  const frontTextSize = ((frontTextPlacement?.size ?? DEFAULT_FRONT_TEXT_SIZE) / 100) * Math.min(width, height);
  const frontCaption = text ?? "";
  const layoutBounds = {
    minX: width * 0.06,
    maxX: width * 0.94,
    minY: height * 0.28,
    maxY: height * 0.94,
  };
  const maxCaptionColPct = captionHorizontalRangePct({
    minX: (layoutBounds.minX / width) * 100,
    maxX: (layoutBounds.maxX / width) * 100,
    minY: (layoutBounds.minY / height) * 100,
    maxY: (layoutBounds.maxY / height) * 100,
  });
  const autoFront = measureEnvelopeTextBoxPct({
    text: frontCaption,
    envelopeWidthPx: width,
    envelopeHeightPx: height,
    fontSizePx: frontTextSize,
    fontFamily: frontTextPlacement?.fontFamily ?? DEFAULT_FRONT_TEXT_FONT,
    maxWidthPct: maxCaptionColPct,
    lineHeight: 1.2,
  });
  const frontTextWidth =
    frontTextPlacement?.width != null
      ? (frontTextPlacement.width / 100) * width
      : (autoFront.widthPct / 100) * width;
  const frontTextHeight =
    frontTextPlacement?.height != null
      ? (frontTextPlacement.height / 100) * height
      : (autoFront.heightPct / 100) * height;

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
              {decorativeStamps?.map((s) => {
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
                if (s.kind === "postmark") {
                  return (
                    <PostmarkGroup
                      key={s.id}
                      cx={cx}
                      cy={cy}
                      sizePx={sizePx}
                      outerText={s.outerText}
                      innerText={s.value}
                      color={s.color}
                      rotation={s.rotation}
                      uid={s.id}
                    />
                  );
                }
                if (s.kind === "text") {
                  const textWidth = s.width
                    ? (s.width / 100) * width
                    : Math.max(sizePx * 2.4, Math.min(width * 0.72, s.value.length * sizePx * 0.56));
                  const textHeight = s.height ? (s.height / 100) * height : sizePx * 2.4;
                  return (
                    <foreignObject
                      key={s.id}
                      x={cx - textWidth / 2}
                      y={cy - textHeight / 2}
                      width={textWidth}
                      height={textHeight}
                      transform={transform}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          textAlign: "center",
                          color: s.color ?? "var(--color-ink)",
                          fontFamily: s.fontFamily ?? "var(--font-hand)",
                          fontSize: sizePx,
                          lineHeight: 1.15,
                          textShadow: "0 1px 0 rgba(255,255,255,0.5)",
                          overflowWrap: "break-word",
                          userSelect: "none",
                        }}
                      >
                        {s.value}
                      </div>
                    </foreignObject>
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

          {text ? (
            <foreignObject
              x={frontTextX - frontTextWidth / 2}
              y={frontTextY - frontTextHeight / 2}
              width={frontTextWidth}
              height={frontTextHeight}
              transform={`rotate(${frontTextPlacement?.rotation ?? DEFAULT_FRONT_TEXT_ROTATION} ${frontTextX} ${frontTextY})`}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  color: frontTextPlacement?.color ?? DEFAULT_FRONT_TEXT_COLOR,
                  fontFamily: frontTextPlacement?.fontFamily ?? DEFAULT_FRONT_TEXT_FONT,
                  fontSize: frontTextSize,
                  lineHeight: 1.2,
                  textShadow: "0 1px 0 rgba(255,255,255,0.45)",
                  overflowWrap: "break-word",
                  overflow: "hidden",
                  userSelect: "none",
                }}
              >
                {text}
              </div>
            </foreignObject>
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
