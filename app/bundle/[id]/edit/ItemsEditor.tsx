"use client";

import { useRef, useState } from "react";
import {
  FileText, Image as ImageIcon, Gift, Smile, Wallet, Mic, Trash2, X,
  Ticket as TicketIcon, Camera, GripVertical, Pencil,
} from "lucide-react";
import { addItem, deleteItem, reorderItems, updateItem } from "@/app/actions/bundles";
import { VoiceRecorder } from "./VoiceRecorder";
import { PositionedLetterCanvas } from "./PositionedLetterCanvas";
import { DrawingCanvas } from "./DrawingCanvas";
import type { ItemPayload, TextBlock } from "@/lib/types";
import { photoFilterCss } from "@/components/items/Polaroid";

// Extended in-memory item — server items have only meta, session-added items
// may carry a previewPayload and previewUrl for richer display.
export type ItemRow = {
  id: string;
  envelopeId: string;
  type: string;
  orderIndex: number;
  meta: Record<string, unknown>;
  previewPayload?: ItemPayload;
  previewUrl?: string; // object URL for drag-dropped image, resolved after upload
};

type ItemFlavor = ItemPayload["type"] | "ticket";
type PhotoFrame = "polaroid" | "plain";
type PhotoFilter = "none" | "warm" | "mono" | "dreamy" | "vivid";
type PhotoFit = "cover" | "contain";
type CaptionMode = "bottom" | "onPhoto" | "hidden";

const PHOTO_FRAMES: Array<{ id: PhotoFrame; label: string }> = [
  { id: "polaroid", label: "Polaroid" },
  { id: "plain", label: "Clean photo" },
];

const PHOTO_FILTERS: Array<{ id: PhotoFilter; label: string }> = [
  { id: "none", label: "Natural" },
  { id: "warm", label: "Warm" },
  { id: "mono", label: "B&W" },
  { id: "dreamy", label: "Dreamy" },
  { id: "vivid", label: "Vivid" },
];

const PHOTO_FITS: Array<{ id: PhotoFit; label: string }> = [
  { id: "cover", label: "Fill" },
  { id: "contain", label: "Fit" },
];

const CAPTION_MODES: Array<{ id: CaptionMode; label: string }> = [
  { id: "bottom", label: "Bottom border" },
  { id: "onPhoto", label: "On photo" },
  { id: "hidden", label: "Hidden" },
];

const ITEM_TYPES: Array<{ key: ItemFlavor; label: string; icon: typeof FileText; color: string }> = [
  { key: "text",       label: "Letter",     icon: FileText,  color: "#c06a4a" },
  { key: "image",      label: "Photo",      icon: ImageIcon, color: "#7a8c6a" },
  { key: "ticket",     label: "Scan",       icon: TicketIcon, color: "#8a6a4a" },
  { key: "gif",        label: "GIF",        icon: Smile,     color: "#9b6fa8" },
  { key: "giftcard",   label: "Gift card",  icon: Gift,      color: "#d4944a" },
  { key: "money_note", label: "Cash",       icon: Wallet,    color: "#5a8fa8" },
  { key: "audio",      label: "Voice note", icon: Mic,       color: "#a85a6a" },
];

