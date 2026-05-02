"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Clock, Lock, Zap } from "lucide-react";
import { designsFor, themeList, type ThemeId } from "@/lib/themes";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { PhotoEnvelope } from "@/components/envelope/PhotoEnvelope";
import { EnvelopeSVG } from "@/components/envelope/EnvelopeSVG";
import { upsertEnvelope, deleteEnvelope } from "@/app/actions/bundles";
import type { EnvelopeStamp } from "@/lib/stamps";
import { EnvelopeWorkspace } from "./EnvelopeWorkspace";
import { BundleSettings } from "./BundleSettings";
import type { ItemRow } from "./ItemsEditor";

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

export function BundleBuilder({
  bundle,
  envelopes: initial,
  items,
}: {
  bundle: {
    id: string;
    themeId: string;
    coverMessage: string;
    recipientName: string;
    recipientEmail: string;
    hasPassphrase: boolean;
  };
  envelopes: Envelope[];
  items: ItemRow[];
}) {
  const [envelopes, setEnvelopes] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(initial[0]?.id ?? null);
  const [bundleTheme, setBundleTheme] = useState(bundle.themeId);
  // Items state is lifted here so switching envelopes doesn't lose in-session adds
  const [allItems, setAllItems] = useState<ItemRow[]>(items);

  const itemsByEnvelope = useMemo(() => {
    const map: Record<string, ItemRow[]> = {};
    for (const it of allItems) (map[it.envelopeId] ??= []).push(it);
    return map;
  }, [allItems]);

  const onItemsChange = (envelopeId: string, next: ItemRow[]) =>
    setAllItems((all) => [...all.filter((i) => i.envelopeId !== envelopeId), ...next]);

  const addEnvelope = async () => {
    const idx = envelopes.length;
    const designs = designsFor(bundleTheme as ThemeId);
    const res = await upsertEnvelope({
      bundleId: bundle.id,
      title: `Envelope ${idx + 1}`,
      caption: "",
      orderIndex: idx,
      unlockType: "immediate",
      unlockAt: null,
      envelopeDesignId: designs[0].id,
      themeOverrideId: null,
      sealColorOverride: null,
      stamps: [],
    });
    if (res.ok) {
      const next: Envelope = {
        id: res.data.id,
        title: `Envelope ${idx + 1}`,
        caption: "",
        orderIndex: idx,
        unlockType: "immediate",
        unlockAt: null,
        envelopeDesignId: designs[0].id,
        themeOverrideId: null,
        sealColorOverride: null,
        stamps: [],
      };
      setEnvelopes((es) => [...es, next]);
      setActiveId(res.data.id);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this envelope and everything inside?")) return;
    const res = await deleteEnvelope(id, bundle.id);
    if (res.ok) {
      setEnvelopes((es) => es.filter((e) => e.id !== id));
      if (activeId === id) setActiveId(envelopes.find((e) => e.id !== id)?.id ?? null);
    }
  };

  const onUpdated = (next: Envelope) =>
    setEnvelopes((es) => es.map((e) => (e.id === next.id ? next : e)));

  const activeEnvelope = envelopes.find((e) => e.id === activeId) ?? null;

  const changeTheme = async (newThemeId: string) => {
    setBundleTheme(newThemeId);
    await fetch(`/api/bundles/${bundle.id}/theme`, {
      method: "POST",
      body: JSON.stringify({ themeId: newThemeId }),
      headers: { "content-type": "application/json" },
    });
  };

  return (
    <ThemeProvider themeId={bundleTheme as ThemeId} as="section" className="mt-8">
      <div className="bundle-builder-shell" style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

        {/* ── Left sidebar ─────────────────────────────────────────────── */}
        <div className="bundle-builder-sidebar" style={{
          width: 200, flexShrink: 0,
          display: "flex", flexDirection: "column", gap: 8,
          position: "sticky", top: 24,
        }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em",
            color: "var(--color-muted)", marginBottom: 2 }}>
            Envelopes
          </div>

          {envelopes.map((env) => {
            const themeId = (env.themeOverrideId as ThemeId) ?? (bundleTheme as ThemeId);
            const designs = designsFor(themeId);
            const design = designs.find((d) => d.id === env.envelopeDesignId) ?? designs[0];
            const isActive = env.id === activeId;
            const count = itemsByEnvelope[env.id]?.length ?? 0;

            return (
              <div
                role="button"
                tabIndex={0}
                key={env.id}
                className="bundle-envelope-tab"
                style={{
                  position: "relative", borderRadius: 12, padding: "10px 10px 8px",
                  cursor: "pointer",
                  background: isActive ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.35)",
                  border: `2px solid ${isActive ? "var(--color-ink)" : "transparent"}`,
                  boxShadow: isActive ? "0 4px 16px var(--color-shadow)" : "none",
                  transition: "background 0.18s, border-color 0.18s, box-shadow 0.18s",
                }}
                onClick={() => setActiveId(env.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveId(env.id);
                  }
                }}
              >
                {/* Envelope thumbnail */}
                <div style={{ display: "flex", justifyContent: "center", pointerEvents: "none" }}>
                  {design.imageUrl ? (
                    <PhotoEnvelope
                      design={design}
                      width={164}
                      height={106}
                      state="closed"
                      sealColorOverride={env.sealColorOverride}
                    />
                  ) : (
                    <EnvelopeSVG design={design} width={164} height={106} stamps={env.stamps} sealColorOverride={env.sealColorOverride} />
                  )}
                </div>

                {/* Title */}
                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, color: "var(--color-ink)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {env.title}
                </div>

                {/* Lock + item count */}
                <div style={{ marginTop: 2, fontSize: 10, color: "var(--color-muted)",
                  display: "flex", alignItems: "center", gap: 4 }}>
                  {env.unlockType === "date" ? <Clock size={9} /> : env.unlockType === "manual" ? <Lock size={9} /> : <Zap size={9} />}
                  {env.unlockType === "date" ? "Date-locked" : env.unlockType === "manual" ? "Manual" : env.unlockType === "passphrase" ? "Passphrase" : "Immediate"}
                  {count > 0 && <span style={{ marginLeft: 4 }}>· {count} item{count !== 1 ? "s" : ""}</span>}
                </div>

                {/* Delete button (hover) */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(env.id); }}
                  aria-label="Delete envelope"
                  style={{
                    position: "absolute", top: 6, right: 6,
                    background: "rgba(0,0,0,0.07)", border: "none", borderRadius: "50%",
                    width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "var(--color-muted)", opacity: isActive ? 1 : 0,
                    transition: "opacity 0.15s",
                  }}
                  className="envelope-delete-btn"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            );
          })}

          {/* Add envelope */}
          <button
            type="button"
            onClick={addEnvelope}
            style={{
              borderRadius: 12, border: "2px dashed var(--color-muted)",
              padding: "14px 10px", display: "flex", flexDirection: "column",
              alignItems: "center", gap: 4, cursor: "pointer",
              background: "transparent", color: "var(--color-muted)",
            }}
          >
            <Plus size={18} />
            <span style={{ fontSize: 11 }}>Add envelope</span>
          </button>

          {/* Bundle settings */}
          <BundleSettings
            bundleId={bundle.id}
            initial={{
              coverMessage: bundle.coverMessage,
              recipientName: bundle.recipientName,
              recipientEmail: bundle.recipientEmail,
              hasPassphrase: bundle.hasPassphrase,
            }}
          />

          {/* Theme picker */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em",
              color: "var(--color-muted)", marginBottom: 6 }}>
              Bundle theme
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {themeList.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => changeTheme(t.id)}
                  style={{
                    borderRadius: 8, padding: "6px 10px", fontSize: 11, cursor: "pointer",
                    textAlign: "left",
                    background: t.id === bundleTheme ? "var(--color-ink)" : "transparent",
                    color: t.id === bundleTheme ? "var(--color-bg)" : "var(--color-ink)",
                    border: `1px solid ${t.id === bundleTheme ? "var(--color-ink)" : "var(--color-muted)"}`,
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right workspace ───────────────────────────────────────────── */}
        <div className="bundle-builder-workspace" style={{ flex: 1, minWidth: 0 }}>
          {activeEnvelope ? (
            <EnvelopeWorkspace
              key={activeEnvelope.id}
              bundleId={bundle.id}
              bundleThemeId={bundleTheme}
              envelope={activeEnvelope}
              items={itemsByEnvelope[activeEnvelope.id] ?? []}
              onUpdated={onUpdated}
              onItemsChange={onItemsChange}
            />
          ) : (
            <div
              onClick={addEnvelope}
              style={{
                borderRadius: 20, border: "2px dashed var(--color-muted)",
                minHeight: 400, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 12,
                cursor: "pointer", color: "var(--color-muted)",
              }}
            >
              <Plus size={40} strokeWidth={1.5} />
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22 }}>Add your first envelope</div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>Each envelope is a moment, sealed until it&rsquo;s ready.</div>
            </div>
          )}
        </div>
      </div>

      {/* Show delete button on sidebar hover */}
      <style>{`
        .bundle-envelope-tab {
          width: 100%;
          text-align: left;
          font: inherit;
        }

        .envelope-delete-btn { opacity: 0 !important; }
        .bundle-envelope-tab:hover > .envelope-delete-btn,
        .bundle-envelope-tab:focus-visible > .envelope-delete-btn {
          opacity: 1 !important;
        }

        @media (max-width: 860px) {
          .bundle-builder-shell {
            flex-direction: column;
            gap: 18px !important;
          }

          .bundle-builder-sidebar {
            position: relative !important;
            top: auto !important;
            width: 100% !important;
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(156px, 1fr));
            align-items: stretch;
          }

          .bundle-builder-sidebar > div:first-child,
          .bundle-builder-sidebar > div:nth-last-child(-n + 2) {
            grid-column: 1 / -1;
          }

          .bundle-builder-workspace {
            width: 100%;
          }
        }

        @media (max-width: 560px) {
          .bundle-builder-sidebar {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </ThemeProvider>
  );
}
