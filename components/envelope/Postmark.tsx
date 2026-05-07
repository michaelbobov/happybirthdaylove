/**
 * Round postmark stamp — adapted from BackboardCircle in HeroCollage.tsx so the
 * decoration users get in envelope customization matches the look they already
 * see on the landing page. Renders as SVG so it scales cleanly at any size.
 *
 * Two call shapes:
 *   - <PostmarkGroup .../>: returns an <g> for use inside an existing SVG
 *     canvas (EnvelopeSVG, EnvelopeStampsOverlay).
 *   - <PostmarkSvg .../>: a self-contained <svg> for HTML thumbnails (the
 *     stamp picker) and the interactive canvas overlay.
 */

const DEFAULT_COLOR = "var(--color-seal, #a02822)";

type CommonProps = {
  /** Diameter of the stamp in CSS pixels. */
  sizePx: number;
  /** Curved text along the upper arc. */
  outerText?: string;
  /** Center text. Often a date, year, or short tag. */
  innerText?: string;
  /** Defaults to the active theme's seal color. */
  color?: string;
  /** Opacity, 0..1. Defaults to 0.85 — postmarks read best slightly faded. */
  opacity?: number;
};

type GroupProps = CommonProps & {
  /** Center x in the parent SVG's coordinate space. */
  cx: number;
  /** Center y in the parent SVG's coordinate space. */
  cy: number;
  /** Rotation in degrees, applied around (cx, cy). */
  rotation?: number;
  /** Stable id used to disambiguate the curved-text path defs across multiple postmarks. */
  uid: string;
};

export function PostmarkGroup({
  sizePx,
  outerText,
  innerText,
  color = DEFAULT_COLOR,
  opacity = 0.85,
  cx,
  cy,
  rotation = 0,
  uid,
}: GroupProps) {
  const r = sizePx / 2 - sizePx * 0.05;
  const innerR = r - sizePx * 0.13;
  const arcR = r - sizePx * 0.085;
  const arcStartX = cx - arcR;
  const arcStartY = cy;
  const arcEndDx = arcR * 2;
  const pathId = `postmark-arc-${uid}`;

  return (
    <g
      transform={`rotate(${rotation} ${cx} ${cy})`}
      style={{ color, opacity }}
    >
      {/* Outer dashed ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={Math.max(1, sizePx * 0.013)}
        strokeDasharray={`${sizePx * 0.045} ${sizePx * 0.038}`}
      />
      {/* Inner solid hairline ring */}
      <circle
        cx={cx}
        cy={cy}
        r={innerR}
        fill="none"
        stroke="currentColor"
        strokeWidth={Math.max(0.6, sizePx * 0.008)}
        opacity={0.75}
      />
      {/* Curved text along upper arc */}
      {outerText ? (
        <>
          <defs>
            <path
              id={pathId}
              d={`M ${arcStartX} ${arcStartY} a ${arcR} ${arcR} 0 0 1 ${arcEndDx} 0`}
            />
          </defs>
          <text
            fontFamily="var(--font-display-warm, Caveat, cursive)"
            fontSize={sizePx * 0.108}
            letterSpacing={sizePx * 0.014}
            fill="currentColor"
          >
            <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
              {outerText}
            </textPath>
          </text>
        </>
      ) : null}
      {/* Center text */}
      {innerText ? (
        <text
          x={cx}
          y={cy + sizePx * 0.06}
          textAnchor="middle"
          fontFamily="var(--font-display-warm, Caveat, cursive)"
          fontSize={sizePx * 0.22}
          fill="currentColor"
        >
          {innerText}
        </text>
      ) : null}
      {/* Diagonal cancellation lines */}
      <line
        x1={cx - sizePx * 0.32}
        y1={cy + sizePx * 0.12}
        x2={cx + sizePx * 0.32}
        y2={cy + sizePx * 0.1}
        stroke="currentColor"
        strokeWidth={Math.max(1, sizePx * 0.013)}
        opacity={0.6}
      />
      <line
        x1={cx - sizePx * 0.32}
        y1={cy + sizePx * 0.2}
        x2={cx + sizePx * 0.32}
        y2={cy + sizePx * 0.18}
        stroke="currentColor"
        strokeWidth={Math.max(1, sizePx * 0.013)}
        opacity={0.4}
      />
    </g>
  );
}

type SvgProps = CommonProps & {
  /** Optional id suffix for arc path uniqueness — must be stable per stamp. */
  uid?: string;
};

/**
 * Self-contained square SVG suitable for HTML embedding (picker thumbnails,
 * the interactive editing overlay).
 */
export function PostmarkSvg({
  sizePx,
  outerText,
  innerText,
  color,
  opacity,
  uid,
}: SvgProps) {
  const id = uid ?? `pm-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox={`0 0 ${sizePx} ${sizePx}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <PostmarkGroup
        sizePx={sizePx}
        outerText={outerText}
        innerText={innerText}
        color={color}
        opacity={opacity}
        cx={sizePx / 2}
        cy={sizePx / 2}
        uid={id}
      />
    </svg>
  );
}
