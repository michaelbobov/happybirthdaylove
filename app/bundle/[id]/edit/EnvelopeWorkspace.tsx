"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import {
  Clock,
  Layers,
  Lock,
  Palette,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
  Type,
  Zap,
} from "lucide-react";
import { designsFor, themeList, type EnvelopeDesignId, type ThemeId } from "@/lib/themes";
import {
  DEFAULT_FRONT_TEXT_COLOR,
  DEFAULT_FRONT_TEXT_FONT,
  DEFAULT_FRONT_TEXT_POSITION,
  DEFAULT_FRONT_TEXT_ROTATION,
  DEFAULT_FRONT_TEXT_SIZE,
  ENVELOPE_FRONT_TEXT_STAMP_ID,
  STAMP_ASSETS,
  STAMP_EMOJI_LIBRARY,
  getEnvelopeFrontText,
  type EnvelopeStamp,
} from "@/lib/stamps";
import { captionHorizontalRangePct, measureEnvelopeTextBoxPct } from "@/lib/envelope-text-layout";
import { PhotoEnvelope } from "@/components/envelope/PhotoEnvelope";
import { EnvelopeSVG } from "@/components/envelope/EnvelopeSVG";
import { searchStickers } from "@/lib/stickers";
import { upsertEnvelope } from "@/app/actions/bundles";
import {
  EnvelopeStampsCanvas,
  type PendingStamp,
} from "./EnvelopeStampsCanvas";
import { ItemsEditor, type ItemRow } from "./ItemsEditor";

type Envelope = {
  id: string;
  title: string;
  caption: string | null;
  orderIndex: number;
  unlockType: "immediate" | "date" | "passphrase" | "manual";
  unlockAt: string | null;
  envelopeDesignId: string;
  themeOverrideId: string | null;
  sealColorOverride: string | null;
  stamps: EnvelopeStamp[];
};

const SEAL_PRESETS = [
  { id: "default", label: "Match design", color: null as string | null },
  { id: "crimson", label: "Crimson",   color: "#a02822" },
  { id: "rose",    label: "Rose",      color: "#c06a4a" },
  { id: "blush",   label: "Blush",     color: "#d98a8a" },
  { id: "gold",    label: "Gold",      color: "#c9a44c" },
  { id: "forest",  label: "Forest",    color: "#3d6b4a" },
  { id: "navy",    label: "Navy",      color: "#2a3d5a" },
  { id: "plum",    label: "Plum",      color: "#6b3d6b" },
  { id: "ink",     label: "Ink",       color: "#1f1f1f" },
  { id: "cream",   label: "Cream",     color: "#e8dcc0" },
];

type Props = {
  bundleId: string;
  bundleThemeId: string;
  envelope: Envelope;
  items: ItemRow[];
  onUpdated: (e: Envelope) => void;
  onItemsChange: (envelopeId: string, items: ItemRow[]) => void;
};

const UNLOCK_OPTIONS = [
  { key: "immediate" as const, label: "Right away",    icon: Zap },
  { key: "date"      as const, label: "On a date",     icon: Clock },
  { key: "passphrase"as const, label: "With a phrase", icon: Lock },
  { key: "manual"    as const, label: "Keep locked",   icon: Lock },
];

const ENVELOPE_W = 540;
const ENVELOPE_H = 348;
const CAPTION_COLORS = [
  { label: "Ink", value: "rgba(40,24,8,0.62)" },
  { label: "Black", value: "#111111" },
  { label: "Seal", value: "#a02822" },
  { label: "Rose", value: "#c06a4a" },
  { label: "Navy", value: "#2a3d5a" },
  { label: "Forest", value: "#3d6b4a" },
  { label: "Plum", value: "#6b3d6b" },
] as const;

const EXTRA_TEXT_FONTS = [
  { label: "Handwritten", value: "var(--font-hand)" },
  { label: "Display", value: "var(--font-display)" },
  { label: "Serif", value: "var(--font-body)" },
  { label: "Clean", value: "system-ui, sans-serif" },
] as const;

type CaptionPlacementPatch = {
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  fontFamily?: string;
  /** Omit auto-sizing for this dimension (drag resize sets numbers; pass null to return to auto hug-text). */
  width?: number | null;
  height?: number | null;
  rotation?: number;
};

type Tab = "front" | "contents" | "design" | "stamps" | "unlock";

