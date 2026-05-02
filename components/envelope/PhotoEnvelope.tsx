"use client";

import { forwardRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { EnvelopeDesign } from "@/lib/themes";
import { WaxSeal } from "./WaxSeal";

export type PhotoEnvelopeProps = {
  design: EnvelopeDesign;
  width?: number;
  height?: number;
  monogram?: string;
  stampLabel?: string;
  children?: ReactNode;
  state?: "closed" | "opening" | "open";
  /** Overrides the design's default seal color. Hex string. */
  sealColorOverride?: string | null;
  /** PNG asset used to render the wax seal. */
  sealImageUrl?: string;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
};

/**
 * Photorealistic envelope driven by a single PNG asset.
 *
 * Coordinate system: all flapPoints / bounds are stored as fractions of the
 * PNG's natural pixel dimensions (0–1). At render time we compute where the
 * image actually sits inside the container (object-fit: contain leaves
 * letterbox space when aspect ratios differ), then remap every coordinate into
 * container-percentage space so clip-paths align with what the eye sees.
 *
 * Tinting: a masked `mix-blend-mode: multiply` overlay lets `design.paper` /
 * `design.flap` recolor the envelope while preserving the photograph's own
 * shading. Set `design.noTint = true` to show the asset unmodified.
 */
export const PhotoEnvelope = forwardRef<HTMLDivElement, PhotoEnvelopeProps>(function PhotoEnvelope(
  {
    design,
    width = 560,
    height = 360,
    monogram,
    stampLabel,
    children,
    state = "closed",
    sealColorOverride,
    sealImageUrl = "/images/seal.png",
    onClick,
    style,
    className,
  },
  ref,
) {
  const imageUrl = design.imageUrl;
  if (!imageUrl) return null;

  // ── Aspect-ratio mapping ──────────────────────────────────────────────────
  // The PNG may not match the container's aspect ratio. object-fit:contain
  // centres the image and adds letterbox space. We compute the rendered image
  // box (imgLeft, imgTop, imgW, imgH inside the container) so that clip-path
  // percentages — which are relative to the container — land on real pixels.
  const natW = design.imageNaturalWidth ?? 1;
  const natH = design.imageNaturalHeight ?? 1;
  const scale = Math.min(width / natW, height / natH);
  const imgW = natW * scale;   // rendered image width in px
  const imgH = natH * scale;   // rendered image height in px
  const imgLeft = (width - imgW) / 2;   // letterbox offset x
  const imgTop = (height - imgH) / 2;   // letterbox offset y

  // Convert an image-fraction [0–1, 0–1] → container-percentage string.
  const cx = (xFrac: number) => `${((imgLeft + xFrac * imgW) / width) * 100}%`;
  const cy = (yFrac: number) => `${((imgTop + yFrac * imgH) / height) * 100}%`;
  const cpx = (xFrac: number) => (imgLeft + xFrac * imgW) / width * 100;
  const cpy = (yFrac: number) => (imgTop + yFrac * imgH) / height * 100;
  const cpxPx = (xFrac: number) => imgLeft + xFrac * imgW;
  const cpyPx = (yFrac: number) => imgTop + yFrac * imgH;

  // ── Bounds & flap polygon ─────────────────────────────────────────────────
  const b = design.bounds ?? { top: 0, left: 0, right: 1, bottom: 1 };

  const rawPts: Array<[number, number]> =
    design.flapPoints ??
    [
      [b.left, b.top],
      [(b.left + b.right) / 2, b.top + (b.bottom - b.top) * 0.55],
      [b.right, b.top],
    ];
  const flapPts = roundFlapApex(rawPts);

  // Use a true curve for the bottom tongue so it matches the soft V in the
  // reference envelope instead of reading as a faceted polygon.
  const flapClip = createRoundedFlapClip(rawPts, cpxPx, cpyPx);

  // Body polygon: flap fold-line + bottom envelope corners.
  const bodyClip = `polygon(${[
    ...flapPts,
    [b.right, b.bottom],
    [b.left, b.bottom],
  ]
    .map(([x, y]) => `${cx(x)} ${cy(y)}`)
    .join(", ")})`;

  // Seal sits at the lowest flap point (apex).
  const apexRaw = rawPts.reduce((a, p) => (p[1] > a[1] ? p : a), rawPts[0]);
  const sealX = cpxPx(apexRaw[0]);
  const sealY = cpyPx(apexRaw[1]);
  const sealR = Math.min(imgW, imgH) * 0.09;

  // Flap hinge sits at the top edge of the envelope (first/last point's y).
  const hingeXpct = (cpx(rawPts[0][0]) + cpx(rawPts[rawPts.length - 1][0])) / 2;
  const hingeYpct = cpy(rawPts[0][1]);

  // Peek card sized and positioned inside the envelope body.
  const envLeft = cpx(b.left);
  const envRight = cpx(b.right);
  const envTop = cpy(b.top);
  const envBottom = cpy(b.bottom);
  const apexYpct = cpy(apexRaw[1]);

  return (
    <div
      ref={ref}
      className={className}
      onClick={onClick}
      data-state={state}
      style={{
        position: "relative",
        width,
        height,
        cursor: onClick ? "pointer" : "default",
        perspective: 1400,
        transformStyle: "preserve-3d",
        ...style,
      }}
    >
      {/* Pocket: dark interior revealed once the flap lifts. Clipped to the
          same flap polygon so it never bleeds outside the envelope. */}
      <div
        className="env-pocket"
        style={{
          position: "absolute",
          inset: 0,
          clipPath: flapClip,
          WebkitClipPath: flapClip,
          background:
            "radial-gradient(60% 80% at 50% 0%, rgba(40,28,18,0.45), rgba(18,12,8,0.85) 85%)",
          pointerEvents: "none",
        }}
      />

      {/* Body: PNG clipped to everything except the flap region. */}
      <PaperLayer
        imageUrl={imageUrl}
        clip={bodyClip}
        tint={design.noTint ? null : design.paper}
        width={width}
        height={height}
        className="env-body"
        imgLeft={imgLeft}
        imgTop={imgTop}
        imgW={imgW}
        imgH={imgH}
      >
        {stampLabel ? (
          <div
            style={{
              position: "absolute",
              top: `${(apexYpct + envBottom) / 2}%`,
              right: `${100 - envRight + (envRight - envLeft) * 0.06}%`,
              padding: "6px 10px",
              borderRadius: 4,
              background: "rgba(255,255,255,0.92)",
              border: `1.5px dashed ${design.seal}`,
              fontFamily: "var(--font-display-warm, serif)",
              fontSize: 13,
              color: design.seal,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              pointerEvents: "none",
            }}
          >
            {stampLabel.slice(0, 10)}
          </div>
        ) : null}
      </PaperLayer>

      {/* Peek: lined paper card hidden in closed state. GSAP fades it in
          mid-open as a teaser, fades out as real content takes over. */}
      <div
        className="env-peek"
        style={{
          position: "absolute",
          left: `${envLeft + (envRight - envLeft) * 0.08}%`,
          top: `${apexYpct - (envBottom - envTop) * 0.01}%`,
          width: `${(envRight - envLeft) * 0.84}%`,
          height: `${(envBottom - envTop) * 0.5}%`,
          opacity: 0,
          background: "#fdfaf2",
          borderRadius: 4,
          boxShadow: "0 2px 6px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(0,0,0,0.06)",
          pointerEvents: "none",
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 18px, rgba(180,140,90,0.3) 18px 19px)",
        }}
      >
        {children}
      </div>

      {/* Flap: PNG clipped to the flap polygon, rotates around the top edge. */}
      <PaperLayer
        imageUrl={imageUrl}
        clip={flapClip}
        tint={design.noTint ? null : design.flap}
        width={width}
        height={height}
        className="env-flap"
        imgLeft={imgLeft}
        imgTop={imgTop}
        imgW={imgW}
        imgH={imgH}
        extraStyle={{
          transformOrigin: `${hingeXpct}% ${hingeYpct}%`,
          transformStyle: "preserve-3d",
          willChange: "transform",
          zIndex: 5,
        }}
      >
      </PaperLayer>

      <svg
        className="env-flap-seal"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 6,
          pointerEvents: "none",
          overflow: "visible",
          transformOrigin: `${hingeXpct}% ${hingeYpct}%`,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
        aria-hidden="true"
      >
        <WaxSeal
          cx={sealX}
          cy={sealY}
          r={sealR}
          color={sealColorOverride ?? design.seal}
          monogram={monogram}
          imageUrl={sealImageUrl}
          showShadow={false}
          sealClassName="wax-seal wax-seal-attached"
        />
      </svg>
    </div>
  );
});

