"use client";

import { useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Gift,
  Smile,
  Wallet,
  Mic,
  Trash2,
} from "lucide-react";
import { addItem, deleteItem } from "@/app/actions/bundles";
import type { ItemPayload } from "@/lib/types";

type ItemRow = {
  id: string;
  envelopeId: string;
  type: string;
  orderIndex: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: Record<string, any>;
};

const itemTypes: Array<{
  key: ItemPayload["type"];
  label: string;
  icon: typeof FileText;
  hint: string;
}> = [
  { key: "text", label: "Letter", icon: FileText, hint: "A handwritten note" },
  { key: "image", label: "Photo", icon: ImageIcon, hint: "Polaroid-style" },
  { key: "gif", label: "GIF", icon: Smile, hint: "A reaction or memory" },
  { key: "giftcard", label: "Gift card", icon: Gift, hint: "BYO code" },
  { key: "money_note", label: "Cash", icon: Wallet, hint: "With a payment link" },
  { key: "audio", label: "Voice note", icon: Mic, hint: "Record or upload" },
];

export function ItemsEditor({
  bundleId,
  envelopeId,
  initialItems,
}: {
  bundleId: string;
  envelopeId: string;
  initialItems: ItemRow[];
}) {
  const [items, setItems] = useState(initialItems);
  const [adding, setAdding] = useState<ItemPayload["type"] | null>(null);

  const remove = async (id: string) => {
    const res = await deleteItem(id, bundleId);
    if (res.ok) setItems((xs) => xs.filter((i) => i.id !== id));
  };

  const add = async (payload: ItemPayload, meta: Record<string, unknown> = {}) => {
    const res = await addItem({
      envelopeId,
      orderIndex: items.length,
      payload,
      meta,
    });
    if (res.ok) {
      setItems((xs) => [
        ...xs,
        {
          id: res.data.id,
          envelopeId,
          type: payload.type,
          orderIndex: xs.length,
          meta,
        },
      ]);
      setAdding(null);
    }
  };

  return (
    <div>
      <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--color-muted)" }}>
        Contents ({items.length})
      </div>
      <div className="flex flex-col gap-2">
        {items.map((i) => (
          <div
            key={i.id}
            className="flex items-center justify-between rounded-[var(--radius-md)] px-4 py-3"
            style={{ background: "rgba(255,255,255,0.35)", border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div className="flex items-center gap-3">
              <ItemIcon type={i.type} />
              <div>
                <div className="font-medium capitalize" style={{ color: "var(--color-ink)" }}>
                  {i.type.replace("_", " ")}
                </div>
                {i.meta?.captionHint || i.meta?.vendor ? (
                  <div className="text-xs" style={{ color: "var(--color-muted)" }}>
                    {i.meta?.captionHint ?? i.meta?.vendor}
                  </div>
                ) : null}
              </div>
            </div>
            <button
              onClick={() => remove(i.id)}
              className="p-2 rounded-full"
              style={{ background: "rgba(0,0,0,0.06)", color: "var(--color-ink)" }}
              aria-label="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {itemTypes.map((t) => (
          <button
            key={t.key}
            onClick={() => setAdding(t.key)}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs border"
            style={{ borderColor: "var(--color-muted)", color: "var(--color-ink)" }}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {adding ? (
        <AddItemPanel
          bundleId={bundleId}
          type={adding}
          onCancel={() => setAdding(null)}
          onAdd={add}
        />
      ) : null}
    </div>
  );
}

function ItemIcon({ type }: { type: string }) {
  const i =
    type === "text" ? FileText
    : type === "image" ? ImageIcon
    : type === "gif" ? Smile
    : type === "giftcard" ? Gift
    : type === "money_note" ? Wallet
    : Mic;
  const C = i;
  return <C size={16} style={{ color: "var(--color-accent)" }} />;
}

function AddItemPanel({
  bundleId,
  type,
  onCancel,
  onAdd,
}: {
  bundleId: string;
  type: ItemPayload["type"];
  onCancel: () => void;
  onAdd: (p: ItemPayload, meta?: Record<string, unknown>) => Promise<void> | void;
}) {
  return (
    <div
      className="mt-4 rounded-[var(--radius-lg)] p-4"
      style={{ background: "rgba(255,255,255,0.45)", border: "1px solid rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium capitalize" style={{ color: "var(--color-ink)" }}>
          New {type.replace("_", " ")}
        </div>
        <button onClick={onCancel} className="text-xs" style={{ color: "var(--color-muted)" }}>
          Cancel
        </button>
      </div>
      {type === "text" ? <TextPanel onAdd={onAdd} /> : null}
      {type === "image" ? <ImagePanel bundleId={bundleId} onAdd={onAdd} /> : null}
      {type === "gif" ? <GifPanel onAdd={onAdd} /> : null}
      {type === "giftcard" ? <GiftCardPanel onAdd={onAdd} /> : null}
      {type === "money_note" ? <MoneyPanel onAdd={onAdd} /> : null}
      {type === "audio" ? <AudioPanel bundleId={bundleId} onAdd={onAdd} /> : null}
    </div>
  );
}

function TextPanel({
  onAdd,
}: {
  onAdd: (p: ItemPayload, meta?: Record<string, unknown>) => void | Promise<void>;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={6}
        placeholder="Write your letter…"
        className="rounded-[var(--radius-md)] bg-white/80 px-4 py-3 font-hand text-lg"
        style={{ border: "1px solid var(--color-muted)", color: "var(--color-ink)" }}
      />
      <button
        className="self-end rounded-full px-5 py-2 text-sm"
        style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
        onClick={() => {
          const html = value
            .split(/\n+/)
            .map((p) => `<p>${escapeHtml(p)}</p>`)
            .join("");
          return onAdd({ type: "text", html });
        }}
      >
        Add letter
      </button>
    </div>
  );
}

function ImagePanel({
  bundleId,
  onAdd,
}: {
  bundleId: string;
  onAdd: (p: ItemPayload, meta?: Record<string, unknown>) => void | Promise<void>;
}) {
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setErr(null);
    const form = new FormData();
    form.append("file", file);
    form.append("bundleId", bundleId);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    setUploading(false);
    if (!res.ok) {
      setErr(json.error ?? "Upload failed");
      return;
    }
    await onAdd(
      { type: "image", storageKey: json.storageKey, caption: caption || undefined },
      { mime: json.mime, captionHint: caption || undefined },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (optional)"
        className="rounded-[var(--radius-md)] bg-white/80 px-4 py-2 font-hand"
        style={{ border: "1px solid var(--color-muted)", color: "var(--color-ink)" }}
      />
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      {uploading ? <div className="text-xs" style={{ color: "var(--color-muted)" }}>Uploading…</div> : null}
      {err ? <div className="text-xs" style={{ color: "var(--color-seal)" }}>{err}</div> : null}
    </div>
  );
}

function GifPanel({ onAdd }: { onAdd: (p: ItemPayload, meta?: Record<string, unknown>) => void | Promise<void> }) {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste a GIF URL (tenor, giphy, …)"
        className="rounded-[var(--radius-md)] bg-white/80 px-4 py-2"
        style={{ border: "1px solid var(--color-muted)", color: "var(--color-ink)" }}
      />
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Caption (optional)"
        className="rounded-[var(--radius-md)] bg-white/80 px-4 py-2 font-hand"
        style={{ border: "1px solid var(--color-muted)", color: "var(--color-ink)" }}
      />
      <button
        className="self-end rounded-full px-5 py-2 text-sm"
        style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
        disabled={!url}
        onClick={() => onAdd({ type: "gif", url, caption: caption || undefined })}
      >
        Add GIF
      </button>
    </div>
  );
}

function GiftCardPanel({
  onAdd,
}: {
  onAdd: (p: ItemPayload, meta?: Record<string, unknown>) => void | Promise<void>;
}) {
  const [vendor, setVendor] = useState("Amazon");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [redeemUrl, setRedeemUrl] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [currency, setCurrency] = useState("USD");
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <input
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          placeholder="Vendor"
          className="rounded-[var(--radius-md)] bg-white/80 px-4 py-2"
          style={{ border: "1px solid var(--color-muted)" }}
        />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Code"
          className="rounded-[var(--radius-md)] bg-white/80 px-4 py-2 font-mono tracking-wider"
          style={{ border: "1px solid var(--color-muted)" }}
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
          placeholder="Amount (optional)"
          className="rounded-[var(--radius-md)] bg-white/80 px-4 py-2"
          style={{ border: "1px solid var(--color-muted)" }}
        />
        <input
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
          placeholder="USD"
          className="rounded-[var(--radius-md)] bg-white/80 px-4 py-2"
          style={{ border: "1px solid var(--color-muted)" }}
        />
      </div>
      <input
        value={redeemUrl}
        onChange={(e) => setRedeemUrl(e.target.value)}
        placeholder="Redeem URL (optional)"
        className="rounded-[var(--radius-md)] bg-white/80 px-4 py-2"
        style={{ border: "1px solid var(--color-muted)" }}
      />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="rounded-[var(--radius-md)] bg-white/80 px-4 py-2 font-hand"
        style={{ border: "1px solid var(--color-muted)" }}
      />
      <button
        className="self-end rounded-full px-5 py-2 text-sm"
        style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
        disabled={!vendor || !code}
        onClick={() =>
          onAdd(
            {
              type: "giftcard",
              vendor,
              code,
              note: note || undefined,
              redeemUrl: redeemUrl || undefined,
            },
            {
              vendor,
              publicAmount:
                typeof amount === "number" ? { amount, currency } : undefined,
            },
          )
        }
      >
        Add gift card
      </button>
    </div>
  );
}

function MoneyPanel({
  onAdd,
}: {
  onAdd: (p: ItemPayload, meta?: Record<string, unknown>) => void | Promise<void>;
}) {
  const [amount, setAmount] = useState<number | "">("");
  const [currency, setCurrency] = useState("USD");
  const [instructions, setInstructions] = useState("");
  const [link, setLink] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
          placeholder="Amount"
          className="rounded-[var(--radius-md)] bg-white/80 px-4 py-2"
          style={{ border: "1px solid var(--color-muted)" }}
        />
        <input
          value={currency}
          onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
          placeholder="USD"
          className="rounded-[var(--radius-md)] bg-white/80 px-4 py-2"
          style={{ border: "1px solid var(--color-muted)" }}
        />
      </div>
      <input
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Instructions (optional — e.g. 'for a good dinner')"
        className="rounded-[var(--radius-md)] bg-white/80 px-4 py-2 font-hand"
        style={{ border: "1px solid var(--color-muted)" }}
      />
      <input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Payment link (Venmo, PayPal, etc.)"
        className="rounded-[var(--radius-md)] bg-white/80 px-4 py-2"
        style={{ border: "1px solid var(--color-muted)" }}
      />
      <button
        className="self-end rounded-full px-5 py-2 text-sm"
        style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
        disabled={typeof amount !== "number"}
        onClick={() =>
          typeof amount === "number" &&
          onAdd(
            {
              type: "money_note",
              amount,
              currency,
              instructions: instructions || undefined,
              link: link || undefined,
            },
            { publicAmount: { amount, currency } },
          )
        }
      >
        Add cash
      </button>
    </div>
  );
}

function AudioPanel({
  bundleId,
  onAdd,
}: {
  bundleId: string;
  onAdd: (p: ItemPayload, meta?: Record<string, unknown>) => void | Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setErr(null);
    const form = new FormData();
    form.append("file", file);
    form.append("bundleId", bundleId);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    setUploading(false);
    if (!res.ok) {
      setErr(json.error ?? "Upload failed");
      return;
    }
    await onAdd({ type: "audio", storageKey: json.storageKey });
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        accept="audio/*"
        disabled={uploading}
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      {uploading ? <div className="text-xs" style={{ color: "var(--color-muted)" }}>Uploading…</div> : null}
      {err ? <div className="text-xs" style={{ color: "var(--color-seal)" }}>{err}</div> : null}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
