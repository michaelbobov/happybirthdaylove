"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { RotateCw, Trash2, Maximize2 } from "lucide-react";
import type { EnvelopeStamp } from "@/lib/stamps";
import { measureEnvelopeTextBoxPct } from "@/lib/envelope-text-layout";
import { PostmarkSvg } from "@/components/envelope/Postmark";

/**
 * Interactive overlay for placing, moving, rotating, scaling, and deleting
 * decorative stamps on the envelope preview. Pointer-events are:
 *
 *   - Canvas background: click places pending stamp OR deselects.
 *   - Stamp node: click selects; pointer-drag moves.
 *   - Selected stamp shows handles (rotate, resize) anchored to its bounding box.
 *
 * Coordinate system: x/y as percentages of the canvas box; size as a percentage
 * of the canvas's shorter side (matches the SVG renderer in EnvelopeSVG.tsx).
 */

export type PendingStamp = {
  kind: "emoji" | "asset" | "text" | "postmark";
  value: string;
  color?: string;
  fontFamily?: string;
  size?: number;
  width?: number;
  height?: number;
  /** Postmark only: curved upper-arc text (value holds the inner center text). */
  outerText?: string;
};

type Props = {
  stamps: EnvelopeStamp[];
  onChange: (stamps: EnvelopeStamp[]) => void;
  pending: PendingStamp | null;
  onPendingConsumed: () => void;
  width: number;
  height: number;
  /** Rendered envelope preview (EnvelopeSVG or PhotoEnvelope). */
  children: React.ReactNode;
  /** Called when the user clicks the canvas background (not on a stamp).
      Lets the parent deselect peer overlays like the front-text caption. */
  onBackgroundClick?: () => void;
};

type DragState =
  | { kind: "move"; id: string; offsetX: number; offsetY: number }
  | { kind: "rotate"; id: string; cx: number; cy: number; startAngle: number; startRot: number }
  | { kind: "scale"; id: string; cx: number; cy: number; startDist: number; startSize: number }
  | {
      kind: "resizeText";
      id: string;
      edge: "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
      startX: number;
      startY: number;
      startW: number;
      startH: number;
    }
  | null;

function getStampBounds(stamp: EnvelopeStamp, sizePx: number, canvasWidth: number, canvasHeight: number) {
  if (stamp.kind !== "text") return { width: sizePx, height: sizePx };
  const auto = measureEnvelopeTextBoxPct({
    text: stamp.value,
    envelopeWidthPx: canvasWidth,
    envelopeHeightPx: canvasHeight,
    fontSizePx: sizePx,
    fontFamily: stamp.fontFamily ?? "var(--font-hand)",
    maxWidthPct: 72,
    lineHeight: 1.15,
    horizontalPaddingPx: 6,
    verticalPaddingPx: 4,
  });
  return {
    width: stamp.width ? (stamp.width / 100) * canvasWidth : (auto.widthPct / 100) * canvasWidth,
    height: stamp.height ? (stamp.height / 100) * canvasHeight : (auto.heightPct / 100) * canvasHeight,
  };
}

const MIN_SIZE = 4;
const MAX_SIZE = 34;
const TEXT_DEFAULT_SIZE = 12;

