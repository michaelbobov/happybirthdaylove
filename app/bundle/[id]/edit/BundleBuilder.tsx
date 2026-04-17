"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Clock, Lock, Zap } from "lucide-react";
import { themeList, getTheme, designsFor, type ThemeId } from "@/lib/themes";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { EnvelopeSVG } from "@/components/envelope/EnvelopeSVG";
import { upsertEnvelope, deleteEnvelope } from "@/app/actions/bundles";
import { EnvelopeEditor } from "./EnvelopeEditor";

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

export function BundleBuilder({
  bundle,
  envelopes: initialEnvelopes,
  items,
}: {
  bundle: { id: string; themeId: string };
  envelopes: Envelope[];
  items: ItemRow[];
}) {
  const [envelopes, setEnvelopes] = useState(initialEnvelopes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const theme = getTheme(bundle.themeId);

  const itemsByEnvelope = useMemo(() => {
    const map: Record<string, ItemRow[]> = {};
    for (const it of items) (map[it.envelopeId] ??= []).push(it);
    return map;
  }, [items]);

  const addEnvelope = async () => {
    const idx = envelopes.length;
    const res = await upsertEnvelope({
      bundleId: bundle.id,
      title: `Envelope ${idx + 1}`,
      caption: "",
      orderIndex: idx,
      unlockType: "immediate",
      unlockAt: null,
      envelopeDesignId: theme.designs[0].id,
      themeOverrideId: null,
    });
    if (res.ok) {
      setEnvelopes((es) => [
        ...es,
        {
          id: res.data.id,
          title: `Envelope ${idx + 1}`,
          caption: "",
          orderIndex: idx,
          unlockType: "immediate",
          unlockAt: null,
          envelopeDesignId: theme.designs[0].id,
          themeOverrideId: null,
        },
      ]);
      setEditingId(res.data.id);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this envelope and everything inside?")) return;
    const res = await deleteEnvelope(id, bundle.id);
    if (res.ok) setEnvelopes((es) => es.filter((e) => e.id !== id));
  };

  const onEnvelopeUpdated = (next: Envelope) => {
    setEnvelopes((es) => es.map((e) => (e.id === next.id ? next : e)));
  };

  return (
    <ThemeProvider themeId={bundle.themeId as ThemeId} as="section" className="mt-8">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {envelopes.map((env) => (
          <EnvelopeCard
            key={env.id}
            envelope={env}
            themeId={bundle.themeId}
            itemCount={itemsByEnvelope[env.id]?.length ?? 0}
            onClick={() => setEditingId(env.id)}
            onDelete={() => remove(env.id)}
          />
        ))}

        <button
          onClick={addEnvelope}
          className="rounded-[var(--radius-lg)] border-2 border-dashed p-10 flex flex-col items-center justify-center gap-2 min-h-[220px]"
          style={{ borderColor: "var(--color-muted)", color: "var(--color-muted)" }}
        >
          <Plus size={28} />
          <span className="font-display text-lg">Add envelope</span>
        </button>
      </div>

      <div className="mt-10">
        <ThemePicker
          currentThemeId={bundle.themeId}
          bundleId={bundle.id}
        />
      </div>

      {editingId ? (
        <EnvelopeEditor
          bundleId={bundle.id}
          bundleThemeId={bundle.themeId}
          envelope={envelopes.find((e) => e.id === editingId)!}
          items={itemsByEnvelope[editingId] ?? []}
          onClose={() => setEditingId(null)}
          onSaved={onEnvelopeUpdated}
        />
      ) : null}
    </ThemeProvider>
  );
}

function EnvelopeCard({
  envelope,
  themeId,
  itemCount,
  onClick,
  onDelete,
}: {
  envelope: Envelope;
  themeId: string;
  itemCount: number;
  onClick: () => void;
  onDelete: () => void;
}) {
  const designs = designsFor((envelope.themeOverrideId as ThemeId) ?? (themeId as ThemeId));
  const design = designs.find((d) => d.id === envelope.envelopeDesignId) ?? designs[0];
  return (
    <div
      className="relative paper rounded-[var(--radius-lg)] p-5 group cursor-pointer transition-transform hover:-translate-y-1"
      onClick={onClick}
      style={{ boxShadow: "0 10px 26px var(--color-shadow)" }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label="Delete"
        className="absolute top-3 right-3 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "rgba(0,0,0,0.06)", color: "var(--color-ink)" }}
      >
        <Trash2 size={14} />
      </button>
      <div className="flex justify-center">
        <EnvelopeSVG design={design} width={260} height={170} />
      </div>
      <div className="mt-4 font-display text-xl" style={{ color: "var(--color-ink)" }}>
        {envelope.title}
      </div>
      <div className="mt-1 text-xs flex items-center gap-2" style={{ color: "var(--color-muted)" }}>
        {envelope.unlockType === "date" ? (
          <>
            <Clock size={12} />
            Opens {envelope.unlockAt ? new Date(envelope.unlockAt).toLocaleString() : "—"}
          </>
        ) : envelope.unlockType === "passphrase" ? (
          <>
            <Lock size={12} /> Passphrase-locked
          </>
        ) : envelope.unlockType === "manual" ? (
          <>
            <Lock size={12} /> Manual lock
          </>
        ) : (
          <>
            <Zap size={12} /> Opens immediately
          </>
        )}
      </div>
      <div className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
        {itemCount} item{itemCount === 1 ? "" : "s"} inside
      </div>
    </div>
  );
}

function ThemePicker({
  currentThemeId,
  bundleId,
}: {
  currentThemeId: string;
  bundleId: string;
}) {
  return (
    <div className="paper rounded-[var(--radius-lg)] p-5" style={{ boxShadow: "0 10px 22px var(--color-shadow)" }}>
      <div className="text-xs uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
        Bundle theme
      </div>
      <form
        action={async (fd) => {
          const newTheme = String(fd.get("theme_id"));
          await fetch(`/api/bundles/${bundleId}/theme`, {
            method: "POST",
            body: JSON.stringify({ themeId: newTheme }),
            headers: { "content-type": "application/json" },
          });
          window.location.reload();
        }}
        className="mt-2 flex flex-wrap gap-2"
      >
        {themeList.map((t) => (
          <button
            key={t.id}
            type="submit"
            name="theme_id"
            value={t.id}
            className="rounded-full px-3 py-1.5 text-xs border"
            style={{
              background: t.id === currentThemeId ? "var(--color-ink)" : "transparent",
              color: t.id === currentThemeId ? "var(--color-bg)" : "var(--color-ink)",
              borderColor: "var(--color-ink)",
            }}
          >
            {t.name}
          </button>
        ))}
      </form>
    </div>
  );
}
