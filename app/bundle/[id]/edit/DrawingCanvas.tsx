"use client";

import { useRef, useState } from "react";
import { Undo2, Trash2 } from "lucide-react";
import { paperBg, type PaperStyle, PAPER_STYLES } from "./PositionedLetterCanvas";
import type { Stroke } from "@/lib/types";

const COLORS = ["var(--color-ink)", "#c06a4a", "#5a6e8a", "#7a8c6a", "#8a6a9b", "#1a1a1a"];
const WIDTHS = [
  { w: 0.5, label: "Thin"   },
  { w: 1.0, label: "Medium" },
  { w: 1.8, label: "Thick"  },
];

type Props = {
  onAdd: (strokes: Stroke[], paperStyle: PaperStyle) => void;
  onCancel: () => void;
};

export function DrawingCanvas({ onAdd, onCancel }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [strokes, setStrokes]       = useState<Stroke[]>([]);
  const [current, setCurrent]       = useState<Stroke | null>(null);
  const [color, setColor]           = useState<string>("var(--color-ink)");
  const [width, setWidth]           = useState<number>(1.0);
  const [paperStyle, setPaperStyle] = useState<PaperStyle>("blank");

  const pointFromEvent = (e: React.PointerEvent<SVGSVGElement>): [number, number] => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return [x, y];
  };

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    svgRef.current!.setPointerCapture(e.pointerId);
    const p = pointFromEvent(e);
    setCurrent({ points: [p], color, width });
  };

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!current) return;
    const p = pointFromEvent(e);
    setCurrent((s) => (s ? { ...s, points: [...s.points, p] } : s));
  };

  const onUp = () => {
    if (!current) return;
    if (current.points.length >= 2) setStrokes((ss) => [...ss, current]);
    setCurrent(null);
  };

  const undo  = () => setStrokes((ss) => ss.slice(0, -1));
  const clear = () => { setStrokes([]); setCurrent(null); };

  const canSubmit = strokes.length > 0;

  const pathFor = (s: Stroke) =>
    s.points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Paper + tools */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Paper
        </span>
        {PAPER_STYLES.map((s) => (
          <button key={s} type="button" onClick={() => setPaperStyle(s)}
            style={{
              borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer",
              background: paperStyle === s ? "var(--color-ink)" : "transparent",
              color: paperStyle === s ? "var(--color-bg)" : "var(--color-ink)",
              border: `1px solid ${paperStyle === s ? "var(--color-ink)" : "var(--color-muted)"}`,
            }}>
            {s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}

        <div style={{ width: 1, height: 18, background: "var(--color-muted)", opacity: 0.3 }} />

        {/* Colors */}
        {COLORS.map((c) => (
          <button key={c} type="button" aria-label={`Color ${c}`}
            onClick={() => setColor(c)}
            style={{
              width: 20, height: 20, borderRadius: "50%", cursor: "pointer",
              background: c,
              border: color === c ? "2px solid var(--color-ink)" : "2px solid transparent",
              outline: color === c ? "1.5px solid rgba(255,255,255,0.9)" : "none",
              outlineOffset: 1,
            }} />
        ))}

        <div style={{ width: 1, height: 18, background: "var(--color-muted)", opacity: 0.3 }} />

        {/* Widths */}
        {WIDTHS.map(({ w, label }) => (
          <button key={w} type="button" onClick={() => setWidth(w)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              borderRadius: 6, padding: "3px 8px", fontSize: 11, cursor: "pointer",
              background: width === w ? "var(--color-ink)" : "transparent",
              color: width === w ? "var(--color-bg)" : "var(--color-ink)",
              border: `1px solid ${width === w ? "var(--color-ink)" : "var(--color-muted)"}`,
            }}>
            <span style={{
              display: "inline-block", width: 14, height: w * 2.5,
              background: "currentColor", borderRadius: 999,
            }} />
            {label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button type="button" onClick={undo} disabled={!strokes.length}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: strokes.length ? "pointer" : "default",
            background: "transparent", color: "var(--color-ink)",
            border: "1px solid var(--color-muted)", opacity: strokes.length ? 1 : 0.4,
          }}>
          <Undo2 size={12} /> Undo
        </button>
        <button type="button" onClick={clear} disabled={!strokes.length}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: strokes.length ? "pointer" : "default",
            background: "transparent", color: "#d94f3a",
            border: "1px solid #d94f3a", opacity: strokes.length ? 1 : 0.4,
          }}>
          <Trash2 size={12} /> Clear
        </button>
      </div>

      {/* Canvas */}
      <div
        style={{
          position: "relative",
          width: "100%", aspectRatio: "560/380",
          background: "var(--color-paper, #fdfaf2)",
          backgroundImage: paperBg(paperStyle),
          backgroundPosition: "0 36px",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.1)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.6)",
          overflow: "hidden",
          touchAction: "none",
        }}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 100 67.857"
          preserveAspectRatio="none"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "crosshair", display: "block" }}
        >
          {strokes.map((s, i) => (
            <path key={i} d={pathFor(s)}
              stroke={s.color} strokeWidth={s.width}
              fill="none" strokeLinecap="round" strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: `${s.width * 1.5}px` }} />
          ))}
          {current && (
            <path d={pathFor(current)}
              stroke={current.color}
              fill="none" strokeLinecap="round" strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: `${current.width * 1.5}px` }} />
          )}
        </svg>

        {strokes.length === 0 && !current && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none", color: "var(--color-muted)", fontSize: 14, opacity: 0.55,
            fontFamily: "var(--font-hand)",
          }}>
            Sign or draw here…
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel}
          style={{
            borderRadius: 999, padding: "8px 16px", fontSize: 13,
            background: "none", border: "1px solid var(--color-muted)",
            cursor: "pointer", color: "var(--color-ink)",
          }}>
          Cancel
        </button>
        <button type="button" onClick={() => canSubmit && onAdd(strokes, paperStyle)}
          disabled={!canSubmit}
          style={{
            borderRadius: 999, padding: "8px 20px", fontSize: 13,
            background: canSubmit ? "var(--color-ink)" : "rgba(0,0,0,0.2)",
            border: "none", cursor: canSubmit ? "pointer" : "default", color: "var(--color-bg)",
          }}>
          Seal letter
        </button>
      </div>
    </div>
  );
}
