"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { EnvelopeOpener } from "@/components/envelope/EnvelopeOpener";
import { EnvelopeSpread } from "@/components/envelope/EnvelopeSpread";
import { ItemViewer } from "@/components/items/ItemViewer";
import { getDesign, type ThemeId } from "@/lib/themes";
import { getEnvelopeFrontText } from "@/lib/stamps";
import type { RevealedItem } from "@/lib/types";
import type { EnvelopeStamp } from "@/lib/stamps";

type Envelope = {
  id: string;
  title: string;
  caption: string | null;
  envelopeDesignId: string;
  themeOverrideId: string | null;
  sealColorOverride: string | null;
  stamps: EnvelopeStamp[];
  unlockType: "immediate" | "date" | "passphrase" | "manual";
  unlockAt: string | null;
  openedAt: string | null;
};

export function EnvelopeOpenClient({
  token,
  hasPassphrase,
  bundleThemeId,
  envelope,
}: {
  token: string;
  hasPassphrase: boolean;
  bundleThemeId: string;
  envelope: Envelope;
}) {
  const themeId = (envelope.themeOverrideId as ThemeId) ?? (bundleThemeId as ThemeId);
  const design = getDesign(envelope.envelopeDesignId);
  const frontText = getEnvelopeFrontText(envelope.title, envelope.caption);

  const [passphrase, setPassphrase] = useState("");
  const [status, setStatus] = useState<"idle" | "locked" | "need_pass" | "ok" | "viewing" | "spread" | "done" | "err">(
    hasPassphrase ? "need_pass" : "idle",
  );
  const [items, setItems] = useState<RevealedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [unlockAt, setUnlockAt] = useState<string | null>(envelope.unlockAt);
  const [openedAt] = useState<string>(() => envelope.openedAt ?? new Date().toISOString());

  const tryReveal = useCallback(async (pass?: string, onSuccessStatus?: "ok" | "spread") => {
    setError(null);
    const res = await fetch(`/api/reveal/${envelope.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, passphrase: pass }),
    });
    const json = await res.json();
    if (res.ok) {
      if (pass && typeof window !== "undefined") {
        window.sessionStorage.setItem(passphraseStorageKey(token), pass);
      }
      setItems(json.items as RevealedItem[]);
      setStatus(onSuccessStatus ?? "ok");
      return;
    }
    if (json.error === "locked_until") {
      setUnlockAt(json.unlockAt ?? envelope.unlockAt);
      setStatus("locked");
    } else if (json.error === "bad_passphrase") {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(passphraseStorageKey(token));
      }
      setStatus("need_pass");
      setError(pass ? "That wasn't it." : null);
    } else if (json.error === "manual_locked") {
      setStatus("locked");
    } else {
      setStatus("err");
      setError(json.error ?? "Something went wrong");
    }
  }, [envelope.id, envelope.unlockAt, token]);

  useEffect(() => {
    // If already opened on a prior visit, fetch items and jump straight to spread view.
    // Otherwise do the normal reveal (which triggers the animation path).
    if (hasPassphrase && typeof window !== "undefined") {
      const storedPassphrase = window.sessionStorage.getItem(passphraseStorageKey(token));
      if (storedPassphrase) {
        const id = window.setTimeout(() => {
          tryReveal(storedPassphrase, envelope.openedAt ? "spread" : undefined);
        }, 0);
        return () => window.clearTimeout(id);
      }
      return;
    }
    if (!hasPassphrase) {
      const id = window.setTimeout(() => {
        tryReveal(undefined, envelope.openedAt ? "spread" : undefined);
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [hasPassphrase, token, envelope.openedAt, tryReveal]);

  // Re-fetch signed URLs when the user returns to an already-opened envelope,
  // so media never shows placeholders due to expired URLs.
  useEffect(() => {
    if (!envelope.openedAt) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const pass = hasPassphrase ? window.sessionStorage.getItem(passphraseStorageKey(token)) ?? undefined : undefined;
      tryReveal(pass, "spread");
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [envelope.openedAt, hasPassphrase, token, tryReveal]);

  return (
    <ThemeProvider themeId={themeId} as="main" className="app-screen paper grain flex-1 min-h-screen">
      <div className="mx-auto max-w-5xl px-6 pb-10">
        <Link
          href={`/b/${token}`}
          className="inline-flex items-center gap-2 text-sm"
          style={{ color: "var(--color-muted)" }}
        >
          <ArrowLeft size={14} /> Back to bundle
        </Link>

        <div className="mt-4 text-center">
          <div className="text-xs uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
            {envelope.unlockType === "date" ? "Sealed until now" : ""}
          </div>
          <h1 className="font-display text-4xl md:text-5xl mt-1" style={{ color: "var(--color-ink)" }}>
            {envelope.title}
          </h1>
          {envelope.caption ? (
            <p className="mt-1 font-hand text-lg" style={{ color: "var(--color-muted)" }}>
              {envelope.caption}
            </p>
          ) : null}
        </div>

        {status === "need_pass" && (
          <div
            className="mt-10 mx-auto max-w-md paper rounded-[var(--radius-lg)] p-6 text-center"
            style={{ boxShadow: "0 20px 40px var(--color-shadow)" }}
          >
            <Lock size={20} className="mx-auto mb-2" style={{ color: "var(--color-accent)" }} />
            <div className="font-display text-xl" style={{ color: "var(--color-ink)" }}>
              A word, first.
            </div>
            <div className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
              The sender set a passphrase for this bundle.
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                tryReveal(passphrase);
              }}
              className="mt-4 flex flex-col gap-3"
            >
              <input
                autoFocus
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="rounded-[var(--radius-md)] px-4 py-3 bg-white/70"
                style={{ border: "1px solid var(--color-muted)", color: "var(--color-ink)" }}
                placeholder="Passphrase"
                autoComplete="off"
              />
              <button
                type="submit"
                className="rounded-full px-5 py-3 text-sm"
                style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
              >
                Unlock
              </button>
              {error ? (
                <div className="text-xs" style={{ color: "var(--color-seal)" }}>
                  {error}
                </div>
              ) : null}
            </form>
          </div>
        )}

        {status === "locked" && (
          <div
            className="mt-10 mx-auto max-w-md paper rounded-[var(--radius-lg)] p-8 text-center"
            style={{ boxShadow: "0 20px 40px var(--color-shadow)" }}
          >
            <Lock size={22} className="mx-auto" style={{ color: "var(--color-accent)" }} />
            <div className="font-display text-2xl mt-2" style={{ color: "var(--color-ink)" }}>
              Not yet.
            </div>
            <div className="mt-2 font-hand text-lg" style={{ color: "var(--color-muted)" }}>
              {unlockAt
                ? `This one opens on ${new Date(unlockAt).toLocaleString()}.`
                : "The sender will unlock this one for you."}
            </div>
          </div>
        )}

        {status === "err" && (
          <div className="mt-10 text-center" style={{ color: "var(--color-seal)" }}>
            {error ?? "We couldn't open that envelope."}
          </div>
        )}

        {status === "ok" && (
          <div className="mt-6">
            <EnvelopeOpener
              design={design}
              sealColorOverride={envelope.sealColorOverride}
              stamps={envelope.stamps}
              frontText={frontText}
              autoOpen
              onOpened={() => setStatus("viewing")}
            >
              {/* Empty slot — items reveal after animation completes */}
              <div />
            </EnvelopeOpener>
          </div>
        )}

        {status === "spread" && items.length > 0 && (
          <div className="mt-10">
            <EnvelopeSpread items={items} openedAt={openedAt} />
          </div>
        )}

        {(status === "viewing" || status === "done") && (
          <div className="mt-10">
            <ItemViewer
              items={items}
              onDone={() => setStatus("spread")}
            />
            {status === "done" && (
              <div className="mt-10 text-center">
                <div
                  className="font-hand text-2xl"
                  style={{ color: "var(--color-accent)" }}
                >
                  With love ♥
                </div>
                <Link
                  href={`/b/${token}`}
                  className="mt-4 inline-block text-sm"
                  style={{ color: "var(--color-muted)" }}
                >
                  ← Back to all envelopes
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

function passphraseStorageKey(token: string) {
  return `enveloped:bundle-passphrase:${token}`;
}
