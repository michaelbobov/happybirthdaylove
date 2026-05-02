/**
 * Shared layout helpers for envelope text boxes (front caption + placed text).
 * Uses Canvas measureText when available; falls back to a rough heuristic on the server.
 */

type BoundsPct = { minX: number; maxX: number; minY: number; maxY: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function wrapParagraphToWidth(
  ctx: CanvasRenderingContext2D,
  paragraph: string,
  maxWidthPx: number,
): string[] {
  const words = paragraph.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = words[0]!;
  for (let i = 1; i < words.length; i++) {
    const word = words[i]!;
    const trial = `${line} ${word}`;
    if (ctx.measureText(trial).width <= maxWidthPx) {
      line = trial;
    } else {
      lines.push(line);
      line = word;
      // Hard-break extremely long tokens so we never return infinite width.
      while (ctx.measureText(line).width > maxWidthPx && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidthPx) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
  }
  lines.push(line);
  return lines;
}

function layoutWrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidthPx: number,
): string[] {
  const paras = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];
  for (const p of paras) {
    if (!p.trim()) {
      lines.push("");
      continue;
    }
    lines.push(...wrapParagraphToWidth(ctx, p, maxWidthPx));
  }
  return lines;
}

function fallbackBoxPct(maxWidthPct: number, text: string, lineHeight: number): { widthPct: number; heightPct: number } {
  const t = text.trim();
  const avgChar = 0.52;
  const lines = Math.max(1, t.split("\n").length);
  const longest = t.split(/\n/).reduce((m, line) => Math.max(m, line.length), 0);
  const widthPct = clamp((longest * avgChar * lineHeight * 0.85 * 100) / 540, 12, maxWidthPct);
  const heightPct = clamp((lines * lineHeight * 1.2 * 100) / 350, 6, 70);
  return { widthPct, heightPct };
}

export function measureEnvelopeTextBoxPct(options: {
  text: string;
  envelopeWidthPx: number;
  envelopeHeightPx: number;
  /** Font size in px for this box (matches overlay `fontSize` / SVG foreignObject). */
  fontSizePx: number;
  fontFamily: string;
  /** Max column width as % of envelope width (derived from safe caption bounds). */
  maxWidthPct: number;
  /** Matches overlays: front uses 1.2, placed text uses 1.15 */
  lineHeight?: number;
  horizontalPaddingPx?: number;
  verticalPaddingPx?: number;
}): { widthPct: number; heightPct: number } {
  const {
    text,
    envelopeWidthPx,
    envelopeHeightPx,
    fontSizePx,
    fontFamily,
    maxWidthPct,
    lineHeight = 1.2,
    horizontalPaddingPx = 10,
    verticalPaddingPx = 8,
  } = options;

  const trimmed = text.trim();
  if (!trimmed) return { widthPct: 18, heightPct: 8 };

  const maxWidthPx = (maxWidthPct / 100) * envelopeWidthPx;

  if (typeof window === "undefined") {
    return fallbackBoxPct(maxWidthPct, trimmed, fontSizePx * lineHeight);
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return fallbackBoxPct(maxWidthPct, trimmed, fontSizePx * lineHeight);

  ctx.font = `${fontSizePx}px ${fontFamily}`;
  const innerMax = Math.max(40, maxWidthPx - horizontalPaddingPx * 2);
  const lines = layoutWrappedLines(ctx, trimmed, innerMax);
  let maxLineW = 0;
  for (const line of lines) {
    maxLineW = Math.max(maxLineW, line ? ctx.measureText(line).width : 0);
  }

  const textWidthPx = maxLineW + horizontalPaddingPx * 2;
  const textHeightPx = lines.length * fontSizePx * lineHeight + verticalPaddingPx * 2;

  const widthPct = clamp((textWidthPx / envelopeWidthPx) * 100, 12, maxWidthPct);
  const heightPct = clamp((textHeightPx / envelopeHeightPx) * 100, 6, 78);

  return { widthPct, heightPct };
}

export function captionHorizontalRangePct(bounds: BoundsPct): number {
  return clamp(bounds.maxX - bounds.minX, 18, 92);
}