function createRoundedFlapClip(
  points: Array<[number, number]>,
  toX: (xFrac: number) => number,
  toY: (yFrac: number) => number,
) {
  if (points.length < 3) {
    return `polygon(${points.map(([x, y]) => `${toX(x)}px ${toY(y)}px`).join(", ")})`;
  }

  const apexIndex = points.reduce((maxIdx, point, idx) => (point[1] > points[maxIdx][1] ? idx : maxIdx), 0);
  const prev = points[apexIndex - 1];
  const apex = points[apexIndex];
  const next = points[apexIndex + 1];
  if (!prev || !next) {
    return `polygon(${points.map(([x, y]) => `${toX(x)}px ${toY(y)}px`).join(", ")})`;
  }

  const curveStart: [number, number] = [
    apex[0] + (prev[0] - apex[0]) * 0.075,
    apex[1] + (prev[1] - apex[1]) * 0.075,
  ];
  const curveEnd: [number, number] = [
    apex[0] + (next[0] - apex[0]) * 0.075,
    apex[1] + (next[1] - apex[1]) * 0.075,
  ];
  const control: [number, number] = [apex[0], apex[1] + 0.009];

  const commands = [
    `M ${toX(points[0][0])} ${toY(points[0][1])}`,
    ...points.slice(1, apexIndex).map(([x, y]) => `L ${toX(x)} ${toY(y)}`),
    `L ${toX(curveStart[0])} ${toY(curveStart[1])}`,
    `Q ${toX(control[0])} ${toY(control[1])} ${toX(curveEnd[0])} ${toY(curveEnd[1])}`,
    ...points.slice(apexIndex + 1).map(([x, y]) => `L ${toX(x)} ${toY(y)}`),
    "Z",
  ];

  return `path("${commands.join(" ")}")`;
}

