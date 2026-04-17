import type { EnvelopeDesign } from "@/lib/themes";

/**
 * Reusable SVG <defs> patterns keyed by pattern id.
 * Rendered once inside each envelope svg's <defs> so designs can reference them.
 */
export function EnvelopePatterns({ design, idPrefix }: { design: EnvelopeDesign; idPrefix: string }) {
  const stroke = design.accent ?? design.seal;
  return (
    <defs>
      <pattern id={`${idPrefix}-dots`} width="22" height="22" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="2" fill={stroke} opacity="0.35" />
        <circle cx="15" cy="13" r="1.5" fill={stroke} opacity="0.25" />
      </pattern>
      <pattern id={`${idPrefix}-linen`} width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M0 3 H6 M3 0 V6" stroke={stroke} strokeWidth="0.4" opacity="0.18" />
      </pattern>
      <pattern id={`${idPrefix}-stripes`} width="28" height="28" patternUnits="userSpaceOnUse">
        <rect width="14" height="28" fill={stroke} opacity="0.18" />
      </pattern>
      <pattern id={`${idPrefix}-grid`} width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M0 0 H20 V20" fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.25" />
      </pattern>
      <pattern id={`${idPrefix}-confetti`} width="40" height="40" patternUnits="userSpaceOnUse">
        <rect x="4" y="6" width="6" height="2" fill="#ff5e8a" opacity="0.8" transform="rotate(20 7 7)" />
        <rect x="22" y="18" width="5" height="2" fill="#7c3aed" opacity="0.8" transform="rotate(-35 24 19)" />
        <circle cx="32" cy="8" r="1.6" fill="#14b8a6" opacity="0.85" />
        <circle cx="12" cy="28" r="1.2" fill="#eab308" opacity="0.85" />
      </pattern>
      <pattern id={`${idPrefix}-botanical`} width="50" height="50" patternUnits="userSpaceOnUse">
        <path
          d="M10 40 C 14 30, 18 25, 22 20 M22 20 q -4 -1 -7 2 M22 20 q 1 -4 5 -5 M22 20 q 3 0 5 -3"
          stroke={stroke}
          strokeWidth="0.9"
          fill="none"
          opacity="0.45"
        />
      </pattern>
      <linearGradient id={`${idPrefix}-foil`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f2d272" />
        <stop offset="35%" stopColor="#b6862d" />
        <stop offset="65%" stopColor="#f6e5a7" />
        <stop offset="100%" stopColor="#8a5c17" />
      </linearGradient>
    </defs>
  );
}

export function patternFillUrl(idPrefix: string, design: EnvelopeDesign): string | undefined {
  if (!design.pattern || design.pattern === "none") return undefined;
  return `url(#${idPrefix}-${design.pattern})`;
}
