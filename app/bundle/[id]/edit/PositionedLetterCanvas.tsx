"use client";

import { useCallback, useRef, useState } from "react";
import { RotateCw, Trash2, Type, Sticker as StickerIcon } from "lucide-react";
import type { Sticker, TextBlock } from "@/lib/types";
import { STICKER_LIBRARY, searchStickers } from "@/lib/stickers";

const FONTS: Array<{ id: string; label: string }> = [
  { id: "var(--font-hand)",    label: "Handwriting" },
  { id: "var(--font-display)", label: "Display" },
  { id: "var(--font-body)",    label: "Classic" },
  { id: "monospace",           label: "Typewriter" },
];
const SIZES = [14, 18, 24, 32];
const COLORS = [
  "var(--color-ink)", "#c06a4a", "#5a6e8a", "#7a8c6a", "#8a6a9b",
];

export const PAPER_STYLES = ["blank", "lined", "grid"] as const;
export type PaperStyle = (typeof PAPER_STYLES)[number];

export function paperBg(style: PaperStyle): string {
  if (style === "lined")
    return "repeating-linear-gradient(to bottom, transparent 0 27px, rgba(150,120,80,0.22) 27px 28px)";
  if (style === "grid")
    return [
      "repeating-linear-gradient(to bottom, transparent 0 27px, rgba(150,120,80,0.15) 27px 28px)",
      "repeating-linear-gradient(to right, transparent 0 27px, rgba(150,120,80,0.15) 27px 28px)",
    ].join(", ");
  return "none";
}

type Props = {
  onAdd: (blocks: TextBlock[], stickers: Sticker[], paperStyle: PaperStyle) => void;
  onCancel: () => void;
};

type Selection = { kind: "text"; id: string } | { kind: "sticker"; id: string } | null;