export function EnvelopeWorkspace({
  bundleId, bundleThemeId, envelope, items, onUpdated, onItemsChange,
}: Props) {
  const [env, setEnv] = useState<Envelope>(envelope);
  const [tab, setTab] = useState<Tab>("front");
  const [pending, setPending] = useState<PendingStamp | null>(null);
  const [stampQuery, setStampQuery] = useState("");
  const [stampCat, setStampCat] = useState(STAMP_EMOJI_LIBRARY[0].id);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const themeId = (env.themeOverrideId as ThemeId) ?? (bundleThemeId as ThemeId);
  const designs = designsFor(themeId);
  const design = designs.find((d) => d.id === env.envelopeDesignId) ?? designs[0];
  const previewCaption = getEnvelopeFrontText(env.title, env.caption);
  const captionPlacement = env.stamps.find((s) => s.id === ENVELOPE_FRONT_TEXT_STAMP_ID);
  const captionPosition = {
    x: captionPlacement?.x ?? DEFAULT_FRONT_TEXT_POSITION.x,
    y: captionPlacement?.y ?? DEFAULT_FRONT_TEXT_POSITION.y,
  };
  const captionSize = captionPlacement?.size ?? DEFAULT_FRONT_TEXT_SIZE;
  const captionColor = captionPlacement?.color ?? DEFAULT_FRONT_TEXT_COLOR;
  const captionFont = captionPlacement?.fontFamily ?? DEFAULT_FRONT_TEXT_FONT;
  const captionRotation = captionPlacement?.rotation ?? DEFAULT_FRONT_TEXT_ROTATION;
  const captionBounds = getCaptionBounds(design);
  const shorterPreview = Math.min(ENVELOPE_W, ENVELOPE_H);
  const captionFontPx = (captionSize / 100) * shorterPreview;
  const autoCaptionBox = measureEnvelopeTextBoxPct({
    text: previewCaption,
    envelopeWidthPx: ENVELOPE_W,
    envelopeHeightPx: ENVELOPE_H,
    fontSizePx: captionFontPx,
    fontFamily: captionFont,
    maxWidthPct: captionHorizontalRangePct(captionBounds),
    lineHeight: 1.2,
  });
  const captionWidthPct = captionPlacement?.width ?? autoCaptionBox.widthPct;
  const captionHeightPct = captionPlacement?.height ?? autoCaptionBox.heightPct;
  const captionColorInputValue = colorToInputValue(captionColor);
  const decorativeStamps = env.stamps.filter((s) => s.id !== ENVELOPE_FRONT_TEXT_STAMP_ID);

  const save = useCallback(async (next: Envelope) => {
    setSaveState("saving");
    await upsertEnvelope({
      id: next.id,
      bundleId,
      title: next.title,
      caption: next.caption ?? "",
      orderIndex: next.orderIndex,
      unlockType: next.unlockType,
      unlockAt: next.unlockAt,
      envelopeDesignId: next.envelopeDesignId as EnvelopeDesignId,
      themeOverrideId: next.themeOverrideId as ThemeId | null,
      sealColorOverride: next.sealColorOverride,
      stamps: next.stamps,
    });
    setSaveState("saved");
    onUpdated(next);
    setTimeout(() => setSaveState("idle"), 1600);
  }, [bundleId, onUpdated]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(env), 700);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [env, save]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setEnv(envelope);
      setPending(null);
      isFirstRender.current = true;
    }, 0);
    return () => window.clearTimeout(id);
  }, [envelope.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (partial: Partial<Envelope>) => setEnv((e) => ({ ...e, ...partial }));
  const setStamps = (stamps: EnvelopeStamp[]) =>
    setEnv((e) => ({
      ...e,
      stamps: [
        ...stamps,
        ...e.stamps.filter((s) => s.id === ENVELOPE_FRONT_TEXT_STAMP_ID),
      ],
    }));
  const setCaptionPlacement = (partial: CaptionPlacementPatch) =>
    setEnv((e) => {
      const existing = e.stamps.find((s) => s.id === ENVELOPE_FRONT_TEXT_STAMP_ID);
      const hadExplicitWidth = existing?.width !== undefined;
      const hadExplicitHeight = existing?.height !== undefined;
      const nextWidth =
        partial.width === null
          ? undefined
          : partial.width !== undefined
            ? partial.width
            : hadExplicitWidth
              ? existing?.width
              : undefined;
      const nextHeight =
        partial.height === null
          ? undefined
          : partial.height !== undefined
            ? partial.height
            : hadExplicitHeight
              ? existing?.height
              : undefined;
      const text = getEnvelopeFrontText(e.title, e.caption);
      const fontPx = ((partial.size ?? existing?.size ?? DEFAULT_FRONT_TEXT_SIZE) / 100) * Math.min(ENVELOPE_W, ENVELOPE_H);
      const auto = measureEnvelopeTextBoxPct({
        text,
        envelopeWidthPx: ENVELOPE_W,
        envelopeHeightPx: ENVELOPE_H,
        fontSizePx: fontPx,
        fontFamily: partial.fontFamily ?? existing?.fontFamily ?? DEFAULT_FRONT_TEXT_FONT,
        maxWidthPct: captionHorizontalRangePct(captionBounds),
        lineHeight: 1.2,
      });
      const effW = nextWidth ?? auto.widthPct;
      const effH = nextHeight ?? auto.heightPct;
      const nextPosition = clampCaptionPosition(
        {
          x: partial.x ?? existing?.x ?? DEFAULT_FRONT_TEXT_POSITION.x,
          y: partial.y ?? existing?.y ?? DEFAULT_FRONT_TEXT_POSITION.y,
        },
        captionBounds,
        effW,
        effH,
      );
      const placement: EnvelopeStamp = {
        id: ENVELOPE_FRONT_TEXT_STAMP_ID,
        kind: "text",
        value: text.trim() || " ",
        x: nextPosition.x,
        y: nextPosition.y,
        size: partial.size ?? existing?.size ?? DEFAULT_FRONT_TEXT_SIZE,
        ...(nextWidth !== undefined ? { width: nextWidth } : {}),
        ...(nextHeight !== undefined ? { height: nextHeight } : {}),
        rotation: partial.rotation ?? existing?.rotation ?? DEFAULT_FRONT_TEXT_ROTATION,
        color: partial.color ?? existing?.color ?? DEFAULT_FRONT_TEXT_COLOR,
        fontFamily: partial.fontFamily ?? existing?.fontFamily ?? DEFAULT_FRONT_TEXT_FONT,
      };
      return {
        ...e,
        stamps: [
          ...e.stamps.filter((s) => s.id !== ENVELOPE_FRONT_TEXT_STAMP_ID),
          placement,
        ],
      };
    });

  const envelopeArt = design.imageUrl ? (
    <PhotoEnvelope
      design={design}
      width={ENVELOPE_W}
      height={ENVELOPE_H}
      state="closed"
      sealColorOverride={env.sealColorOverride}
    />
  ) : (
    <EnvelopeSVG
      design={design}
      width={ENVELOPE_W}
      height={ENVELOPE_H}
      sealColorOverride={env.sealColorOverride}
      stamps={decorativeStamps}
    />
  );
  const envelopeBaseArt = design.imageUrl ? (
    <PhotoEnvelope
      design={design}
      width={ENVELOPE_W}
      height={ENVELOPE_H}
      state="closed"
      sealColorOverride={env.sealColorOverride}
    />
  ) : (
    <EnvelopeSVG
      design={design}
      width={ENVELOPE_W}
      height={ENVELOPE_H}
      sealColorOverride={env.sealColorOverride}
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Envelope preview ─────────────────────────────────────────────── */}
      <div className="envelope-preview-shell" style={{ position: "relative", display: "flex", justifyContent: "center" }}>
        <div className="envelope-preview-scale">
        {tab === "stamps" ? (
          /* In decorate mode the interactive canvas owns stamp rendering, so
             the envelope art underneath must stay undecorated. */
          <EnvelopeStampsCanvas
            stamps={decorativeStamps}
            onChange={setStamps}
            pending={pending}
            onPendingConsumed={() => setPending(null)}
            width={ENVELOPE_W}
            height={ENVELOPE_H}
          >
            <>
              {envelopeBaseArt}
                <EnvelopeCaptionOverlay
                  caption={previewCaption}
                  position={captionPosition}
                  size={captionSize}
                  color={captionColor}
                  fontFamily={captionFont}
                  boxWidthPct={captionWidthPct}
                  boxHeightPct={captionHeightPct}
                  rotation={captionRotation}
                  showFrame
                  bounds={captionBounds}
                  envelopeWidthPx={ENVELOPE_W}
                  envelopeHeightPx={ENVELOPE_H}
                  onPlacementChange={setCaptionPlacement}
                />
            </>
          </EnvelopeStampsCanvas>
        ) : (
          <>
            {envelopeArt}
            <EnvelopeCaptionOverlay
              caption={previewCaption}
              position={captionPosition}
              size={captionSize}
              color={captionColor}
              fontFamily={captionFont}
              boxWidthPct={captionWidthPct}
              boxHeightPct={captionHeightPct}
              rotation={captionRotation}
              showFrame={tab === "front"}
              bounds={captionBounds}
              envelopeWidthPx={ENVELOPE_W}
              envelopeHeightPx={ENVELOPE_H}
              onPlacementChange={setCaptionPlacement}
            />
          </>
        )}
        </div>

        {saveState !== "idle" && (
          <div style={{
            position: "absolute", top: 10, right: 10,
            background: "rgba(0,0,0,0.45)", color: "#fff", borderRadius: 999,
            padding: "3px 10px", fontSize: 10, backdropFilter: "blur(4px)",
          }}>
            {saveState === "saving" ? "Saving…" : "Saved ✓"}
          </div>
        )}
      </div>

      {/* ── Tabbed customization panel ──────────────────────────────────── */}
      <div style={{
        marginTop: 18,
        borderRadius: 18,
        background: "rgba(255,255,255,0.62)",
        border: "1px solid rgba(0,0,0,0.08)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 8px 30px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}>
        {/* Tab bar */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 0,
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          background: "rgba(255,255,255,0.4)",
        }}>
          <TabButton active={tab === "front"} onClick={() => setTab("front")} icon={<Type size={13} />}>Front Text</TabButton>
          <TabButton active={tab === "contents"} onClick={() => setTab("contents")} icon={<Layers size={13} />}>Inside{items.length ? ` · ${items.length}` : ""}</TabButton>
          <TabButton active={tab === "design"} onClick={() => setTab("design")} icon={<Palette size={13} />}>Look</TabButton>
          <TabButton active={tab === "stamps"} onClick={() => setTab("stamps")} icon={<Sparkles size={13} />}>Decorate{decorativeStamps.length ? ` · ${decorativeStamps.length}` : ""}</TabButton>
          <TabButton active={tab === "unlock"} onClick={() => setTab("unlock")} icon={<Clock size={13} />}>Timing</TabButton>
        </div>

        <div style={{ padding: "18px 20px" }}>
          {tab === "front" && (
            <FrontTextPanel
              title={env.title}
              caption={env.caption}
              captionSize={captionSize}
              captionColor={captionColor}
              captionFont={captionFont}
              captionColorInputValue={captionColorInputValue}
              onPatch={patch}
              onCaptionPlacementChange={setCaptionPlacement}
            />
          )}
          {tab === "contents" && (
            <ContentsPanel
              bundleId={bundleId}
              envelopeId={env.id}
              items={items}
              onItemsChange={onItemsChange}
            />
          )}
          {tab === "design" && (
            <DesignPanel
              themeOverrideId={env.themeOverrideId}
              envelopeDesignId={env.envelopeDesignId}
              sealColorOverride={env.sealColorOverride}
              bundleThemeId={bundleThemeId}
              designSeal={design.seal}
              onPatch={patch}
            />
          )}
          {tab === "stamps" && (
            <StampsPanel
              pending={pending}
              setPending={setPending}
              query={stampQuery}
              setQuery={setStampQuery}
              category={stampCat}
              setCategory={setStampCat}
              stamps={decorativeStamps}
              onClearAll={() => setStamps([])}
            />
          )}
          {tab === "unlock" && (
            <UnlockPanel
              unlockType={env.unlockType}
              unlockAt={env.unlockAt}
              onPatch={patch}
            />
          )}
        </div>
      </div>

      <style>{`
        .envelope-preview-shell {
          overflow: hidden;
          min-height: ${ENVELOPE_H}px;
        }

        .envelope-preview-scale {
          width: ${ENVELOPE_W}px;
          height: ${ENVELOPE_H}px;
          position: relative;
          transform-origin: top center;
        }

        @media (max-width: 700px) {
          .envelope-preview-shell {
            min-height: calc((100vw - 48px) * ${ENVELOPE_H / ENVELOPE_W});
          }

          .envelope-preview-scale {
            transform: scale(calc((100vw - 48px) / ${ENVELOPE_W}));
          }
        }

        @media (max-width: 420px) {
          .envelope-preview-shell {
            min-height: calc((100vw - 32px) * ${ENVELOPE_H / ENVELOPE_W});
          }

          .envelope-preview-scale {
            transform: scale(calc((100vw - 32px) / ${ENVELOPE_W}));
          }
        }
      `}</style>
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────

function TabButton({
  active, onClick, icon, children,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: "12px 14px",
        background: active ? "rgba(255,255,255,0.9)" : "transparent",
        border: "none",
        borderBottom: active ? "2px solid var(--color-ink)" : "2px solid transparent",
        color: active ? "var(--color-ink)" : "var(--color-muted)",
        fontSize: 12,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        cursor: "pointer",
        fontWeight: active ? 600 : 500,
        transition: "background 0.15s, border-color 0.15s, color 0.15s",
      }}
    >
      {icon}
      {children}
    </button>
  );
}

type CaptionBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function getCaptionBounds(design: { bounds?: { top: number; left: number; right: number; bottom: number }; imageNaturalWidth?: number; imageNaturalHeight?: number }): CaptionBounds {
  const bounds = design.bounds ?? { top: 0.3, left: 0.02, right: 0.98, bottom: 0.98 };
  const natW = design.imageNaturalWidth ?? ENVELOPE_W;
  const natH = design.imageNaturalHeight ?? ENVELOPE_H;
  const scale = Math.min(ENVELOPE_W / natW, ENVELOPE_H / natH);
  const imageW = natW * scale;
  const imageH = natH * scale;
  const imageLeft = (ENVELOPE_W - imageW) / 2;
  const imageTop = (ENVELOPE_H - imageH) / 2;
  const toPctX = (x: number) => ((imageLeft + x * imageW) / ENVELOPE_W) * 100;
  const toPctY = (y: number) => ((imageTop + y * imageH) / ENVELOPE_H) * 100;

  const left = toPctX(bounds.left);
  const right = toPctX(bounds.right);
  const top = toPctY(bounds.top);
  const bottom = toPctY(bounds.bottom);
  const width = right - left;
  const height = bottom - top;

  return {
    minX: left + width * 0.04,
    maxX: right - width * 0.04,
    minY: top + height * 0.42,
    maxY: bottom - height * 0.04,
  };
}

