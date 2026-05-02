import type { EnvelopeStamp } from "@/lib/stamps";

/**
 * Non-interactive SVG overlay that renders envelope stamps at the same
 * coordinate system as EnvelopeSVG. Used to layer stamps on top of
 * PhotoEnvelope (which is a raster image, not SVG).
 */
export function EnvelopeStampsOverlay({
  stamps,
  width,
  height,
}: {
  stamps: EnvelopeStamp[] | undefined;
  width: number;
  height: number;
}) {
  if (!stamps || stamps.length === 0) return null;
  const shorter = Math.min(width, height);
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden
    >
      {stamps.map((s) => {
        const cx = (s.x / 100) * width;
        const cy = (s.y / 100) * height;
        const sizePx = (s.size / 100) * shorter;
        const t = `rotate(${s.rotation} ${cx} ${cy})`;
        return s.kind === "asset" ? (
          <image
            key={s.id}
            href={s.value}
            x={cx - sizePx / 2}
            y={cy - sizePx / 2}
            width={sizePx}
            height={sizePx}
            transform={t}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <text
            key={s.id}
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={sizePx}
            fill={s.color ?? "currentColor"}
            transform={t}
          >
            {s.value}
          </text>
        );
      })}
    </svg>
  );
}
