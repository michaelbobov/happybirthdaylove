"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { EnvelopeOpener } from "@/components/envelope/EnvelopeOpener";
import { ItemRenderer } from "@/components/items/ItemRenderer";
import { getDesign, type ThemeId } from "@/lib/themes";
import type { RevealedItem } from "@/lib/types";

type Envelope = {
  id: string;
  title: string;
  caption: string | null;
  envelopeDesignId: string;
  themeOverrideId: string | null;
  unlockType: "immediate" | "date" | "passphrase" | "manual";
  unlockAt: string | null;
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

  const [passphrase, setPassphrase] = useState("");
  const [status, setStatus] = useState<"idle" | "locked" | "need_pass" | "ok" | "err">(
    hasPassphrase ? "need_pass" : "idle",
  );
  const [items, setItems] = useState<RevealedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [unlockAt, setUnlockAt] = useState<string | null>(envelope.unlockAt);

  const tryReveal = async (pass?: string) => {
    setError(null);
    const res = await fetch(`/api/reveal/${envelope.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, passphrase: pass }),
    });
    const json = await res.json();
    if (res.ok) {
      setItems(json.items as RevealedItem[]);
      setStatus("ok");
      return;
    }
    if (json.error === "locked_until") {
      setUnlockAt(json.unlockAt ?? envelope.unlockAt);
      setStatus("locked");
    } else if (json.error === "bad_passphrase") {
      setStatus("need_pass");
      setError(pass ? "That wasn't it." : null);
    } else if (json.error === "manual_locked") {
      setStatus("locked");
    } else {
      setStatus("err");
      setError(json.error ?? "Something went wrong");
    }
  };

  useEffect(() => {
    // Mount-time fetch: hit the reveal endpoint and let tryReveal synchronize
    // state from the server response. This is a boundary sync, not a derived-
    // state update.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!hasPassphrase) tryReveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemeProvider themeId={themeId} as="main" className="paper grain flex-1 min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-10">
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
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="rounded-[var(--radius-md)] px-4 py-3 bg-white/70"
                style={{ border: "1px solid var(--color-muted)", color: "var(--color-ink)" }}
                placeholder="Passphrase"
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
            <EnvelopeOpener design={design} autoOpen>
              <div className="flex flex-col gap-10 items-center py-10">
                {items.map((item) => (
                  <div key={item.id} className="w-full flex justify-center">
                    <ItemRenderer item={item} />
                  </div>
                ))}
              </div>
            </EnvelopeOpener>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}
