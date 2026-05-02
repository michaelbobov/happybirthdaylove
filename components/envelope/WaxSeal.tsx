"use client";

import { forwardRef, useId } from "react";
import type { SVGProps } from "react";

type Props = SVGProps<SVGGElement> & {
  cx: number;
  cy: number;
  r?: number;
  color?: string;
  monogram?: string;
  /** Optional class applied to the seal body group — handy for GSAP selection. */
  sealClassName?: string;
  /** When set, renders a PNG seal instead of the drawn SVG blob. */
  imageUrl?: string;
};

/**
 * A breakable wax seal. The full seal is a <g> whose children can be animated
 * by GSAP (scaled away, shattered into fragments) on open.
 */
export const WaxSeal = forwardRef<SVGGElement, Props>(function WaxSeal(
  {
    cx, cy, r = 40,
    color = "#a02822",
    monogram = "",
    sealClassName = "wax-seal",
    imageUrl = "/images/seal.png",
    ...rest
  },
  ref,
) {
  const drip = r * 0.15;
  const uid = useId().replace(/[:]/g, "");

  if (imageUrl) {
    const size = r * 2.35;
    const x = cx - size / 2;
    const y = cy - size / 2;
    const pieces = [
      {
        id: "bottom",
        className: "wax-seal-bottom",
        points: `${x},${cy} ${x + size},${cy} ${x + size},${y + size} ${x},${y + size}`,
      },
      {
        id: "top",
        className: "wax-seal-top",
        points: `${x},${y} ${x + size},${y} ${x + size},${cy} ${x},${cy}`,
      },
    ];

    return (
      <g ref={ref} className={sealClassName} {...rest}>
        <defs>
          {pieces.map((piece) => (
            <clipPath key={piece.id} id={`seal-piece-${uid}-${piece.id}`}>
              <polygon points={piece.points} />
            </clipPath>
          ))}
        </defs>
        <ellipse
          className="wax-seal-shadow"
          cx={cx + 1}
          cy={cy + r * 0.55}
          rx={r * 0.95}
          ry={r * 0.2}
          fill="rgba(0,0,0,0.28)"
        />
        {pieces.map((piece) => (
          <image
            key={piece.id}
            className={`wax-seal-piece ${piece.className}`}
            href={imageUrl}
            x={x}
            y={y}
            width={size}
            height={size}
            preserveAspectRatio="xMidYMid meet"
            clipPath={`url(#seal-piece-${uid}-${piece.id})`}
          >
            <title>Wax seal</title>
          </image>
        ))}
        {monogram ? (
          <text
            x={cx}
            y={cy + r * 0.12}
            textAnchor="middle"
            fontSize={r * 0.9}
            fontFamily="var(--font-display-warm, serif)"
            fill="rgba(0,0,0,0.35)"
            fontWeight={700}
          >
            {monogram}
          </text>
        ) : null}
      </g>
    );
  }

  return (
    <g ref={ref} className={sealClassName} {...rest}>
      {/* drop shadow */}
      <ellipse cx={cx + 1} cy={cy + r * 0.55} rx={r * 0.95} ry={r * 0.2} fill="rgba(0,0,0,0.28)" />
      {/* outer irregular blob */}
      <path
        d={`M ${cx - r} ${cy}
            C ${cx - r} ${cy - r * 1.05}, ${cx - r * 0.3} ${cy - r * 1.1}, ${cx} ${cy - r}
            C ${cx + r * 0.5} ${cy - r * 1.1}, ${cx + r} ${cy - r * 0.4}, ${cx + r} ${cy}
            C ${cx + r} ${cy + r * 0.6}, ${cx + r * 0.4} ${cy + r + drip}, ${cx} ${cy + r + drip}
            C ${cx - r * 0.5} ${cy + r + drip}, ${cx - r} ${cy + r * 0.6}, ${cx - r} ${cy} Z`}
        fill={color}
      />
      {/* inner highlight */}
      <path
        d={`M ${cx - r * 0.72} ${cy - r * 0.1}
            C ${cx - r * 0.55} ${cy - r * 0.75}, ${cx + r * 0.4} ${cy - r * 0.95}, ${cx + r * 0.7} ${cy - r * 0.2}`}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={r * 0.12}
        strokeLinecap="round"
        fill="none"
      />
      {/* monogram */}
      {monogram ? (
        <text
          x={cx}
          y={cy + r * 0.12}
          textAnchor="middle"
          fontSize={r * 0.9}
          fontFamily="var(--font-display-warm, serif)"
          fill="rgba(0,0,0,0.35)"
          fontWeight={700}
        >
          {monogram}
        </text>
      ) : null}
    </g>
  );
});