function clampCaptionPosition(
  position: { x: number; y: number },
  bounds: CaptionBounds,
  boxWidth: number,
  boxHeight: number,
) {
  const halfW = boxWidth / 2;
  const halfH = boxHeight / 2;
  const minX = bounds.minX + halfW;
  const maxX = bounds.maxX - halfW;
  const minY = bounds.minY + halfH;
  const maxY = bounds.maxY - halfH;

  return {
    x: minX <= maxX ? Math.max(minX, Math.min(maxX, position.x)) : (bounds.minX + bounds.maxX) / 2,
    y: minY <= maxY ? Math.max(minY, Math.min(maxY, position.y)) : (bounds.minY + bounds.maxY) / 2,
  };
}

function colorToInputValue(color: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    return `#${color.slice(1).split("").map((char) => `${char}${char}`).join("")}`;
  }
  return "#281808";
}

function EnvelopeCaptionOverlay({
  caption,
  position,
  size,
  color,
  fontFamily,
  boxWidthPct,
  boxHeightPct,
  rotation,
  showFrame,
  bounds,
  envelopeWidthPx,
  envelopeHeightPx,
  onPlacementChange,
}: {
  caption: string;
  position: { x: number; y: number };
  size: number;
  color: string;
  fontFamily: string;
  boxWidthPct: number;
  boxHeightPct: number;
  rotation: number;
  showFrame?: boolean;
  bounds: CaptionBounds;
  envelopeWidthPx: number;
  envelopeHeightPx: number;
  onPlacementChange: (placement: CaptionPlacementPatch) => void;
}) {
  const dragOffset = useRef<{ x: number; y: number } | null>(null);
  const rotateDrag = useRef<{ cx: number; cy: number; startAngle: number; startRotation: number } | null>(null);
  const resizeDrag = useRef<{
    edge: "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";
    startX: number;
    startY: number;
    startWpct: number;
    startHpct: number;
  } | null>(null);

  if (!caption) return null;
  const displayPosition = clampCaptionPosition(position, bounds, boxWidthPct, boxHeightPct);

  const pointToPosition = (event: ReactPointerEvent<HTMLDivElement>) => {
    const parent = event.currentTarget.parentElement;
    if (!parent) return position;
    const rect = parent.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerY = ((event.clientY - rect.top) / rect.height) * 100;
    const offset = dragOffset.current ?? { x: 0, y: 0 };
    return clampCaptionPosition(
      { x: pointerX - offset.x, y: pointerY - offset.y },
      bounds,
      boxWidthPct,
      boxHeightPct,
    );
  };

  const maxColPct = captionHorizontalRangePct(bounds);

  const applyResize = (event: ReactPointerEvent, initial: NonNullable<typeof resizeDrag.current>) => {
    const dx = event.clientX - initial.startX;
    const dy = event.clientY - initial.startY;
    const rad = (rotation * Math.PI) / 180;
    const ux = { x: Math.cos(rad), y: Math.sin(rad) };
    const uy = { x: -Math.sin(rad), y: Math.cos(rad) };
    const mx = (dx / envelopeWidthPx) * 100;
    const my = (dy / envelopeHeightPx) * 100;

    let dw = 0;
    let dh = 0;
    const edge = initial.edge;
    if (edge === "e" || edge === "ne" || edge === "se") dw += 2 * (mx * ux.x + my * ux.y);
    if (edge === "w" || edge === "nw" || edge === "sw") dw -= 2 * (mx * ux.x + my * ux.y);
    if (edge === "s" || edge === "sw" || edge === "se") dh += 2 * (mx * uy.x + my * uy.y);
    if (edge === "n" || edge === "nw" || edge === "ne") dh -= 2 * (mx * uy.x + my * uy.y);

    const nextW = Math.round(Math.max(12, Math.min(maxColPct, initial.startWpct + dw)) * 1000) / 1000;
    const nextH = Math.round(Math.max(6, Math.min(78, initial.startHpct + dh)) * 1000) / 1000;
    onPlacementChange({ width: nextW, height: nextH });
  };

  const handleStyle: CSSProperties = {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 4,
    background: "rgba(255,255,255,0.95)",
    border: "1.5px solid rgba(192,106,74,0.85)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
    padding: 0,
    touchAction: "none",
  };

  return (
    <div
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const parent = event.currentTarget.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
        const pointerY = ((event.clientY - rect.top) / rect.height) * 100;
        dragOffset.current = { x: pointerX - displayPosition.x, y: pointerY - displayPosition.y };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragOffset.current) return;
        onPlacementChange(pointToPosition(event));
      }}
      onPointerUp={(event) => {
        if (dragOffset.current) onPlacementChange(pointToPosition(event));
        dragOffset.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        dragOffset.current = null;
      }}
      style={{
        position: "absolute",
        left: `${displayPosition.x}%`,
        top: `${displayPosition.y}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        width: `${boxWidthPct}%`,
        height: `${boxHeightPct}%`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color,
        fontFamily,
        fontSize: size,
        lineHeight: 1.2,
        cursor: "grab",
        whiteSpace: "pre-wrap",
        overflow: "visible",
        textShadow: "0 1px 0 rgba(255,255,255,0.45)",
        touchAction: "none",
        userSelect: "none",
        border: showFrame ? "1.5px dashed rgba(192,106,74,0.85)" : "1.5px solid transparent",
        borderRadius: 8,
        boxShadow: showFrame ? "0 0 0 3px rgba(255,255,255,0.32)" : "none",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          overflowWrap: "break-word",
        }}
      >
        {caption}
      </div>
      {showFrame ? (
        <>
          <button
            type="button"
            aria-label="Rotate front text"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const parent = event.currentTarget.parentElement?.parentElement;
              if (!parent) return;
              const rect = parent.getBoundingClientRect();
              const cx = rect.left + (displayPosition.x / 100) * rect.width;
              const cy = rect.top + (displayPosition.y / 100) * rect.height;
              rotateDrag.current = {
                cx,
                cy,
                startAngle: Math.atan2(event.clientY - cy, event.clientX - cx),
                startRotation: rotation,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!rotateDrag.current) return;
              event.preventDefault();
              const drag = rotateDrag.current;
              const angle = Math.atan2(event.clientY - drag.cy, event.clientX - drag.cx);
              const delta = ((angle - drag.startAngle) * 180) / Math.PI;
              onPlacementChange({ rotation: drag.startRotation + delta });
            }}
            onPointerUp={(event) => {
              rotateDrag.current = null;
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={() => {
              rotateDrag.current = null;
            }}
            style={{
              position: "absolute",
              left: "50%",
              top: -38,
              transform: `translateX(-50%) rotate(${-rotation}deg)`,
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

          {(
            [
              ["nw", -7, -7, "nwse-resize"],
              ["n", "50%", -7, "ns-resize"],
              ["ne", "calc(100% - 7px)", -7, "nesw-resize"],
              ["e", "calc(100% - 7px)", "50%", "ew-resize"],
              ["se", "calc(100% - 7px)", "calc(100% - 7px)", "nwse-resize"],
              ["s", "50%", "calc(100% - 7px)", "ns-resize"],
              ["sw", -7, "calc(100% - 7px)", "nesw-resize"],
              ["w", -7, "50%", "ew-resize"],
            ] as const
          ).map(([edge, left, top, cursor]) => (
            <button
              key={edge}
              type="button"
              aria-label={`Resize front text ${edge}`}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                resizeDrag.current = {
                  edge,
                  startX: event.clientX,
                  startY: event.clientY,
                  startWpct: boxWidthPct,
                  startHpct: boxHeightPct,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!resizeDrag.current) return;
                event.preventDefault();
                applyResize(event, resizeDrag.current);
              }}
              onPointerUp={(event) => {
                resizeDrag.current = null;
                event.currentTarget.releasePointerCapture(event.pointerId);
              }}
              onPointerCancel={() => {
                resizeDrag.current = null;
              }}
              style={{
                ...handleStyle,
                left,
                top,
                transform: "translate(-50%, -50%)",
                cursor,
              }}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

// ── Front text panel ──────────────────────────────────────────────────────────

function FrontTextPanel({
  title,
  caption,
  captionSize,
  captionColor,
  captionFont,
  captionColorInputValue,
  onPatch,
  onCaptionPlacementChange,
}: {
  title: string;
  caption: string | null;
  captionSize: number;
  captionColor: string;
  captionFont: string;
  captionColorInputValue: string;
  onPatch: (partial: Partial<Envelope>) => void;
  onCaptionPlacementChange: (partial: CaptionPlacementPatch) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          borderRadius: 14,
          padding: "12px 14px",
          background: "rgba(253,250,242,0.78)",
          border: "1px solid rgba(0,0,0,0.08)",
          color: "var(--color-muted)",
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        This controls the words on the front of the envelope. Drag the preview above to place it; drag the
        edges or corners of the dashed box to resize. Use Decorate for stickers or extra short phrases.
      </div>

      <Field label="Envelope identity">
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 5 }}>
            <span style={fieldHintSx}>Title</span>
            <input
              value={title}
              onChange={(e) => onPatch({ title: e.target.value })}
              placeholder="Envelope title…"
              name="envelope-title"
              autoComplete="off"
              style={inputSx({ fontFamily: "var(--font-display)", fontSize: 22 })}
            />
          </label>
          <label style={{ display: "grid", gap: 5 }}>
            <span style={fieldHintSx}>Front message</span>
            <input
              value={caption ?? ""}
              onChange={(e) => onPatch({ caption: e.target.value || null })}
              placeholder="Open when you're missing me…"
              name="envelope-caption"
              autoComplete="off"
              style={inputSx({ fontFamily: captionFont, fontSize: 18 })}
            />
          </label>
        </div>
      </Field>

      <Field label="Typography">
        <div style={{ display: "grid", gap: 10 }}>
          <select
            value={captionFont}
            onChange={(e) => onCaptionPlacementChange({ fontFamily: e.target.value })}
            aria-label="Front text font"
            style={{
              borderRadius: 8,
              padding: "8px 10px",
              background: "rgba(255,255,255,0.82)",
              border: "1px solid var(--color-muted)",
              color: "var(--color-ink)",
              fontSize: 12,
            }}
          >
            {EXTRA_TEXT_FONTS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "end" }}>
            <RangeControl
              label="Text"
              min={2}
              max={48}
              value={captionSize}
              onChange={(size) => onCaptionPlacementChange({ size })}
            />
            <button
              type="button"
              onClick={() =>
                onCaptionPlacementChange({
                  ...DEFAULT_FRONT_TEXT_POSITION,
                  size: DEFAULT_FRONT_TEXT_SIZE,
                  width: null,
                  height: null,
                  rotation: DEFAULT_FRONT_TEXT_ROTATION,
                  color: DEFAULT_FRONT_TEXT_COLOR,
                  fontFamily: DEFAULT_FRONT_TEXT_FONT,
                })
              }
              style={{ ...ghostButtonSx, marginBottom: 2 }}
            >
              Reset layout
            </button>
          </div>
        </div>
      </Field>

      <Field label="Text color">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {CAPTION_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              aria-label={color.label}
              onClick={() => onCaptionPlacementChange({ color: color.value })}
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: color.value,
                border: captionColor === color.value ? "2px solid var(--color-ink)" : "1px solid rgba(0,0,0,0.2)",
                boxShadow: captionColor === color.value ? "0 0 0 2px rgba(255,255,255,0.8)" : "none",
                cursor: "pointer",
              }}
            />
          ))}
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-muted)" }}>
            Custom
            <input
              type="color"
              value={captionColorInputValue}
              onChange={(e) => onCaptionPlacementChange({ color: e.target.value })}
              aria-label="Custom envelope front text color"
              style={{
                width: 30,
                height: 26,
                padding: 0,
                border: "1px solid rgba(0,0,0,0.18)",
                borderRadius: 7,
                background: "transparent",
                cursor: "pointer",
              }}
            />
          </label>
        </div>
      </Field>
    </div>
  );
}

function RangeControl({
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
    <label style={{ display: "grid", gap: 4, fontSize: 11, color: "var(--color-muted)" }}>
      <span style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
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

// ── Contents panel ────────────────────────────────────────────────────────────

function ContentsPanel({
  bundleId,
  envelopeId,
  items,
  onItemsChange,
}: {
  bundleId: string;
  envelopeId: string;
  items: ItemRow[];
  onItemsChange: (envelopeId: string, items: ItemRow[]) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-muted)", marginBottom: 5 }}>
          What&rsquo;s inside this envelope
        </div>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--color-muted)" }}>
          Add as many pieces as you want: a letter, photos, a voice note, a ticket scan, a gift card, or a little cash note.
        </p>
      </div>
      <ItemsEditor
        bundleId={bundleId}
        envelopeId={envelopeId}
        initialItems={items}
        onItemsChange={onItemsChange}
      />
    </div>
  );
}

// ── Design panel ──────────────────────────────────────────────────────────────

function DesignPanel({
  themeOverrideId, envelopeDesignId, sealColorOverride,
  bundleThemeId, designSeal, onPatch,
}: {
  themeOverrideId: string | null;
  envelopeDesignId: string;
  sealColorOverride: string | null;
  bundleThemeId: string;
  designSeal: string;
  onPatch: (partial: Partial<Envelope>) => void;
}) {
  const themeId = (themeOverrideId as ThemeId) ?? (bundleThemeId as ThemeId);
  const designs = designsFor(themeId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Field label="Theme">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button type="button"
            onClick={() => onPatch({ themeOverrideId: null, envelopeDesignId: designsFor(bundleThemeId as ThemeId)[0].id })}
            style={pillSx(themeOverrideId === null)}>
            Match bundle
          </button>
          {themeList.map((t) => (
            <button key={t.id} type="button"
              onClick={() => onPatch({ themeOverrideId: t.id, envelopeDesignId: designsFor(t.id)[0].id })}
              style={pillSx(themeOverrideId === t.id)}>
              {t.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Seal color">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          {SEAL_PRESETS.map((p) => {
            const active = sealColorOverride === p.color;
            return (
              <button key={p.id} type="button"
                onClick={() => onPatch({ sealColorOverride: p.color })}
                aria-label={p.label} title={p.label}
                style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: p.color ?? `linear-gradient(135deg, ${designSeal}, ${designSeal})`,
                  cursor: "pointer",
                  border: active ? "2px solid var(--color-ink)" : "2px solid rgba(0,0,0,0.08)",
                  boxShadow: active ? "0 0 0 2px rgba(255,255,255,0.8)" : "none",
                  position: "relative",
                }}>
                {p.color === null && (
                  <span style={{
                    position: "absolute", inset: 0, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 10, color: "var(--color-bg)", fontWeight: 700,
                    textShadow: "0 1px 1px rgba(0,0,0,0.4)",
                  }}>✓</span>
                )}
              </button>
            );
          })}
          <label style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 11, color: "var(--color-muted)", marginLeft: 4,
          }}>
            Custom
            <input type="color"
              value={sealColorOverride ?? designSeal}
              onChange={(e) => onPatch({ sealColorOverride: e.target.value })}
              style={{
                width: 28, height: 28, padding: 0, border: "1px solid var(--color-muted)",
                borderRadius: 6, background: "transparent", cursor: "pointer",
              }}/>
          </label>
        </div>
      </Field>

      <Field label="Design">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
          {designs.map((d) => (
            <button key={d.id} type="button"
              onClick={() => onPatch({ envelopeDesignId: d.id })}
              style={{
                borderRadius: 12, padding: 6, background: envelopeDesignId === d.id ? "rgba(255,255,255,0.7)" : "transparent",
                cursor: "pointer",
                border: `2px solid ${envelopeDesignId === d.id ? "var(--color-ink)" : "transparent"}`,
                transition: "background 0.15s, border-color 0.15s",
              }}>
              {d.imageUrl ? (
                <PhotoEnvelope design={d} width={118} height={76} state="closed" />
              ) : (
                <EnvelopeSVG design={d} width={118} height={76} />
              )}
              <div style={{ marginTop: 4, fontSize: 11, color: "var(--color-ink)", textAlign: "center" }}>{d.name}</div>
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

// ── Stamps panel ──────────────────────────────────────────────────────────────

function StampsPanel({
  pending, setPending, query, setQuery, category, setCategory, stamps, onClearAll,
}: {
  pending: PendingStamp | null;
  setPending: (p: PendingStamp | null) => void;
  query: string;
  setQuery: (q: string) => void;
  category: string;
  setCategory: (c: string) => void;
  stamps: EnvelopeStamp[];
  onClearAll: () => void;
}) {
  const results = useMemo(() => {
    if (!query.trim()) return null;
    return searchStickers(query);
  }, [query]);
  const [envelopeText, setEnvelopeText] = useState("");
  const [envelopeTextColor, setEnvelopeTextColor] = useState("#3b2a1e");
  const [envelopeTextFont, setEnvelopeTextFont] = useState<string>(EXTRA_TEXT_FONTS[0].value);
  const [envelopeTextSize, setEnvelopeTextSize] = useState(12);

  const emojis = results ?? STAMP_EMOJI_LIBRARY.find((c) => c.id === category)?.emojis ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px",
        borderRadius: 10, background: "rgba(253,250,242,0.8)",
        border: "1px dashed var(--color-muted)",
        fontSize: 12, color: "var(--color-muted)",
        fontFamily: "var(--font-hand)",
      }}>
        <Sparkles size={14} style={{ color: "#c06a4a" }} />
        Add optional decorations to the envelope front. For the main envelope message, use Front Text.
      </div>

      <Field label="Extra placed text">
        <div style={{ display: "grid", gap: 10 }}>
          <input
            value={envelopeText}
            onChange={(e) => setEnvelopeText(e.target.value)}
            placeholder="Tiny note, initials, postmark…"
            style={{
              minWidth: 0,
              borderRadius: 8,
              padding: "8px 12px",
              background: "rgba(255,255,255,0.82)",
              border: "1px solid var(--color-muted)",
              color: "var(--color-ink)",
              fontFamily: envelopeTextFont,
              fontSize: 15,
            }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={envelopeTextFont}
              onChange={(e) => setEnvelopeTextFont(e.target.value)}
              aria-label="Extra text font"
              style={{
                borderRadius: 8,
                padding: "7px 10px",
                background: "rgba(255,255,255,0.82)",
                border: "1px solid var(--color-muted)",
                color: "var(--color-ink)",
                fontSize: 12,
              }}
            >
              {EXTRA_TEXT_FONTS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-muted)" }}>
              Size
              <input
                type="range"
                min={2}
                max={22}
                value={envelopeTextSize}
                onChange={(e) => setEnvelopeTextSize(Number(e.target.value))}
                aria-label="Extra text size"
                style={{ width: 95 }}
              />
            </label>
            <input
              type="color"
              value={envelopeTextColor}
              onChange={(e) => setEnvelopeTextColor(e.target.value)}
              aria-label="Extra text color"
              style={{ width: 32, height: 32, padding: 0, borderRadius: 8, border: "1px solid var(--color-muted)", background: "transparent" }}
            />
            <button
              type="button"
              disabled={!envelopeText.trim()}
              onClick={() =>
                setPending({
                  kind: "text",
                  value: envelopeText.trim(),
                  color: envelopeTextColor,
                  fontFamily: envelopeTextFont,
                  size: envelopeTextSize,
                })
              }
              style={{
                borderRadius: 999,
                padding: "8px 13px",
                fontSize: 12,
                background: envelopeText.trim() ? "var(--color-ink)" : "rgba(0,0,0,0.18)",
                color: "var(--color-bg)",
                border: "none",
                cursor: envelopeText.trim() ? "pointer" : "default",
                whiteSpace: "nowrap",
              }}
            >
              Add Text
            </button>
          </div>
        </div>
      </Field>

      {/* Custom assets row */}
      {STAMP_ASSETS.length > 0 && (
        <Field label="Your stamps">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {STAMP_ASSETS.map((a) => {
              const active = pending?.kind === "asset" && pending.value === a.url;
              return (
                <button key={a.id} type="button"
                  onClick={() => setPending(active ? null : { kind: "asset", value: a.url })}
                  title={a.label}
                  style={{
                    width: 64, height: 64, borderRadius: 10,
                    background: active ? "rgba(192,106,74,0.12)" : "rgba(255,255,255,0.7)",
                    border: active ? "1.5px solid #c06a4a" : "1px solid rgba(0,0,0,0.08)",
                    cursor: "pointer", padding: 6,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s, border-color 0.15s",
                  }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.label} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                </button>
              );
            })}
          </div>
        </Field>
      )}

      {/* Emoji stamps library */}
      <Field
        label="Emoji stamps"
        action={
          stamps.length > 0 ? (
            <button type="button" onClick={onClearAll}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                background: "transparent", border: "none",
                color: "var(--color-muted)", fontSize: 11, cursor: "pointer",
              }}>
              <Trash2 size={11} /> Clear all ({stamps.length})
            </button>
          ) : null
        }
      >
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search — heart, cake, rocket…"
            style={{
              width: "100%", boxSizing: "border-box",
              borderRadius: 8, padding: "7px 10px 7px 30px", fontSize: 12,
              background: "rgba(255,255,255,0.85)",
              border: "1px solid var(--color-muted)",
              color: "var(--color-ink)",
            }}
          />
        </div>

        {/* Category tabs */}
        {!results && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
            {STAMP_EMOJI_LIBRARY.map((cat) => (
              <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
                style={pillSx(category === cat.id, { fontSize: 11, padding: "3px 11px" })}>
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {emojis.length === 0 ? (
          <div style={{ padding: "16px 4px", textAlign: "center", fontSize: 12, color: "var(--color-muted)" }}>
            No stamps match &ldquo;{query}&rdquo;
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))",
            gap: 4,
            maxHeight: 176,
            overflowY: "auto",
            padding: 2,
          }}>
            {emojis.map((e, i) => {
              const active = pending?.kind === "emoji" && pending.value === e;
              return (
                <button key={`${e}-${i}`} type="button"
                  onClick={() => setPending(active ? null : { kind: "emoji", value: e })}
                  style={{
                    fontSize: 24, lineHeight: 1, padding: 6, cursor: "pointer",
                    borderRadius: 8,
                    background: active ? "rgba(192,106,74,0.15)" : "transparent",
                    border: active ? "1.5px solid #c06a4a" : "1.5px solid transparent",
                    aspectRatio: "1",
                    transition: "background 0.1s, border-color 0.1s",
                  }}>
                  {e}
                </button>
              );
            })}
          </div>
        )}
      </Field>
    </div>
  );
}

// ── Unlock panel ──────────────────────────────────────────────────────────────

function UnlockPanel({
  unlockType, unlockAt, onPatch,
}: {
  unlockType: Envelope["unlockType"];
  unlockAt: string | null;
  onPatch: (partial: Partial<Envelope>) => void;
}) {
  return (
    <Field label="When does it open?">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {UNLOCK_OPTIONS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button"
            onClick={() => onPatch({ unlockType: key, unlockAt: key !== "date" ? null : unlockAt })}
            style={{ ...pillSx(unlockType === key), display: "inline-flex", alignItems: "center", gap: 5 }}>
            <Icon size={12} />{label}
          </button>
        ))}
      </div>
      {unlockType === "date" && (
        <input
          type="datetime-local"
          aria-label="Unlock date and time"
          value={unlockAt ? unlockAt.slice(0, 16) : ""}
          onChange={(e) => onPatch({ unlockAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
          style={{
            marginTop: 10, borderRadius: 8, background: "rgba(255,255,255,0.7)",
            padding: "8px 14px", border: "1px solid var(--color-muted)",
            color: "var(--color-ink)", fontSize: 13,
          }}
        />
      )}
      {unlockType === "passphrase" && (
        <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.6, color: "var(--color-muted)" }}>
          This envelope uses the bundle passphrase. Open <b>Bundle settings</b> in the left sidebar and set the Passphrase there.
        </div>
      )}
    </Field>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({ label, action, children }: { label: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-muted)", fontWeight: 600 }}>
          {label}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const fieldHintSx: React.CSSProperties = {
  fontSize: 11,
  color: "var(--color-muted)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

function inputSx(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 12,
    border: "1px solid var(--color-muted)",
    background: "rgba(255,255,255,0.78)",
    color: "var(--color-ink)",
    padding: "10px 12px",
    ...extra,
  };
}

const ghostButtonSx: React.CSSProperties = {
  borderRadius: 999,
  border: "1px solid var(--color-muted)",
  background: "transparent",
  color: "var(--color-muted)",
  cursor: "pointer",
  fontSize: 12,
  padding: "6px 12px",
};

function pillSx(active: boolean, extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    borderRadius: 999, padding: "6px 14px", fontSize: 12, cursor: "pointer",
    background: active ? "var(--color-ink)" : "transparent",
    color: active ? "var(--color-bg)" : "var(--color-ink)",
    border: `1px solid ${active ? "var(--color-ink)" : "var(--color-muted)"}`,
    ...extra,
  };
}
