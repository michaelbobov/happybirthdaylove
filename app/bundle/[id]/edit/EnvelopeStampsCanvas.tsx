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

export type PendingStamp = { kind: "emoji" | "asset"; value: string; color?: string };

type Props = {
  stamps: EnvelopeStamp[];
  onChange: (stamps: EnvelopeStamp[]) => void;
  pending: PendingStamp | null;
  onPendingConsumed: () => void;
  width: number;
  height: number;
  /** Rendered envelope preview (EnvelopeSVG or PhotoEnvelope). */
  children: React.ReactNode;
};

type DragState =
  | { kind: "move"; id: string; offsetX: number; offsetY: number }
  | { kind: "rotate"; id: string; cx: number; cy: number; startAngle: number; startRot: number }
  | { kind: "scale"; id: string; cx: number; cy: number; startDist: number; startSize: number }
  | null;

const MIN_SIZE = 4;
const MAX_SIZE = 34;

export function EnvelopeStampsCanvas({
  stamps,
  onChange,
  pending,
  onPendingConsumed,
  width,
  height,
  children,
}: Props) {
  const uid = useId();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState>(null);

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
      size: pending.kind === "asset" ? 22 : pending.value.length > 4 ? 8 : 14,
      rotation: 0,
      color: pending.color,
    };
    onChange([...stamps, next]);
    setSelectedId(id);
    onPendingConsumed();
  };

  // ── Stamp drag: move ────────────────────────────────────────────────────
  const onStampPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
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
  }, [drag, patch]);

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
  const shorter = Math.min(width, height);

  return (
    <div style={{ position: "relative", width, height, userSelect: "none" }}>
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
          cursor: pending ? "copy" : "default",
        }}
      >
        {stamps.map((s) => {
          const cxPct = s.x;
          const cyPct = s.y;
          const sizePx = (s.size / 100) * shorter;
          const isSelected = s.id === selectedId;
          return (
            <div
              key={s.id}
              onPointerDown={(e) => onStampPointerDown(e, s.id)}
              style={{
                position: "absolute",
                left: `${cxPct}%`,
                top: `${cyPct}%`,
                width: sizePx,
                height: sizePx,
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
                    border: "1.5px dashed rgba(192,106,74,0.85)",
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
          const halfDiag = Math.sqrt(2) * (sizePx / 2) + 18;
          return (
            <>
              {/* Rotate handle — top */}
              <button
                type="button"
                aria-label="Rotate stamp"
                // eslint-disable-next-line react-hooks/refs
                onPointerDown={(e) => onHandlePointerDown(e, selected.id, "rotate")}
                style={{
                  position: "absolute",
                  left: `${selected.x}%`,
                  top: `${selected.y}%`,
                  transform: `translate(-50%, ${-halfDiag}px)`,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.95)",
                  border: "1.5px solid rgba(192,106,74,0.85)",
                  color: "var(--color-ink)",
                  cursor: "grab",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
                  touchAction: "none",
                }}
              >
                <RotateCw size={14} />
              </button>

              {/* Scale handle — bottom-right */}
              <button
                type="button"
                aria-label="Resize stamp"
                onPointerDown={(e) => onHandlePointerDown(e, selected.id, "scale")}
                style={{
                  position: "absolute",
                  left: `${selected.x}%`,
                  top: `${selected.y}%`,
                  transform: `translate(${halfDiag - 14}px, ${halfDiag - 14}px)`,
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.95)",
                  border: "1.5px solid rgba(192,106,74,0.85)",
                  color: "var(--color-ink)",
                  cursor: "nwse-resize",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
                  touchAction: "none",
                }}
              >
                <Maximize2 size={12} />
              </button>

              {/* Delete button — top-right of envelope, absolute, not on stamp */}
              <button
                type="button"
                aria-label="Remove stamp"
                onClick={(e) => { e.stopPropagation(); remove(selected.id); }}
                style={{
                  position: "absolute",
                  left: `${selected.x}%`,
                  top: `${selected.y}%`,
                  transform: `translate(${halfDiag - 14}px, ${-halfDiag}px)`,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.95)",
                  border: "1.5px solid #d94f3a",
                  color: "#d94f3a",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
                }}
              >
                <Trash2 size={12} />
              </button>
            </>
          );
        })()}
      </div>

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
          {pending.kind === "emoji" ? (
            <span style={{ fontSize: 18 }}>{pending.value}</span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pending.value} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />
          )}
          click the envelope to place
        </div>
      )}
    </div>
  );
}
