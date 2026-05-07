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
import { PostmarkGroup } from "./Postmark";

/**
 * Non-interactive SVG overlay that renders envelope stamps at the same
 * coordinate system as EnvelopeSVG. Used to layer stamps on top of
 * PhotoEnvelope (which is a raster image, not SVG).
 */
export function EnvelopeStampsOverlay({
  stamps,
  frontText,
  width,
  height,
}: {
  stamps: EnvelopeStamp[] | undefined;
  frontText?: string | null;
  width: number;
  height: number;
}) {
  const text = frontText?.trim();
  const frontTextPlacement = stamps?.find((s) => s.id === ENVELOPE_FRONT_TEXT_STAMP_ID);
  const decorativeStamps = stamps?.filter((s) => s.id !== ENVELOPE_FRONT_TEXT_STAMP_ID) ?? [];
  if (!text && decorativeStamps.length === 0) return null;
  const shorter = Math.min(width, height);
  const frontTextX = ((frontTextPlacement?.x ?? DEFAULT_FRONT_TEXT_POSITION.x) / 100) * width;
  const frontTextY = ((frontTextPlacement?.y ?? DEFAULT_FRONT_TEXT_POSITION.y) / 100) * height;
  const frontTextSize = ((frontTextPlacement?.size ?? DEFAULT_FRONT_TEXT_SIZE) / 100) * shorter;
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
    text: text ?? "",
    envelopeWidthPx: width,
    envelopeHeightPx: height,
    fontSizePx: frontTextSize,
    fontFamily: frontTextPlacement?.fontFamily ?? DEFAULT_FRONT_TEXT_FONT,
    maxWidthPct: maxCaptionColPct,
    lineHeight: 1.2,
  });
  const frontTextWidth =
    frontTextPlacement?.width != null ? (frontTextPlacement.width / 100) * width : (autoFront.widthPct / 100) * width;
  const frontTextHeight =
    frontTextPlacement?.height != null
      ? (frontTextPlacement.height / 100) * height
      : (autoFront.heightPct / 100) * height;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      aria-hidden
    >
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
            }}
          >
            {text}
          </div>
        </foreignObject>
      ) : null}
      {decorativeStamps.map((s) => {
        const cx = (s.x / 100) * width;
        const cy = (s.y / 100) * height;
        const sizePx = (s.size / 100) * shorter;
        const t = `rotate(${s.rotation} ${cx} ${cy})`;
        if (s.kind === "asset") {
          return (
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
              transform={t}
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
            transform={t}
          >
            {s.value}
          </text>
        );
      })}
    </svg>
  );
}