function roundFlapApex(points: Array<[number, number]>): Array<[number, number]> {
  if (points.length < 3) return points;
  const apexIndex = points.reduce((maxIdx, point, idx) => (point[1] > points[maxIdx][1] ? idx : maxIdx), 0);
  const prev = points[apexIndex - 1];
  const apex = points[apexIndex];
  const next = points[apexIndex + 1];
  if (!prev || !next) return points;

  const towardPrev: [number, number] = [
    apex[0] + (prev[0] - apex[0]) * 0.16,
    apex[1] + (prev[1] - apex[1]) * 0.16,
  ];
  const towardNext: [number, number] = [
    apex[0] + (next[0] - apex[0]) * 0.16,
    apex[1] + (next[1] - apex[1]) * 0.16,
  ];

  // Keep the body seam close to the same shallow rounded V as the flap clip.
  const roundedTongue: Array<[number, number]> = [
    towardPrev,
    [apex[0] - 0.014, apex[1] + 0.002],
    [apex[0] - 0.008, apex[1] + 0.007],
    [apex[0], apex[1] + 0.009],
    [apex[0] + 0.008, apex[1] + 0.007],
    [apex[0] + 0.014, apex[1] + 0.002],
    towardNext,
  ];

  return [
    ...points.slice(0, apexIndex),
    ...roundedTongue,
    ...points.slice(apexIndex + 1),
  ];
}

type PaperLayerProps = {
  imageUrl: string;
  clip: string;
  tint: string | null;
  className: string;
  width: number;
  height: number;
  imgLeft: number;
  imgTop: number;
  imgW: number;
  imgH: number;
  extraStyle?: CSSProperties;
  children?: ReactNode;
};

function PaperLayer({
  imageUrl,
  clip,
  tint,
  className,
  width,
  height,
  imgLeft,
  imgTop,
  imgW,
  imgH,
  extraStyle,
  children,
}: PaperLayerProps) {
  // The mask URL must match the same src + size as the img so tint only
  // paints over opaque pixels even after aspect-ratio letterboxing.
  const maskPos = `${imgLeft}px ${imgTop}px`;
  const maskSize = `${imgW}px ${imgH}px`;
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        clipPath: clip,
        WebkitClipPath: clip,
        ...extraStyle,
      }}
    >
      {/* Native img (not next/image): same src must be used as the mask below.
          next/image may serve a different optimised variant, misaligning the mask. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        width={width}
        height={height}
        draggable={false}
        style={{
          position: "absolute",
          left: imgLeft,
          top: imgTop,
          width: imgW,
          height: imgH,
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
      {tint ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: tint,
            mixBlendMode: "multiply",
            WebkitMaskImage: `url(${imageUrl})`,
            maskImage: `url(${imageUrl})`,
            WebkitMaskPosition: maskPos,
            maskPosition: maskPos,
            WebkitMaskSize: maskSize,
            maskSize: maskSize,
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            pointerEvents: "none",
          }}
        />
      ) : null}
      {children}
    </div>
  );
}
