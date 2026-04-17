"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { designsFor, themeList, type ThemeId, type EnvelopeDesignId } from "@/lib/themes";
import { EnvelopeSVG } from "@/components/envelope/EnvelopeSVG";
import { upsertEnvelope } from "@/app/actions/bundles";
import { ItemsEditor } from "./ItemsEditor";

type Envelope = {
  id: string;
  title: string;
  caption: string | null;
  orderIndex: number;
  unlockType: "immediate" | "date" | "passphrase" | "manual";
  unlockAt: string | null;
  envelopeDesignId: string;
  themeOverrideId: string | null;
};

type ItemRow = {
  id: string;
  envelopeId: string;
  type: string;
  orderIndex: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: Record<string, any>;
};

export function EnvelopeEditor({
  bundleId,
  bundleThemeId,
  envelope: initial,
  items,
  onClose,
  onSaved,
}: {
  bundleId: string;
  bundleThemeId: string;
  envelope: Envelope;
  items: ItemRow[];
  onClose: () => void;
  onSaved: (e: Envelope) => void;
}) {
  const [env, setEnv] = useState<Envelope>(initial);
  const [saving, setSaving] = useState(false);
  const themeId = (env.themeOverrideId as ThemeId) ?? (bundleThemeId as ThemeId);
  const designs = designsFor(themeId);
  const design = designs.find((d) => d.id === env.envelopeDesignId) ?? designs[0];

  const save = async () => {
    setSaving(true);
    const res = await upsertEnvelope({
      id: env.id,
      bundleId,
      title: env.title,
      caption: env.caption ?? "",
      orderIndex: env.orderIndex,
      unlockType: env.unlockType,
      unlockAt: env.unlockAt,
      envelopeDesignId: env.envelopeDesignId as EnvelopeDesignId,
      themeOverrideId: env.themeOverrideId as ThemeId | null,
    });
    setSaving(false);
    if (res.ok) onSaved(env);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6">
      <div
        className="paper w-full max-w-3xl rounded-[var(--radius-lg)] p-6 md:p-8 relative"
        style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.4)" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full"
          aria-label="Close"
          style={{ background: "rgba(0,0,0,0.06)", color: "var(--color-ink)" }}
        >
          <X size={16} />
        </button>

        <div className="grid md:grid-cols-[260px_1fr] gap-6">
          <div className="flex justify-center">
            <EnvelopeSVG design={design} width={240} height={150} />
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
                Title
              </span>
              <input
                value={env.title}
                onChange={(e) => setEnv({ ...env, title: e.target.value })}
                className="rounded-[var(--radius-md)] bg-white/60 px-4 py-3"
                style={{ border: "1px solid var(--color-muted)", color: "var(--color-ink)" }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
                Caption (optional — shown on the locked card)
              </span>
              <input
                value={env.caption ?? ""}
                onChange={(e) => setEnv({ ...env, caption: e.target.value })}
                className="rounded-[var(--radius-md)] bg-white/60 px-4 py-3 font-hand"
                style={{ border: "1px solid var(--color-muted)", color: "var(--color-ink)" }}
                placeholder="open when you're missing me"
              />
            </label>
          </div>
        </div>

        {/* Trigger */}
        <div className="mt-6">
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--color-muted)" }}>
            When does it open?
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              ["immediate", "Right away"],
              ["date", "On a date"],
              ["passphrase", "With passphrase"],
              ["manual", "Keep locked"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setEnv({ ...env, unlockType: k })}
                className="rounded-full px-3 py-1.5 text-xs border"
                style={{
                  background: env.unlockType === k ? "var(--color-ink)" : "transparent",
                  color: env.unlockType === k ? "var(--color-bg)" : "var(--color-ink)",
                  borderColor: "var(--color-ink)",
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {env.unlockType === "date" ? (
            <input
              type="datetime-local"
              value={env.unlockAt ? env.unlockAt.slice(0, 16) : ""}
              onChange={(e) =>
                setEnv({
                  ...env,
                  unlockAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
              className="mt-3 rounded-[var(--radius-md)] bg-white/60 px-4 py-2"
              style={{ border: "1px solid var(--color-muted)", color: "var(--color-ink)" }}
            />
          ) : null}
        </div>

        {/* Design picker */}
        <div className="mt-6">
          <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--color-muted)" }}>
            Envelope look
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setEnv({ ...env, themeOverrideId: null })}
              className="rounded-full px-3 py-1 text-[11px] border"
              style={{
                background: env.themeOverrideId === null ? "var(--color-ink)" : "transparent",
                color: env.themeOverrideId === null ? "var(--color-bg)" : "var(--color-ink)",
                borderColor: "var(--color-ink)",
              }}
            >
              Match bundle
            </button>
            {themeList.map((t) => (
              <button
                key={t.id}
                onClick={() => setEnv({ ...env, themeOverrideId: t.id })}
                className="rounded-full px-3 py-1 text-[11px] border"
                style={{
                  background: env.themeOverrideId === t.id ? "var(--color-ink)" : "transparent",
                  color: env.themeOverrideId === t.id ? "var(--color-bg)" : "var(--color-ink)",
                  borderColor: "var(--color-ink)",
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {designs.map((d) => (
              <button
                key={d.id}
                onClick={() => setEnv({ ...env, envelopeDesignId: d.id })}
                className="rounded-[var(--radius-md)] p-2 border"
                style={{
                  borderColor: env.envelopeDesignId === d.id ? "var(--color-ink)" : "transparent",
                  background: "rgba(255,255,255,0.25)",
                }}
              >
                <EnvelopeSVG design={d} width={160} height={100} />
                <div className="mt-1 text-xs" style={{ color: "var(--color-ink)" }}>
                  {d.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        <hr className="my-6 opacity-20" />

        {/* Items */}
        <ItemsEditor bundleId={bundleId} envelopeId={env.id} initialItems={items} />

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm border"
            style={{ borderColor: "var(--color-muted)", color: "var(--color-ink)" }}
          >
            Close
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full px-5 py-2 text-sm"
            style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
          >
            {saving ? "Saving…" : "Save envelope"}
          </button>
        </div>
      </div>
    </div>
  );
}