export function PositionedLetterCanvas({ onAdd, onCancel }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [blocks, setBlocks]         = useState<TextBlock[]>([]);
  const [stickers, setStickers]     = useState<Sticker[]>([]);
  const [selection, setSelection]   = useState<Selection>(null);
  const [paperStyle, setPaperStyle] = useState<PaperStyle>("lined");
  const [tool, setTool]             = useState<"text" | "sticker">("text");
  const [pendingEmoji, setPending]  = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerCat, setPickerCat]   = useState(STICKER_LIBRARY[0].id);
  const [pickerQuery, setPickerQuery] = useState("");

  const onCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target !== canvasRef.current) return;
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      if (tool === "sticker" && pendingEmoji) {
        const id = crypto.randomUUID();
        setStickers((ss) => [
          ...ss,
          { id, x, y, emoji: pendingEmoji, size: 44, rotation: 0 },
        ]);
        setSelection({ kind: "sticker", id });
        return;
      }

      const id = crypto.randomUUID();
      setBlocks((bs) => [
        ...bs,
        {
          id, x, y, text: "",
          fontFamily: "var(--font-hand)", fontSize: 18,
          color: "var(--color-ink)", bold: false, italic: false,
        },
      ]);
      setSelection({ kind: "text", id });
      requestAnimationFrame(() => document.getElementById(`block-${id}`)?.focus());
    },
    [tool, pendingEmoji],
  );

  const patch = (id: string, partial: Partial<TextBlock>) =>
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...partial } : b)));
  const patchSticker = (id: string, partial: Partial<Sticker>) =>
    setStickers((ss) => ss.map((s) => (s.id === id ? { ...s, ...partial } : s)));

  const remove = (id: string) => {
    setBlocks((bs) => bs.filter((b) => b.id !== id));
    setSelection(null);
  };
  const removeSticker = (id: string) => {
    setStickers((ss) => ss.filter((s) => s.id !== id));
    setSelection(null);
  };

  const selected = selection?.kind === "text"
    ? blocks.find((b) => b.id === selection.id) ?? null
    : null;
  const selectedSticker = selection?.kind === "sticker"
    ? stickers.find((s) => s.id === selection.id) ?? null
    : null;

  const canSubmit = blocks.some((b) => b.text.trim()) || stickers.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Paper + tool row */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
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

        <div style={{ width: 1, height: 18, background: "var(--color-muted)", opacity: 0.3, margin: "0 4px" }} />

        {/* Tool toggle */}
        <button type="button"
          onClick={() => { setTool("text"); setPending(null); setShowPicker(false); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer",
            background: tool === "text" ? "var(--color-ink)" : "transparent",
            color: tool === "text" ? "var(--color-bg)" : "var(--color-ink)",
            border: `1px solid ${tool === "text" ? "var(--color-ink)" : "var(--color-muted)"}`,
          }}>
          <Type size={12} /> Text
        </button>
        <button type="button"
          onClick={() => { setTool("sticker"); setShowPicker((v) => !v); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer",
            background: tool === "sticker" ? "var(--color-ink)" : "transparent",
            color: tool === "sticker" ? "var(--color-bg)" : "var(--color-ink)",
            border: `1px solid ${tool === "sticker" ? "var(--color-ink)" : "var(--color-muted)"}`,
          }}>
          <StickerIcon size={12} /> Stickers
        </button>
        {tool === "sticker" && pendingEmoji && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--color-muted)",
            background: "rgba(255,255,255,0.65)", borderRadius: 6, padding: "3px 8px",
          }}>
            <span style={{ fontSize: 16 }}>{pendingEmoji}</span> click to place
          </span>
        )}
      </div>

      {/* Sticker picker */}
      {showPicker && tool === "sticker" && (() => {
        const searchResults = pickerQuery.trim() ? searchStickers(pickerQuery) : null;
        const shown = searchResults ?? (STICKER_LIBRARY.find((c) => c.id === pickerCat)?.emojis ?? []);
        return (
          <div style={{
            borderRadius: 10, padding: "10px 12px",
            background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.08)",
          }}>
            <input
              type="search"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Search stickers — try heart, cake, rocket…"
              style={{
                width: "100%", boxSizing: "border-box",
                borderRadius: 8, padding: "6px 10px", fontSize: 12,
                background: "rgba(255,255,255,0.8)",
                border: "1px solid var(--color-muted)",
                color: "var(--color-ink)", outline: "none",
                marginBottom: 8,
              }}
            />
            {!searchResults && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                {STICKER_LIBRARY.map((cat) => (
                  <button key={cat.id} type="button" onClick={() => setPickerCat(cat.id)}
                    style={{
                      borderRadius: 999, padding: "2px 10px", fontSize: 11, cursor: "pointer",
                      background: pickerCat === cat.id ? "var(--color-ink)" : "transparent",
                      color: pickerCat === cat.id ? "var(--color-bg)" : "var(--color-ink)",
                      border: `1px solid ${pickerCat === cat.id ? "var(--color-ink)" : "var(--color-muted)"}`,
                    }}>
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
            {searchResults && searchResults.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--color-muted)", padding: "12px 4px", textAlign: "center" }}>
                No stickers match &ldquo;{pickerQuery}&rdquo;
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(36px, 1fr))", gap: 4, maxHeight: 140, overflowY: "auto" }}>
                {shown.map((e, i) => (
                  <button key={`${e}-${i}`} type="button" onClick={() => setPending(e)}
                    style={{
                      fontSize: 22, lineHeight: 1, padding: 6, cursor: "pointer",
                      borderRadius: 6,
                      background: pendingEmoji === e ? "var(--color-ink)" : "transparent",
                      border: pendingEmoji === e ? "1px solid var(--color-ink)" : "1px solid transparent",
                    }}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Sticker toolbar — visible when a sticker is selected */}
      {selectedSticker && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
          padding: "8px 12px", borderRadius: 10,
          background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.08)",
        }}>
          <span style={{ fontSize: 18 }}>{selectedSticker.emoji}</span>
          <span style={{ fontSize: 11, color: "var(--color-muted)" }}>Size</span>
          <input
            type="range" min={20} max={120} value={selectedSticker.size}
            onChange={(e) => patchSticker(selectedSticker.id, { size: Number(e.target.value) })}
            style={{ width: 120 }}
          />
          <button type="button" aria-label="Rotate"
            onClick={() => patchSticker(selectedSticker.id, { rotation: ((selectedSticker.rotation + 15) % 360) })}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer",
              background: "transparent", color: "var(--color-ink)",
              border: "1px solid var(--color-muted)",
            }}>
            <RotateCw size={12} /> Rotate
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={() => removeSticker(selectedSticker.id)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer",
              color: "#d94f3a", background: "transparent", border: "1px solid #d94f3a",
            }}>
            <Trash2 size={12} /> Remove
          </button>
        </div>
      )}

      {/* Toolbar — visible when a block is selected */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
        padding: "8px 12px", borderRadius: 10, minHeight: 44,
        background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.08)",
        opacity: selected ? 1 : 0.35, pointerEvents: selected ? "auto" : "none",
        transition: "opacity 0.15s",
      }}>
        {FONTS.map((f) => (
          <button key={f.id} type="button"
            onClick={() => selected && patch(selected.id, { fontFamily: f.id })}
            style={{
              borderRadius: 6, padding: "2px 8px", fontSize: 12, cursor: "pointer",
              fontFamily: f.id,
              background: selected?.fontFamily === f.id ? "var(--color-ink)" : "transparent",
              color: selected?.fontFamily === f.id ? "var(--color-bg)" : "var(--color-ink)",
              border: `1px solid ${selected?.fontFamily === f.id ? "var(--color-ink)" : "var(--color-muted)"}`,
            }}>
            {f.label}
          </button>
        ))}

        <div style={{ width: 1, height: 18, background: "var(--color-muted)", opacity: 0.3 }} />

        {SIZES.map((s) => (
          <button key={s} type="button"
            onClick={() => selected && patch(selected.id, { fontSize: s })}
            style={{
              borderRadius: 6, padding: "2px 7px", fontSize: 11, cursor: "pointer",
              background: selected?.fontSize === s ? "var(--color-ink)" : "transparent",
              color: selected?.fontSize === s ? "var(--color-bg)" : "var(--color-ink)",
              border: `1px solid ${selected?.fontSize === s ? "var(--color-ink)" : "var(--color-muted)"}`,
            }}>
            {s}
          </button>
        ))}

        <div style={{ width: 1, height: 18, background: "var(--color-muted)", opacity: 0.3 }} />

        {COLORS.map((c) => (
          <button key={c} type="button" aria-label={`Color ${c}`}
            onClick={() => selected && patch(selected.id, { color: c })}
            style={{
              width: 16, height: 16, borderRadius: "50%", cursor: "pointer",
              background: c,
              border: selected?.color === c ? "2px solid var(--color-ink)" : "2px solid transparent",
              outline: selected?.color === c ? "1.5px solid rgba(255,255,255,0.8)" : "none",
              outlineOffset: 1,
            }} />
        ))}

        <div style={{ width: 1, height: 18, background: "var(--color-muted)", opacity: 0.3 }} />

        <button type="button"
          onClick={() => selected && patch(selected.id, { bold: !selected.bold })}
          style={{
            borderRadius: 6, padding: "2px 8px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            background: selected?.bold ? "var(--color-ink)" : "transparent",
            color: selected?.bold ? "var(--color-bg)" : "var(--color-ink)",
            border: `1px solid ${selected?.bold ? "var(--color-ink)" : "var(--color-muted)"}`,
          }}>B</button>

        <button type="button"
          onClick={() => selected && patch(selected.id, { italic: !selected.italic })}
          style={{
            borderRadius: 6, padding: "2px 8px", fontSize: 13, fontStyle: "italic", cursor: "pointer",
            background: selected?.italic ? "var(--color-ink)" : "transparent",
            color: selected?.italic ? "var(--color-bg)" : "var(--color-ink)",
            border: `1px solid ${selected?.italic ? "var(--color-ink)" : "var(--color-muted)"}`,
          }}>I</button>

        <div style={{ flex: 1 }} />

        {selected && (
          <button type="button" onClick={() => remove(selected.id)}
            style={{
              borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer",
              color: "#d94f3a", background: "transparent", border: "1px solid #d94f3a",
            }}>
            Remove
          </button>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        onClick={onCanvasClick}
        style={{
          position: "relative",
          width: "100%", aspectRatio: "560/380",
          background: "var(--color-paper, #fdfaf2)",
          backgroundImage: paperBg(paperStyle),
          backgroundPosition: "0 36px",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.1)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.6)",
          cursor: tool === "sticker" && pendingEmoji ? "copy" : "crosshair",
          userSelect: "none",
          overflow: "hidden",
        }}
      >
        {blocks.map((block) => {
          const isSelected = selection?.kind === "text" && selection.id === block.id;
          return (
            <div
              key={block.id}
              style={{
                position: "absolute",
                left: `${block.x}%`,
                top: `${block.y}%`,
                maxWidth: `${Math.max(20, 98 - block.x)}%`,
                outline: isSelected ? "1.5px dashed rgba(192,106,74,0.7)" : "none",
                outlineOffset: 4,
                borderRadius: 3,
                cursor: "text",
                userSelect: "text",
              }}
              onClick={(e) => { e.stopPropagation(); setSelection({ kind: "text", id: block.id }); }}
            >
              <div
                id={`block-${block.id}`}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => patch(block.id, { text: (e.target as HTMLDivElement).innerText })}
                onFocus={() => setSelection({ kind: "text", id: block.id })}
                style={{
                  minWidth: 24, outline: "none",
                  fontFamily: block.fontFamily,
                  fontSize: block.fontSize,
                  color: block.color,
                  fontWeight: block.bold ? 700 : 400,
                  fontStyle: block.italic ? "italic" : "normal",
                  lineHeight: 1.45,
                  userSelect: "text",
                  cursor: "text",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  padding: "0 2px",
                }}
              />
            </div>
          );
        })}

        {stickers.map((s) => {
          const isSelected = selection?.kind === "sticker" && selection.id === s.id;
          return (
            <div
              key={s.id}
              onClick={(e) => { e.stopPropagation(); setSelection({ kind: "sticker", id: s.id }); }}
              style={{
                position: "absolute",
                left: `${s.x}%`,
                top: `${s.y}%`,
                transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`,
                fontSize: s.size,
                lineHeight: 1,
                cursor: "pointer",
                userSelect: "none",
                outline: isSelected ? "1.5px dashed rgba(192,106,74,0.7)" : "none",
                outlineOffset: 4,
                borderRadius: 4,
              }}
            >
              {s.emoji}
            </div>
          );
        })}

        {blocks.length === 0 && stickers.length === 0 && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none", color: "var(--color-muted)", fontSize: 14, opacity: 0.55,
            fontFamily: "var(--font-hand)",
          }}>
            {tool === "sticker" && pendingEmoji
              ? "Click anywhere to place sticker…"
              : tool === "sticker"
              ? "Pick a sticker above, then click the paper"
              : "Click anywhere to start writing…"}
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
        <button type="button" onClick={() => { const nb = blocks.filter((b) => b.text.trim()); if (nb.length || stickers.length) onAdd(nb, stickers, paperStyle); }}
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