export function EnvelopeStampsCanvas({
  stamps,
  onChange,
  pending,
  onPendingConsumed,
  width,
  height,
  children,
  onBackgroundClick,
}: Props) {
  const uid = useId();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState>(null);
  const shorter = Math.min(width, height);

  const patch = useCallback(
    (id: string, partial: Partial<EnvelopeStamp>) => {
      onChange(stamps.map((s) => (s.id === id ? { ...s, ...partial } : s)));
    },
    [stamps, onChange],
  );

  const remove = useCallback(
    (id: string) => {
      onChange(stamps.filter((s) => s.id !== id));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [stamps, onChange],
  );

  // ── Placement (click canvas with a pending stamp) ───────────────────────
  const onCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== canvasRef.current) return;
    if (!pending) {
      setSelectedId(null);
      onBackgroundClick?.();
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const id = `stamp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const next: EnvelopeStamp = {
      id,
      kind: pending.kind,
      value: pending.value,
      x,
      y,
      size:
        pending.size ??
        (pending.kind === "asset"
          ? 22
          : pending.kind === "text"
          ? TEXT_DEFAULT_SIZE
          : pending.kind === "postmark"
          ? 24
          : 14),
      width: pending.kind === "text" ? pending.width : undefined,
      height: pending.kind === "text" ? pending.height : undefined,
      rotation: pending.kind === "postmark" ? -8 : 0,
      color: pending.color,
      fontFamily: pending.fontFamily,
      outerText: pending.kind === "postmark" ? pending.outerText : undefined,
    };
    onChange([...stamps, next]);
    setSelectedId(id);
    onPendingConsumed();
  };

  // ── Stamp drag: move ────────────────────────────────────────────────────
  const onStampPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    // Selecting a stamp deselects any peer overlay (front text caption).
    onBackgroundClick?.();
    const rect = canvasRef.current!.getBoundingClientRect();
    const stamp = stamps.find((s) => s.id === id)!;
    const pxX = (stamp.x / 100) * rect.width;
    const pxY = (stamp.y / 100) * rect.height;
    setDrag({
      kind: "move",
      id,
      offsetX: e.clientX - (rect.left + pxX),
      offsetY: e.clientY - (rect.top + pxY),
    });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  // ── Handle drags: rotate / scale ────────────────────────────────────────
  const onHandlePointerDown = (
    e: React.PointerEvent,
    id: string,
    mode: "rotate" | "scale",
  ) => {
    e.stopPropagation();
    const rect = canvasRef.current!.getBoundingClientRect();
    const stamp = stamps.find((s) => s.id === id)!;
    const cx = rect.left + (stamp.x / 100) * rect.width;
    const cy = rect.top + (stamp.y / 100) * rect.height;
    if (mode === "rotate") {
      setDrag({
        kind: "rotate",
        id,
        cx,
        cy,
        startAngle: Math.atan2(e.clientY - cy, e.clientX - cx),
        startRot: stamp.rotation,
      });
    } else {
      setDrag({
        kind: "scale",
        id,
        cx,
        cy,
        startDist: Math.hypot(e.clientX - cx, e.clientY - cy),
        startSize: stamp.size,
      });
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onResizeTextPointerDown = (
    e: React.PointerEvent,
    id: string,
    edge: "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se",
  ) => {
    e.stopPropagation();
    const stamp = stamps.find((s) => s.id === id);
    if (!stamp || stamp.kind !== "text") return;
    const sizePx = (stamp.size / 100) * shorter;
    const bounds = getStampBounds(stamp, sizePx, width, height);
    setDrag({
      kind: "resizeText",
      id,
      edge,
      startX: e.clientX,
      startY: e.clientY,
      startW: stamp.width ?? (bounds.width / width) * 100,
      startH: stamp.height ?? (bounds.height / height) * 100,
    });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (!drag) return;
    const onMove = (ev: PointerEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      if (drag.kind === "move") {
        const px = ev.clientX - rect.left - drag.offsetX;
        const py = ev.clientY - rect.top - drag.offsetY;
        patch(drag.id, {
          x: Math.max(-5, Math.min(105, (px / rect.width) * 100)),
          y: Math.max(-5, Math.min(105, (py / rect.height) * 100)),
        });
      } else if (drag.kind === "rotate") {
        const ang = Math.atan2(ev.clientY - drag.cy, ev.clientX - drag.cx);
        const deg = ((ang - drag.startAngle) * 180) / Math.PI;
        patch(drag.id, { rotation: drag.startRot + deg });
      } else if (drag.kind === "scale") {
        const dist = Math.hypot(ev.clientX - drag.cx, ev.clientY - drag.cy);
        const factor = dist / Math.max(drag.startDist, 1);
        const next = Math.max(MIN_SIZE, Math.min(MAX_SIZE, drag.startSize * factor));
        patch(drag.id, { size: next });
      } else if (drag.kind === "resizeText") {
        const stamp = stamps.find((s) => s.id === drag.id);
        if (!stamp || stamp.kind !== "text") return;
        const dx = ev.clientX - drag.startX;
        const dy = ev.clientY - drag.startY;
        const rad = (stamp.rotation * Math.PI) / 180;
        const ux = { x: Math.cos(rad), y: Math.sin(rad) };
        const uy = { x: -Math.sin(rad), y: Math.cos(rad) };
        const mx = (dx / width) * 100;
        const my = (dy / height) * 100;
        let dw = 0;
        let dh = 0;
        const edge = drag.edge;
        if (edge === "e" || edge === "ne" || edge === "se") dw += 2 * (mx * ux.x + my * ux.y);
        if (edge === "w" || edge === "nw" || edge === "sw") dw -= 2 * (mx * ux.x + my * ux.y);
        if (edge === "s" || edge === "sw" || edge === "se") dh += 2 * (mx * uy.x + my * uy.y);
        if (edge === "n" || edge === "nw" || edge === "ne") dh -= 2 * (mx * uy.x + my * uy.y);
        const nextW = Math.max(10, Math.min(90, drag.startW + dw));
        const nextH = Math.max(4, Math.min(48, drag.startH + dh));
        patch(drag.id, { width: nextW, height: nextH });
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, patch, stamps, height, width, shorter]);

  // Keyboard: delete selected on Backspace/Delete (unless typing in an input)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        remove(selectedId);
      }
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, remove]);

  const selected = stamps.find((s) => s.id === selectedId) ?? null;

  return (
    <div style={{ position: "relative", width, height, userSelect: "none", overflow: "visible" }}>
      {/* Envelope art — pointer events pass through to canvas so clicks on
          empty envelope areas trigger placement/deselection. */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {children}
      </div>

      {/* Interactive canvas — above the envelope art */}
      <div
        ref={canvasRef}
        onPointerDown={onCanvasPointerDown}
        data-stamps-canvas={uid}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "visible",
          cursor: pending ? "copy" : "default",
        }}
      >
        {stamps.map((s) => {
          const cxPct = s.x;
          const cyPct = s.y;
          const sizePx = (s.size / 100) * shorter;
          const bounds = getStampBounds(s, sizePx, width, height);
          const isSelected = s.id === selectedId;
          return (
            <div
              key={s.id}
              onPointerDown={(e) => onStampPointerDown(e, s.id)}
              style={{
                position: "absolute",
                left: `${cxPct}%`,
                top: `${cyPct}%`,
                width: bounds.width,
                height: bounds.height,
                transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
                cursor: drag?.kind === "move" && drag.id === s.id ? "grabbing" : "grab",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                touchAction: "none",
              }}
            >
              {s.kind === "asset" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.value}
                  alt=""
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    filter:
                      "drop-shadow(0 2px 2px rgba(0,0,0,0.18)) drop-shadow(0 0 0.5px rgba(0,0,0,0.3))",
                    pointerEvents: "none",
                  }}
                />
              ) : s.kind === "postmark" ? (
                <div style={{ width: "100%", height: "100%", pointerEvents: "none" }}>
                  <PostmarkSvg
                    sizePx={sizePx}
                    outerText={s.outerText}
                    innerText={s.value}
                    color={s.color}
                    uid={s.id}
                  />
                </div>
              ) : s.kind === "text" ? (
                <span
                  style={{
                    width: "100%",
                    color: s.color ?? "var(--color-ink)",
                    fontFamily: s.fontFamily ?? "var(--font-hand)",
                    fontSize: sizePx,
                    lineHeight: 1.15,
                    whiteSpace: "normal",
                    overflowWrap: "break-word",
                    textAlign: "center",
                    textShadow: "0 1px 0 rgba(255,255,255,0.5)",
                    pointerEvents: "none",
                  }}
                >
                  {s.value}
                </span>
              ) : (
                <span
                  style={{
                    fontSize: sizePx * 0.92,
                    lineHeight: 1.05,
                    color: s.color ?? "currentColor",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                    filter: "drop-shadow(0 1.5px 1px rgba(0,0,0,0.15))",
                    pointerEvents: "none",
                  }}
                >
                  {s.value}
                </span>
              )}

              {/* Selection chrome — rendered OUTSIDE rotation so the dashed
                  bounding box rotates with the stamp, which reads correctly. */}
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    inset: -6,
                    border: "1px dashed rgba(40,24,8,0.55)",
                    borderRadius: 4,
                    pointerEvents: "none",
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Axis-aligned handles + toolbar for the selected stamp. Placed in
            screen space (not rotated with the stamp) so they're always
            reachable. */}
        {selected && (() => {
          const sizePx = (selected.size / 100) * shorter;
          const bounds = getStampBounds(selected, sizePx, width, height);
          const halfDiag = Math.sqrt(bounds.width ** 2 + bounds.height ** 2) / 2 + 24;
          return (
            <>
              {/* Delete — top-left */}
              <button
                type="button"
                aria-label="Remove stamp"
                className="env-handle env-handle--danger"
                onClick={(e) => { e.stopPropagation(); remove(selected.id); }}
                style={{
                  position: "absolute",
                  left: `${selected.x}%`,
                  top: `${selected.y}%`,
                  transform: `translate(${-halfDiag - 3}px, ${-halfDiag}px)`,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={13} strokeWidth={2.2} />
              </button>

              {/* Rotate handle — top-right */}
              <button
                type="button"
                aria-label="Rotate stamp"
                className="env-handle env-handle--rotate"
                onPointerDown={(e) => onHandlePointerDown(e, selected.id, "rotate")}
                style={{
                  position: "absolute",
                  left: `${selected.x}%`,
                  top: `${selected.y}%`,
                  transform: `translate(${halfDiag - 25}px, ${-halfDiag}px)`,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  cursor: "grab",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  touchAction: "none",
                }}
              >
                <RotateCw size={13} strokeWidth={2.2} />
              </button>

              {selected.kind === "text"
                ? (() => {
                    const hw = bounds.width / 2;
                    const hh = bounds.height / 2;
                    const rad = (selected.rotation * Math.PI) / 180;
                    const cos = Math.cos(rad);
                    const sin = Math.sin(rad);
                    const xp = (dx: number, dy: number) =>
                      selected.x + ((dx * cos - dy * sin) / width) * 100;
                    const yp = (dx: number, dy: number) =>
                      selected.y + ((dx * sin + dy * cos) / height) * 100;
                    const handles = [
                      ["nw", xp(-hw, -hh), yp(-hw, -hh), "nwse-resize"],
                      ["n", xp(0, -hh), yp(0, -hh), "ns-resize"],
                      ["ne", xp(hw, -hh), yp(hw, -hh), "nesw-resize"],
                      ["e", xp(hw, 0), yp(hw, 0), "ew-resize"],
                      ["se", xp(hw, hh), yp(hw, hh), "nwse-resize"],
                      ["s", xp(0, hh), yp(0, hh), "ns-resize"],
                      ["sw", xp(-hw, hh), yp(-hw, hh), "nesw-resize"],
                      ["w", xp(-hw, 0), yp(-hw, 0), "ew-resize"],
                    ] as const;
                    return handles.map(([edge, left, top, cursor]) => (
                      <button
                        key={edge}
                        type="button"
                        aria-label={`Resize text ${edge}`}
                        className="env-handle"
                        onPointerDown={(e) => onResizeTextPointerDown(e, selected.id, edge)}
                        style={{
                          position: "absolute",
                          left: `${left}%`,
                          top: `${top}%`,
                          transform: "translate(-50%, -50%)",
                          width: 14,
                          height: 14,
                          borderRadius: 4,
                          cursor,
                          touchAction: "none",
                        }}
                      />
                    ));
                  })()
                : null}

              {/* Scale handle — bottom-right */}
              <button
                type="button"
                aria-label="Resize stamp"
                className="env-handle env-handle--scale"
                onPointerDown={(e) => onHandlePointerDown(e, selected.id, "scale")}
                style={{
                  position: "absolute",
                  left: `${selected.x}%`,
                  top: `${selected.y}%`,
                  transform: `translate(${halfDiag - 14}px, ${halfDiag - 14}px)`,
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  cursor: "nwse-resize",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  touchAction: "none",
                }}
              >
                <Maximize2 size={13} strokeWidth={2.4} />
              </button>
            </>
          );
        })()}
      </div>

      {selected?.kind === "text" ? (
        <TextStampInspector
          stamp={selected}
          onPatch={(partial) => patch(selected.id, partial)}
        />
      ) : null}

      {/* Pending-placement hint strip */}
      {pending && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 10,
            transform: "translateX(-50%)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(0,0,0,0.12)",
            color: "var(--color-ink)",
            fontSize: 12,
            boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
            pointerEvents: "none",
            fontFamily: "var(--font-hand)",
          }}
        >
          {pending.kind === "asset" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pending.value} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />
          ) : pending.kind === "postmark" ? (
            <span style={{ display: "inline-flex", alignItems: "center" }}>
              <PostmarkSvg sizePx={22} outerText={pending.outerText} innerText={pending.value} color={pending.color} />
            </span>
          ) : pending.kind === "text" ? (
            <span
              style={{
                maxWidth: 180,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: pending.color,
                fontFamily: pending.fontFamily ?? "var(--font-hand)",
              }}
            >
              {pending.value}
            </span>
          ) : (
            <span style={{ fontSize: 18 }}>{pending.value}</span>
          )}
          click the envelope to place
        </div>
      )}
    </div>
  );
}

function TextStampInspector({
  stamp,
  onPatch,
}: {
  stamp: EnvelopeStamp;
  onPatch: (partial: Partial<EnvelopeStamp>) => void;
}) {
  return (
    <div
      onPointerDown={(event) => event.stopPropagation()}
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 12,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto auto",
        gap: 8,
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.94)",
        border: "1px solid rgba(0,0,0,0.12)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
        color: "var(--color-ink)",
        fontSize: 11,
      }}
    >
      <InspectorRange label="Text" min={2} max={28} value={stamp.size} onChange={(size) => onPatch({ size })} />
      <span style={{ color: "var(--color-muted)", fontSize: 10, lineHeight: 1.35, maxWidth: 120 }}>
        Drag box handles on the envelope to resize.
      </span>
      <input
        type="color"
        aria-label="Selected text color"
        value={colorToInputValue(stamp.color ?? "#3b2a1e")}
        onChange={(event) => onPatch({ color: event.target.value })}
        style={{
          width: 30,
          height: 28,
          padding: 0,
          borderRadius: 8,
          border: "1px solid rgba(0,0,0,0.18)",
          background: "transparent",
        }}
      />
    </div>
  );
}

function InspectorRange({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label style={{ display: "grid", gap: 2 }}>
      <span style={{ color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label} {Math.round(value)}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function colorToInputValue(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    return `#${color.slice(1).split("").map((char) => `${char}${char}`).join("")}`;
  }
  return "#3b2a1e";
}