export function ItemsEditor({
  bundleId,
  envelopeId,
  initialItems,
  onItemsChange,
}: {
  bundleId: string;
  envelopeId: string;
  initialItems: ItemRow[];
  onItemsChange?: (envelopeId: string, items: ItemRow[]) => void;
}) {
  const [items, setItems] = useState<ItemRow[]>(initialItems);
  const itemsRef = useRef<ItemRow[]>(initialItems);
  const [adding, setAdding] = useState<ItemFlavor | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateItems = (updater: ItemRow[] | ((prev: ItemRow[]) => ItemRow[])) => {
    const next = typeof updater === "function" ? updater(itemsRef.current) : updater;
    itemsRef.current = next;
    setItems(next);
    onItemsChange?.(envelopeId, next);
  };

  const remove = async (id: string) => {
    const res = await deleteItem(id, bundleId);
    if (res.ok) updateItems((xs) => xs.filter((i) => i.id !== id));
  };

  const moveItem = async (dragId: string, targetId: string) => {
    if (dragId === targetId) return;
    const current = itemsRef.current;
    const from = current.findIndex((item) => item.id === dragId);
    const to = current.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;

    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const ordered = next.map((item, orderIndex) => ({ ...item, orderIndex }));
    updateItems(ordered);

    const res = await reorderItems(bundleId, envelopeId, ordered.map((item) => item.id));
    if (!res.ok) updateItems(current);
  };

  const add = async (payload: ItemPayload, meta: Record<string, unknown> = {}, extras: Partial<ItemRow> = {}) => {
    const res = await addItem({ envelopeId, orderIndex: itemsRef.current.length, payload, meta });
    if (res.ok) {
      updateItems((xs) => [
        ...xs,
        { id: res.data.id, envelopeId, type: payload.type, orderIndex: xs.length, meta, previewPayload: payload, ...extras },
      ]);
      setAdding(null);
    }
  };

  const saveEdit = async (item: ItemRow, payload: ItemPayload, meta: Record<string, unknown>, extras: Partial<ItemRow> = {}) => {
    const res = await updateItem({ itemId: item.id, bundleId, payload, meta });
    if (res.ok) {
      updateItems((xs) => xs.map((row) =>
        row.id === item.id
          ? { ...row, type: payload.type, meta, previewPayload: payload, ...extras }
          : row,
      ));
      setEditingId(null);
    }
  };

  return (
    <div>
      {/* Item preview cards */}
      {items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
            Opens in this order, top to bottom. Drag cards to reorder.
          </div>
          {items.map((item, index) => (
            <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ItemPreviewCard
                item={item}
                order={index + 1}
                dragging={draggingId === item.id}
                onDragStart={() => setDraggingId(item.id)}
                onDragEnd={() => setDraggingId(null)}
                onDropOn={() => {
                  if (draggingId) void moveItem(draggingId, item.id);
                  setDraggingId(null);
                }}
                onEdit={() => setEditingId((cur) => cur === item.id ? null : item.id)}
                onRemove={() => remove(item.id)}
              />
              {editingId === item.id ? (
                <EditItemPanel
                  item={item}
                  onCancel={() => setEditingId(null)}
                  onSave={(payload, meta, extras) => saveEdit(item, payload, meta, extras)}
                />
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Type picker */}
      {!adding && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.length > 0 && (
            <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
              Add another piece to this same envelope.
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ITEM_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setAdding(t.key)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  borderRadius: 999, padding: "7px 14px", fontSize: 12,
                  background: "rgba(255,255,255,0.5)",
                  border: "1px dashed var(--color-muted)",
                  cursor: "pointer", color: "var(--color-ink)",
                }}
              >
                <t.icon size={13} style={{ color: t.color }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add panel */}
      {adding && (
        <div style={{
          marginTop: 12,
          borderRadius: 16, padding: "18px 20px",
          background: "rgba(255,255,255,0.55)",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontWeight: 600, color: "var(--color-ink)", fontSize: 14 }}>
              {ITEM_TYPES.find((t) => t.key === adding)?.label}
            </div>
            <button type="button" onClick={() => setAdding(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>
              <X size={16} />
            </button>
          </div>
          {adding === "text"       && <LetterPanel onAdd={add} onCancel={() => setAdding(null)} />}
          {adding === "image"      && <PhotoPanel bundleId={bundleId} onAdd={add} />}
          {adding === "ticket"     && <TicketScanPanel bundleId={bundleId} onAdd={add} />}
          {adding === "gif"        && <GifPanel onAdd={add} />}
          {adding === "giftcard"   && <GiftCardPanel onAdd={add} />}
          {adding === "money_note" && <MoneyPanel onAdd={add} />}
          {adding === "audio"      && <VoiceRecorder bundleId={bundleId} onAdd={(key, dur) => add({ type: "audio", storageKey: key, durationSec: dur || undefined }, { durationSec: dur })} onCancel={() => setAdding(null)} />}
        </div>
      )}
    </div>
  );
}

// ── Item preview cards ────────────────────────────────────────────────────────

function ItemPreviewCard({
  item,
  order,
  dragging,
  onDragStart,
  onDragEnd,
  onDropOn,
  onEdit,
  onRemove,
}: {
  item: ItemRow;
  order: number;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOn: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const payload = item.previewPayload;

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      borderRadius: 12, padding: "12px 14px",
      background: dragging ? "rgba(192,106,74,0.12)" : "rgba(255,255,255,0.5)",
      border: `1px solid ${dragging ? "rgba(192,106,74,0.5)" : "rgba(0,0,0,0.07)"}`,
      opacity: dragging ? 0.72 : 1,
    }}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDropOn();
      }}
    >
      <div style={{ color: "var(--color-muted)", cursor: "grab", paddingTop: 3 }} aria-hidden="true">
        <GripVertical size={16} />
      </div>
      <div
        aria-label={`Opens ${order}`}
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-ink)",
          color: "var(--color-bg)",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {order}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {item.type === "text" && payload?.type === "text" ? (
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-muted)", marginBottom: 6 }}>
              Letter
            </div>
            {payload.mode === "positioned" ? (
              <div style={{ fontSize: 13, color: "var(--color-muted)", fontStyle: "italic" }}>
                Designed letter · {payload.blocks?.length ?? 0} text block{(payload.blocks?.length ?? 0) !== 1 ? "s" : ""}
                {(payload.stickers?.length ?? 0) > 0 && ` · ${payload.stickers!.length} sticker${payload.stickers!.length !== 1 ? "s" : ""}`}
              </div>
            ) : payload.mode === "drawn" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg viewBox="0 0 100 67.857" preserveAspectRatio="xMidYMid meet"
                  style={{ width: 80, height: 54, background: "#fdfaf2", borderRadius: 4, border: "1px solid rgba(0,0,0,0.08)" }}>
                  {(payload.strokes ?? []).map((s, i) => (
                    <path key={i}
                      d={s.points.map((p, j) => `${j === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ")}
                      stroke={s.color} fill="none"
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{ strokeWidth: `${s.width * 1.5}px` }} />
                  ))}
                </svg>
                <div style={{ fontSize: 13, color: "var(--color-muted)", fontStyle: "italic" }}>
                  Drawn letter
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontFamily: payload.fontFamily ?? "var(--font-hand)",
                  fontSize: 14, lineHeight: 1.6, color: "var(--color-ink)",
                  overflow: "hidden", maxHeight: 64,
                  backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 20px, rgba(150,120,80,0.18) 20px 21px)",
                  paddingBottom: 2,
                }}
                dangerouslySetInnerHTML={{ __html: payload.html ?? "" }}
              />
            )}
          </div>
        ) : item.type === "image" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {item.previewUrl ? (
              <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.previewUrl} alt="" style={{
                  width: 56, height: 56, objectFit: "cover",
                  borderRadius: item.meta.frame === "ticket" ? 2 : 6,
                  border: item.meta.frame === "ticket" ? "1px dashed rgba(138,106,74,0.55)" : "none",
                  background: item.meta.frame === "ticket" ? "#fbf7ec" : "transparent",
                  padding: item.meta.frame === "ticket" ? 3 : 0,
                }} />
                {payload?.type === "image" && payload.textBlocks?.map((block) => (
                  <div
                    key={block.id}
                    className="font-hand"
                    style={{
                      position: "absolute",
                      left: `${block.x}%`,
                      top: `${block.y}%`,
                      transform: "translate(-50%, -50%)",
                      color: block.color,
                      fontSize: Math.max(8, block.fontSize * 0.35),
                      lineHeight: 1,
                      textAlign: "center",
                      maxWidth: 50,
                      textShadow: "0 1px 3px rgba(0,0,0,0.65)",
                      pointerEvents: "none",
                    }}
                  >
                    {block.text}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: 6, background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>
                {item.meta.frame === "ticket" ? "🎟️" : "📷"}
              </div>
            )}
            <div>
              <div style={{ fontSize: 13, color: "var(--color-ink)", fontWeight: 500 }}>
                {item.meta.frame === "ticket" ? "Scan" : "Photo"}
              </div>
              {(item.meta.captionHint || (payload?.type === "image" && payload.caption)) && (
                <div className="font-hand" style={{ fontSize: 12, color: "var(--color-muted)" }}>
                  {(item.meta.captionHint as string) ?? (payload?.type === "image" ? payload.caption : "")}
                </div>
              )}
            </div>
          </div>
        ) : item.type === "gif" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 24 }}>✨</div>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-ink)", fontWeight: 500 }}>GIF</div>
              {payload?.type === "gif" && payload.caption && (
                <div style={{ fontSize: 12, color: "var(--color-muted)" }}>{payload.caption}</div>
              )}
            </div>
          </div>
        ) : item.type === "giftcard" ? (
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-muted)", marginBottom: 4 }}>Gift card</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink)" }}>
              {(item.meta.vendor as string) ?? "Gift card"}
            </div>
            {item.meta.publicAmount != null ? (
              <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
                {String((item.meta.publicAmount as { amount: number; currency: string }).amount)} {(item.meta.publicAmount as { amount: number; currency: string }).currency}
              </div>
            ) : null}
          </div>
        ) : item.type === "money_note" ? (
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-muted)", marginBottom: 4 }}>Cash</div>
            {item.meta.publicAmount != null ? (
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-ink)", fontFamily: "var(--font-display)" }}>
                ${String((item.meta.publicAmount as { amount: number }).amount)}
              </div>
            ) : null}
          </div>
        ) : item.type === "audio" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 20 }}>🎙</div>
            <div>
              <div style={{ fontSize: 13, color: "var(--color-ink)", fontWeight: 500 }}>Voice note</div>
              {item.meta.durationSec != null ? <div style={{ fontSize: 11, color: "var(--color-muted)" }}>{String(item.meta.durationSec)}s</div> : null}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--color-ink)", textTransform: "capitalize" }}>
            {item.type.replace("_", " ")}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit"
          style={{ background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: 28, height: 28,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            color: "var(--color-muted)", flexShrink: 0 }}
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          style={{ background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: 28, height: 28,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            color: "var(--color-muted)", flexShrink: 0 }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function EditItemPanel({
  item,
  onCancel,
  onSave,
}: {
  item: ItemRow;
  onCancel: () => void;
  onSave: (payload: ItemPayload, meta: Record<string, unknown>, extras?: Partial<ItemRow>) => void | Promise<void>;
}) {
  const payload = item.previewPayload;
  const [caption, setCaption] = useState(payload && "caption" in payload ? payload.caption ?? "" : (item.meta.captionHint as string) ?? "");
  const [textValue, setTextValue] = useState(payload?.type === "text" && (payload.mode === "typed" || payload.mode == null) ? htmlToText(payload.html ?? "") : "");
  const [gifUrl, setGifUrl] = useState(payload?.type === "gif" ? payload.url : "");
  const [frame, setFrame] = useState<PhotoFrame>((item.meta.frame as PhotoFrame) === "plain" ? "plain" : "polaroid");
  const [filter, setFilter] = useState<PhotoFilter>((item.meta.filter as PhotoFilter) ?? "none");
  const [fit, setFit] = useState<PhotoFit>((item.meta.fit as PhotoFit) ?? "cover");
  const [captionMode, setCaptionMode] = useState<CaptionMode>((item.meta.captionMode as CaptionMode) ?? "bottom");
  const firstText = payload?.type === "image" ? payload.textBlocks?.[0] : undefined;
  const [overlayText, setOverlayText] = useState(firstText?.text ?? "");
  const [overlayColor, setOverlayColor] = useState(firstText?.color ?? "#ffffff");
  const [overlaySize, setOverlaySize] = useState(firstText?.fontSize ?? 28);
  const [overlayPosition, setOverlayPosition] = useState({ x: firstText?.x ?? 50, y: firstText?.y ?? 52 });

  const setOverlayFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!item.previewUrl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setOverlayPosition({
      x: Math.max(8, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(8, Math.min(92, ((e.clientY - rect.top) / rect.height) * 100)),
    });
  };

  if (!payload) {
    return (
      <div style={editPanelSx}>
        <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
          This older item can’t be edited here yet. Delete and re-add it to change the contents.
        </div>
      </div>
    );
  }

  const actions = (disabled = false, onClick?: () => void) => (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
      <button type="button" onClick={onCancel} style={secondaryButtonSx}>Cancel</button>
      <button type="button" disabled={disabled} onClick={onClick} style={{ ...primaryButtonSx, opacity: disabled ? 0.45 : 1 }}>
        Save changes
      </button>
    </div>
  );

  if (payload.type === "image") {
    const save = () => {
      const textBlocks: TextBlock[] = [];
      if (overlayText.trim()) {
        textBlocks.push({
          id: firstText?.id ?? `${item.id}-photo-text`,
          x: overlayPosition.x,
          y: overlayPosition.y,
          text: overlayText.trim(),
          fontFamily: "var(--font-hand)",
          fontSize: overlaySize,
          color: overlayColor,
          bold: false,
          italic: false,
        });
      }
      if (captionMode === "onPhoto" && caption.trim()) {
        textBlocks.push({
          id: `${item.id}-photo-caption`,
          x: 50,
          y: 86,
          text: caption.trim(),
          fontFamily: "var(--font-hand)",
          fontSize: 24,
          color: "#ffffff",
          bold: false,
          italic: false,
        });
      }
      void onSave(
        {
          type: "image",
          storageKey: payload.storageKey,
          caption: caption || undefined,
          textBlocks: textBlocks.length ? textBlocks : undefined,
        },
        { ...item.meta, captionHint: caption || undefined, frame, filter, fit, captionMode },
        { previewPayload: { type: "image", storageKey: payload.storageKey, caption: caption || undefined, textBlocks: textBlocks.length ? textBlocks : undefined } },
      );
    };

    return (
      <div style={editPanelSx}>
        <div style={editTitleSx}>Edit photo</div>
        {item.previewUrl ? (
          <DraftPhotoPreview
            src={item.previewUrl}
            frame={frame}
            filter={filter}
            fit={fit}
            captionMode={captionMode}
            caption={caption}
            overlayText={overlayText}
            overlayColor={overlayColor}
            overlaySize={overlaySize}
            overlayPosition={overlayPosition}
            onPlaceText={setOverlayFromPointer}
          />
        ) : null}
        <PhotoOptionControls
          frame={frame}
          setFrame={setFrame}
          filter={filter}
          setFilter={setFilter}
          fit={fit}
          setFit={setFit}
          captionMode={captionMode}
          setCaptionMode={setCaptionMode}
        />
        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" className="font-hand" style={inputSx} />
        <input value={overlayText} onChange={(e) => setOverlayText(e.target.value)} placeholder="Text on photo" className="font-hand" style={inputSx} />
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--color-muted)" }}>Click the photo to place text</span>
          <input type="color" value={overlayColor} onChange={(e) => setOverlayColor(e.target.value)} aria-label="Photo text color" />
          <input type="range" min={14} max={54} value={overlaySize} onChange={(e) => setOverlaySize(Number(e.target.value))} />
        </div>
        {actions(false, save)}
      </div>
    );
  }

  if (payload.type === "text" && payload.mode !== "positioned" && payload.mode !== "drawn") {
    return (
      <div style={editPanelSx}>
        <div style={editTitleSx}>Edit letter</div>
        <textarea value={textValue} onChange={(e) => setTextValue(e.target.value)} rows={6} className="font-hand" style={{ ...inputSx, resize: "vertical", fontSize: 16 }} />
        {actions(!textValue.trim(), () => {
          const html = textValue.trim().split(/\n+/).map((p) => `<p>${escHtml(p)}</p>`).join("");
          void onSave({ type: "text", html, fontFamily: payload.fontFamily, paperStyle: payload.paperStyle }, item.meta, {
            previewPayload: { type: "text", html, fontFamily: payload.fontFamily, paperStyle: payload.paperStyle },
          });
        })}
      </div>
    );
  }

  if (payload.type === "gif") {
    return (
      <div style={editPanelSx}>
        <div style={editTitleSx}>Edit GIF</div>
        <input value={gifUrl} onChange={(e) => setGifUrl(e.target.value)} placeholder="GIF URL" style={inputSx} />
        <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" className="font-hand" style={inputSx} />
        {actions(!gifUrl, () => void onSave({ type: "gif", url: gifUrl, caption: caption || undefined }, { ...item.meta, captionHint: caption || undefined }, {
          previewPayload: { type: "gif", url: gifUrl, caption: caption || undefined },
        }))}
      </div>
    );
  }

  return (
    <div style={editPanelSx}>
      <div style={{ fontSize: 12, color: "var(--color-muted)" }}>
        Editing this item type is coming next. For now, delete and re-add it to change the contents.
      </div>
      {actions(false, onCancel)}
    </div>
  );
}

// ── Add-item forms ─────────────────────────────────────────────────────────────

type AddFn = (p: ItemPayload, meta?: Record<string, unknown>, extras?: Partial<ItemRow>) => Promise<void> | void;

const LETTER_FONTS: Array<{ id: string; label: string; className: string }> = [
  { id: "var(--font-hand)",    label: "Handwriting", className: "font-hand"    },
  { id: "var(--font-display)", label: "Display",     className: "font-display" },
  { id: "var(--font-body)",    label: "Classic",     className: ""             },
  { id: "monospace",           label: "Typewriter",  className: ""             },
];
const PAPER_BKGS: Record<string, string> = {
  blank: "none",
  lined: "repeating-linear-gradient(to bottom, transparent 0 27px, rgba(160,130,80,0.22) 27px 28px)",
  grid:  "repeating-linear-gradient(to bottom, transparent 0 27px, rgba(160,130,80,0.15) 27px 28px), repeating-linear-gradient(to right, transparent 0 27px, rgba(160,130,80,0.15) 27px 28px)",
};

const LETTER_MODES = [
  { id: "type",   label: "Type a letter"          },
  { id: "design", label: "Place text on paper"    },
  { id: "draw",   label: "Draw it"                },
] as const;
type LetterMode = typeof LETTER_MODES[number]["id"];

function ModeToggle({ mode, setMode }: { mode: LetterMode; setMode: (m: LetterMode) => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {LETTER_MODES.map((m) => (
        <button key={m.id} type="button" onClick={() => setMode(m.id)}
          style={{
            borderRadius: 999, padding: "5px 14px", fontSize: 12, cursor: "pointer",
            background: mode === m.id ? "var(--color-ink)" : "transparent",
            color: mode === m.id ? "var(--color-bg)" : "var(--color-ink)",
            border: `1px solid ${mode === m.id ? "var(--color-ink)" : "var(--color-muted)"}`,
          }}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

function LetterPanel({ onAdd, onCancel }: { onAdd: AddFn; onCancel: () => void }) {
  const [mode, setMode]     = useState<LetterMode>("type");
  const [value, setValue]   = useState("");
  const [fontId, setFontId] = useState("var(--font-hand)");
  const [paper, setPaper]   = useState("lined");

  if (mode === "design") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <ModeToggle mode={mode} setMode={setMode} />
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "var(--color-muted)" }}>
          Click anywhere inside the paper to add a text block, then type right where you placed it.
        </p>
        <PositionedLetterCanvas
          onAdd={(blocks, stickers, paperStyle) =>
            onAdd({ type: "text", mode: "positioned", blocks, stickers, paperStyle })
          }
          onCancel={onCancel}
        />
      </div>
    );
  }

  if (mode === "draw") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <ModeToggle mode={mode} setMode={setMode} />
        <DrawingCanvas
          onAdd={(strokes, paperStyle) =>
            onAdd({ type: "text", mode: "drawn", strokes, paperStyle })
          }
          onCancel={onCancel}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <ModeToggle mode={mode} setMode={setMode} />

      {/* Font picker */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {LETTER_FONTS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFontId(f.id)}
            style={{
              borderRadius: 6, padding: "3px 10px", fontSize: 12, cursor: "pointer",
              fontFamily: f.id,
              background: fontId === f.id ? "var(--color-ink)" : "rgba(255,255,255,0.5)",
              color: fontId === f.id ? "var(--color-bg)" : "var(--color-ink)",
              border: `1px solid ${fontId === f.id ? "var(--color-ink)" : "var(--color-muted)"}`,
            }}>
            {f.label}
          </button>
        ))}
        <div style={{ width: 1, alignSelf: "stretch", background: "var(--color-muted)", opacity: 0.3, margin: "0 2px" }} />
        {["blank", "lined", "grid"].map((p) => (
          <button key={p} type="button" onClick={() => setPaper(p)}
            style={{
              borderRadius: 6, padding: "3px 10px", fontSize: 12, cursor: "pointer",
              background: paper === p ? "var(--color-ink)" : "rgba(255,255,255,0.5)",
              color: paper === p ? "var(--color-bg)" : "var(--color-ink)",
              border: `1px solid ${paper === p ? "var(--color-ink)" : "var(--color-muted)"}`,
            }}>
            {p[0].toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Lined-paper textarea */}
      <div style={{
        position: "relative", background: "#fdfaf2",
        borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)",
        overflow: "hidden", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: PAPER_BKGS[paper], backgroundPosition: "0 36px",
        }} />
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={8}
          placeholder="Write your letter…"
          style={{
            position: "relative", width: "100%", background: "transparent",
            border: "none", outline: "none", padding: "14px 18px",
            fontFamily: fontId, fontSize: 17, lineHeight: "28px",
            color: "var(--color-ink)", resize: "vertical", boxSizing: "border-box",
          }}
        />
      </div>

      <button
        type="button"
        disabled={!value.trim()}
        onClick={() => {
          const html = value.trim().split(/\n+/).map((p) => `<p>${escHtml(p)}</p>`).join("");
          onAdd({ type: "text", html, fontFamily: fontId, paperStyle: paper });
        }}
        style={{ alignSelf: "flex-end", borderRadius: 999, padding: "9px 20px", fontSize: 13,
          background: "var(--color-ink)", border: "none", cursor: "pointer", color: "var(--color-bg)" }}
      >
        Seal this letter
      </button>
    </div>
  );
}

function PhotoPanel({ bundleId, onAdd }: { bundleId: string; onAdd: AddFn }) {
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<{ storageKey: string; mime: string; objectUrl: string } | null>(null);
  const [overlayText, setOverlayText] = useState("");
  const [overlayColor, setOverlayColor] = useState("#ffffff");
  const [overlaySize, setOverlaySize] = useState(28);
  const [overlayPosition, setOverlayPosition] = useState({ x: 50, y: 52 });
  const [frame, setFrame] = useState<PhotoFrame>("polaroid");
  const [filter, setFilter] = useState<PhotoFilter>("none");
  const [fit, setFit] = useState<PhotoFit>("cover");
  const [captionMode, setCaptionMode] = useState<CaptionMode>("bottom");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const doUpload = async (file: File) => {
    setUploading(true); setErr(null);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    const form = new FormData();
    form.append("file", file);
    form.append("bundleId", bundleId);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    setUploading(false);
    if (!res.ok) { setErr(json.error ?? "Upload failed"); return; }
    setUploaded({ storageKey: json.storageKey, mime: json.mime, objectUrl });
  };

  const setOverlayFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!preview) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setOverlayPosition({
      x: Math.max(8, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(8, Math.min(92, ((e.clientY - rect.top) / rect.height) * 100)),
    });
  };

  const addPhoto = async () => {
    if (!uploaded) return;
    const textBlocks: TextBlock[] = [];
    if (overlayText.trim()) {
      textBlocks.push({
        id: `photo-text-${Date.now().toString(36)}`,
        x: overlayPosition.x,
        y: overlayPosition.y,
        text: overlayText.trim(),
        fontFamily: "var(--font-hand)",
        fontSize: overlaySize,
        color: overlayColor,
        bold: false,
        italic: false,
      });
    }
    if (captionMode === "onPhoto" && caption.trim()) {
      textBlocks.push({
        id: `photo-caption-${Date.now().toString(36)}`,
        x: 50,
        y: 86,
        text: caption.trim(),
        fontFamily: "var(--font-hand)",
        fontSize: 24,
        color: "#ffffff",
        bold: false,
        italic: false,
      });
    }

    await onAdd(
      {
        type: "image",
        storageKey: uploaded.storageKey,
        caption: caption || undefined,
        textBlocks: textBlocks.length ? textBlocks : undefined,
      },
      { mime: uploaded.mime, captionHint: caption || undefined, frame, filter, fit, captionMode },
      {
        previewUrl: uploaded.objectUrl,
        previewPayload: {
          type: "image",
          storageKey: uploaded.storageKey,
          caption: caption || undefined,
          textBlocks: textBlocks.length ? textBlocks : undefined,
        },
      },
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Drop zone */}
      <div
        onClick={() => !preview && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) doUpload(f); }}
        style={{
          borderRadius: 12, border: `2px dashed ${dragging ? "var(--color-accent)" : "var(--color-muted)"}`,
          minHeight: 120, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 8,
          cursor: preview ? "default" : "pointer", transition: "border-color 0.2s",
          background: dragging ? "rgba(192,106,74,0.06)" : "rgba(255,255,255,0.4)",
          overflow: "hidden",
        }}
      >
        {preview ? (
          <DraftPhotoPreview
            src={preview}
            frame={frame}
            filter={filter}
            fit={fit}
            captionMode={captionMode}
            caption={caption}
            overlayText={overlayText}
            overlayColor={overlayColor}
            overlaySize={overlaySize}
            overlayPosition={overlayPosition}
            onPlaceText={setOverlayFromPointer}
          />
        ) : (
          <>
            <ImageIcon size={28} style={{ color: "var(--color-muted)", opacity: 0.6 }} />
            <div style={{ fontSize: 13, color: "var(--color-muted)" }}>
              {uploading ? "Uploading…" : "Drag & drop or click to choose"}
            </div>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && doUpload(e.target.files[0])} />

      {preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{ alignSelf: "flex-start", borderRadius: 999, padding: "6px 12px", fontSize: 12, background: "transparent", border: "1px solid var(--color-muted)", color: "var(--color-muted)", cursor: "pointer" }}
        >
          Choose different photo
        </button>
      ) : null}

      {preview ? (
        <PhotoOptionControls
          frame={frame}
          setFrame={setFrame}
          filter={filter}
          setFilter={setFilter}
          fit={fit}
          setFit={setFit}
          captionMode={captionMode}
          setCaptionMode={setCaptionMode}
        />
      ) : null}

      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder={captionMode === "onPhoto" ? "Caption placed on photo" : captionMode === "hidden" ? "Private caption/alt text (optional)" : "Polaroid caption (optional)"}
        className="font-hand"
        style={{ borderRadius: 8, background: "rgba(255,255,255,0.7)", padding: "8px 14px",
          border: "1px solid var(--color-muted)", fontSize: 15, color: "var(--color-ink)", outline: "none" }}
      />
      {preview ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            placeholder="Text on photo (optional)"
            className="font-hand"
            style={{ borderRadius: 8, background: "rgba(255,255,255,0.7)", padding: "8px 14px",
              border: "1px solid var(--color-muted)", fontSize: 15, color: "var(--color-ink)", outline: "none" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--color-muted)" }}>Click the photo to place text</span>
            <input type="color" value={overlayColor} onChange={(e) => setOverlayColor(e.target.value)} aria-label="Photo text color" />
            <input type="range" min={14} max={54} value={overlaySize} onChange={(e) => setOverlaySize(Number(e.target.value))} style={{ width: 130 }} />
          </div>
        </div>
      ) : null}
      {err && <div style={{ fontSize: 12, color: "var(--color-seal)" }}>{err}</div>}
      <button type="button" disabled={!uploaded || uploading}
        onClick={addPhoto}
        style={{ alignSelf: "flex-end", borderRadius: 999, padding: "9px 20px", fontSize: 13,
          background: uploaded ? "var(--color-ink)" : "rgba(0,0,0,0.2)", border: "none",
          cursor: uploaded ? "pointer" : "default", color: "var(--color-bg)" }}>
        Add photo
      </button>
    </div>
  );
}

function DraftPhotoPreview({
  src,
  frame,
  filter,
  fit,
  captionMode,
  caption,
  overlayText,
  overlayColor,
  overlaySize,
  overlayPosition,
  onPlaceText,
}: {
  src: string;
  frame: PhotoFrame;
  filter: PhotoFilter;
  fit: PhotoFit;
  captionMode: CaptionMode;
  caption: string;
  overlayText: string;
  overlayColor: string;
  overlaySize: number;
  overlayPosition: { x: number; y: number };
  onPlaceText: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const photo = (
    <div
      onPointerDown={onPlaceText}
      onPointerMove={(event) => event.buttons === 1 && onPlaceText(event)}
      style={{
        position: "relative",
        display: "inline-block",
        cursor: "crosshair",
        touchAction: "none",
        overflow: "hidden",
        borderRadius: frame === "plain" ? 14 : 2,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={{
          display: "block",
          width: frame === "plain" ? 340 : 320,
          height: frame === "plain" ? 300 : 215,
          maxWidth: "100%",
          objectFit: fit === "contain" ? "contain" : "cover",
          background: "#f6f0e4",
          filter: photoFilterCss(filter),
        }}
      />
      {overlayText.trim() ? (
        <div
          className="font-hand"
          style={{
            position: "absolute",
            left: `${overlayPosition.x}%`,
            top: `${overlayPosition.y}%`,
            transform: "translate(-50%, -50%)",
            color: overlayColor,
            fontSize: overlaySize,
            lineHeight: 1.1,
            textAlign: "center",
            maxWidth: "85%",
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
            textShadow: "0 1px 6px rgba(0,0,0,0.6)",
            pointerEvents: "none",
          }}
        >
          {overlayText}
        </div>
      ) : null}
      {captionMode === "onPhoto" && caption.trim() ? (
        <div
          className="font-hand"
          style={{
            position: "absolute",
            left: "50%",
            top: "86%",
            transform: "translate(-50%, -50%)",
            color: "#fff",
            fontSize: 24,
            lineHeight: 1.1,
            textAlign: "center",
            maxWidth: "85%",
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
            textShadow: "0 1px 6px rgba(0,0,0,0.62)",
            pointerEvents: "none",
          }}
        >
          {caption}
        </div>
      ) : null}
    </div>
  );

  if (frame === "plain") {
    return (
      <div style={{ padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-muted)" }}>
          Final preview
        </div>
        <div style={{ borderRadius: 16, boxShadow: "0 16px 32px rgba(0,0,0,0.18)", overflow: "hidden" }}>
          {photo}
        </div>
        {captionMode === "bottom" && caption ? <div className="font-hand" style={{ color: "var(--color-muted)", fontSize: 18 }}>{caption}</div> : null}
      </div>
    );
  }

  return (
    <div style={{ padding: "14px 14px 20px", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          position: "relative",
          background: "#fff",
          padding: "12px 12px 52px",
          boxShadow: "0 16px 32px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.12)",
          transform: "rotate(-2deg)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -18,
            left: 0,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "var(--color-muted)",
          }}
        >
          Final preview
        </div>
        {photo}
        {captionMode === "bottom" && caption ? (
          <div
            className="font-hand"
            style={{
              position: "absolute",
              left: 10,
              right: 10,
              bottom: 12,
              textAlign: "center",
              color: "#2a2a2a",
              fontSize: 19,
              lineHeight: 1.2,
            }}
          >
            {caption}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PhotoOptionControls({
  frame,
  setFrame,
  filter,
  setFilter,
  fit,
  setFit,
  captionMode,
  setCaptionMode,
}: {
  frame: PhotoFrame;
  setFrame: (frame: PhotoFrame) => void;
  filter: PhotoFilter;
  setFilter: (filter: PhotoFilter) => void;
  fit: PhotoFit;
  setFit: (fit: PhotoFit) => void;
  captionMode: CaptionMode;
  setCaptionMode: (captionMode: CaptionMode) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
      <OptionGroup label="Photo type">
        {PHOTO_FRAMES.map((option) => (
          <button key={option.id} type="button" onClick={() => setFrame(option.id)} style={smallPillSx(frame === option.id)}>
            {option.label}
          </button>
        ))}
      </OptionGroup>
      <OptionGroup label="Filter">
        {PHOTO_FILTERS.map((option) => (
          <button key={option.id} type="button" onClick={() => setFilter(option.id)} style={smallPillSx(filter === option.id)}>
            {option.label}
          </button>
        ))}
      </OptionGroup>
      <OptionGroup label="Crop">
        {PHOTO_FITS.map((option) => (
          <button key={option.id} type="button" onClick={() => setFit(option.id)} style={smallPillSx(fit === option.id)}>
            {option.label}
          </button>
        ))}
      </OptionGroup>
      <OptionGroup label="Caption">
        {CAPTION_MODES.map((option) => (
          <button key={option.id} type="button" onClick={() => setCaptionMode(option.id)} style={smallPillSx(captionMode === option.id)}>
            {option.label}
          </button>
        ))}
      </OptionGroup>
    </div>
  );
}

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--color-muted)", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
    </div>
  );
}

function GifPanel({ onAdd }: { onAdd: AddFn }) {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste a GIF URL (Giphy, Tenor…)"
        style={{ borderRadius: 8, background: "rgba(255,255,255,0.7)", padding: "8px 14px",
          border: "1px solid var(--color-muted)", color: "var(--color-ink)", outline: "none", fontSize: 13 }}
      />
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ maxHeight: 160, borderRadius: 8, objectFit: "contain" }} />
      )}
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (optional)"
        className="font-hand"
        style={{ borderRadius: 8, background: "rgba(255,255,255,0.7)", padding: "8px 14px",
          border: "1px solid var(--color-muted)", fontSize: 15, color: "var(--color-ink)", outline: "none" }}
      />
      <button type="button" disabled={!url}
        onClick={() => onAdd({ type: "gif", url, caption: caption || undefined })}
        style={{ alignSelf: "flex-end", borderRadius: 999, padding: "9px 20px", fontSize: 13,
          background: "var(--color-ink)", border: "none", cursor: "pointer", color: "var(--color-bg)" }}>
        Add GIF
      </button>
    </div>
  );
}

function GiftCardPanel({ onAdd }: { onAdd: AddFn }) {
  const [vendor, setVendor] = useState("Amazon");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [redeemUrl, setRedeemUrl] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [currency, setCurrency] = useState("USD");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{
        borderRadius: 14, padding: "18px 20px",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        color: "#fff",
      }}>
        <div style={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Gift card</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{vendor || "Brand"}</div>
        {typeof amount === "number" && amount > 0 && (
          <div style={{ fontSize: 28, fontWeight: 800 }}>{currency} {amount}</div>
        )}
        {code && (
          <div style={{ marginTop: 10, fontFamily: "monospace", fontSize: 14, opacity: 0.8, letterSpacing: "0.15em" }}>
            {code}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Brand / vendor"
          style={inputSx} />
        <div style={{ display: "flex", gap: 4 }}>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
            placeholder="Amount" style={{ ...inputSx, flex: 2 }} />
          <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0,3))}
            placeholder="USD" style={{ ...inputSx, flex: 1, textAlign: "center" }} />
        </div>
      </div>
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Gift card code"
        style={{ ...inputSx, fontFamily: "monospace", letterSpacing: "0.1em" }} />
      <input value={redeemUrl} onChange={(e) => setRedeemUrl(e.target.value)} placeholder="Redeem URL (optional)"
        style={inputSx} />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="A note (optional)"
        className="font-hand" style={{ ...inputSx, fontSize: 15 }} />
      <button type="button" disabled={!vendor || !code}
        onClick={() => onAdd(
          { type: "giftcard", vendor, code, note: note || undefined, redeemUrl: redeemUrl || undefined },
          { vendor, publicAmount: typeof amount === "number" ? { amount, currency } : undefined },
        )}
        style={{ alignSelf: "flex-end", borderRadius: 999, padding: "9px 20px", fontSize: 13,
          background: "var(--color-ink)", border: "none", cursor: "pointer", color: "var(--color-bg)" }}>
        Add gift card
      </button>
    </div>
  );
}

function MoneyPanel({ onAdd }: { onAdd: AddFn }) {
  const [amount, setAmount] = useState<number | "">("");
  const [currency, setCurrency] = useState("USD");
  const [instructions, setInstructions] = useState("");
  const [link, setLink] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ fontSize: 13, color: "var(--color-muted)" }}>$</div>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
          placeholder="0" style={{ ...inputSx, flex: 1, fontSize: 28, fontWeight: 700, padding: "6px 12px" }} />
        <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0,3))}
          placeholder="USD" style={{ ...inputSx, width: 60, textAlign: "center" }} />
      </div>
      <input value={instructions} onChange={(e) => setInstructions(e.target.value)}
        placeholder="What it's for (e.g. a good dinner)" className="font-hand"
        style={{ ...inputSx, fontSize: 15 }} />
      <input value={link} onChange={(e) => setLink(e.target.value)}
        placeholder="Payment link — Venmo, PayPal, etc. (optional)" style={inputSx} />
      <button type="button" disabled={typeof amount !== "number"}
        onClick={() => typeof amount === "number" && onAdd(
          { type: "money_note", amount, currency, instructions: instructions || undefined, link: link || undefined },
          { publicAmount: { amount, currency } },
        )}
        style={{ alignSelf: "flex-end", borderRadius: 999, padding: "9px 20px", fontSize: 13,
          background: "var(--color-ink)", border: "none", cursor: "pointer", color: "var(--color-bg)" }}>
        Add cash
      </button>
    </div>
  );
}

const inputSx: React.CSSProperties = {
  borderRadius: 8, background: "rgba(255,255,255,0.7)", padding: "8px 14px",
  border: "1px solid var(--color-muted)", color: "var(--color-ink)", outline: "none", fontSize: 13,
};

function smallPillSx(active: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 11,
    cursor: "pointer",
    background: active ? "var(--color-ink)" : "rgba(255,255,255,0.55)",
    color: active ? "var(--color-bg)" : "var(--color-ink)",
    border: `1px solid ${active ? "var(--color-ink)" : "var(--color-muted)"}`,
  };
}

const editPanelSx: React.CSSProperties = {
  borderRadius: 14,
  padding: "14px 16px",
  background: "rgba(253,250,242,0.78)",
  border: "1px solid rgba(139,116,85,0.25)",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const editTitleSx: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "var(--color-muted)",
  fontWeight: 600,
};

const secondaryButtonSx: React.CSSProperties = {
  borderRadius: 999,
  padding: "8px 14px",
  fontSize: 12,
  background: "transparent",
  border: "1px solid var(--color-muted)",
  color: "var(--color-muted)",
  cursor: "pointer",
};

const primaryButtonSx: React.CSSProperties = {
  borderRadius: 999,
  padding: "8px 16px",
  fontSize: 12,
  background: "var(--color-ink)",
  border: "none",
  color: "var(--color-bg)",
  cursor: "pointer",
};

function escHtml(s: string) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
          .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

function htmlToText(html: string) {
  return html
    .replace(/<\/p>\s*<p>/g, "\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'");
}

// ── Ticket scan panel ─────────────────────────────────────────────────────────
// Camera-first uploader for physical paper items (tickets, receipts, postcards,
// hand-written notes). Stored as an image payload with meta.frame = "ticket" so
// the recipient sees it inside a perforated ticket-stub frame.

function TicketScanPanel({ bundleId, onAdd }: { bundleId: string; onAdd: AddFn }) {
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const doUpload = async (file: File) => {
    setUploading(true); setErr(null);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    const form = new FormData();
    form.append("file", file);
    form.append("bundleId", bundleId);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    setUploading(false);
    if (!res.ok) { setErr(json.error ?? "Upload failed"); return; }
    await onAdd(
      { type: "image", storageKey: json.storageKey, caption: caption || undefined },
      { mime: json.mime, frame: "ticket", captionHint: caption || undefined },
      { previewUrl: objectUrl },
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Ticket preview frame */}
      <div style={{
        position: "relative",
        background: "#fbf7ec",
        padding: "16px 20px",
        borderRadius: 4,
        WebkitMaskImage:
          "radial-gradient(circle 10px at 0 50%, transparent 98%, black 100%), radial-gradient(circle 10px at 100% 50%, transparent 98%, black 100%)",
        WebkitMaskComposite: "source-in",
        maskImage:
          "radial-gradient(circle 10px at 0 50%, transparent 98%, black 100%), radial-gradient(circle 10px at 100% 50%, transparent 98%, black 100%)",
        maskComposite: "intersect",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
        minHeight: 180,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 8,
      }}>
        <div style={{
          fontSize: 10, letterSpacing: "0.24em", textTransform: "uppercase",
          color: "#8a6a4a", fontFamily: "var(--font-mono, monospace)",
        }}>
          · Admit One ·
        </div>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" style={{
            maxWidth: "100%", maxHeight: 220, objectFit: "contain",
            background: "#fff", borderRadius: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
          }} />
        ) : (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            padding: "20px 12px", color: "#8a6a4a",
          }}>
            <TicketIcon size={34} strokeWidth={1.4} style={{ opacity: 0.65 }} />
            <div className="font-hand" style={{ fontSize: 16, color: "#6b4e32", textAlign: "center", maxWidth: 260 }}>
              Scan a ticket, receipt, or note. It&rsquo;ll arrive as a keepsake.
            </div>
          </div>
        )}
      </div>

      {/* Capture row — camera + library */}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => cameraRef.current?.click()} disabled={uploading}
          style={{
            flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            borderRadius: 10, padding: "11px 14px", fontSize: 13,
            background: "var(--color-ink)", color: "var(--color-bg)",
            border: "none", cursor: uploading ? "default" : "pointer",
            opacity: uploading ? 0.6 : 1,
          }}>
          <Camera size={15} /> {uploading ? "Uploading…" : "Scan with camera"}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
            borderRadius: 10, padding: "11px 14px", fontSize: 13,
            background: "transparent", color: "var(--color-ink)",
            border: "1px solid var(--color-muted)", cursor: uploading ? "default" : "pointer",
          }}>
          <ImageIcon size={15} /> From library
        </button>
      </div>

      {/* Hidden inputs: camera uses capture attribute, library does not */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => e.target.files?.[0] && doUpload(e.target.files[0])} />
      <input ref={fileRef} type="file" accept="image/*" hidden
        onChange={(e) => e.target.files?.[0] && doUpload(e.target.files[0])} />

      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Label (what&apos;s this from?)"
        className="font-hand"
        style={{ borderRadius: 8, background: "rgba(255,255,255,0.7)", padding: "8px 14px",
          border: "1px solid var(--color-muted)", fontSize: 15, color: "var(--color-ink)", outline: "none" }}
      />
      {err && <div style={{ fontSize: 12, color: "var(--color-seal)" }}>{err}</div>}
    </div>
  );
}
