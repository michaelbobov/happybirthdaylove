"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { Lock, Clock, Zap } from "lucide-react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { EnvelopeSVG } from "@/components/envelope/EnvelopeSVG";
import { PhotoEnvelope } from "@/components/envelope/PhotoEnvelope";
import { EnvelopeStampsOverlay } from "@/components/envelope/EnvelopeStampsOverlay";
import { getDesign, getTheme, type ThemeId } from "@/lib/themes";
import type { EnvelopePublic } from "@/lib/types";

type Bundle = {
  id: string;
  token: string;
  title: string;
  coverMessage: string | null;
  themeId: string;
  hasPassphrase: boolean;
  recipientName: string | null;
};

export function BundleHub({
  bundle,
  envelopes,
}: {
  bundle: Bundle;
  envelopes: EnvelopePublic[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [passphrase, setPassphrase] = useState("");
  const [passphraseReady, setPassphraseReady] = useState(!bundle.hasPassphrase);

  useEffect(() => {
    const cards = rootRef.current?.querySelectorAll<HTMLElement>("[data-env]");
    if (!cards?.length) return;
    gsap.fromTo(
      cards,
      { y: 40, opacity: 0, scale: 0.96, rotate: () => (Math.random() - 0.5) * 4 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        rotate: (i: number) => (i % 2 === 0 ? -1.5 : 1.5),
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.08,
      },
    );
  }, []);

  useEffect(() => {
    if (!bundle.hasPassphrase || typeof window === "undefined") return;
    const id = window.setTimeout(() => {
      setPassphraseReady(!!window.sessionStorage.getItem(passphraseStorageKey(bundle.token)));
    }, 0);
    return () => window.clearTimeout(id);
  }, [bundle.hasPassphrase, bundle.token]);

  const submitPassphrase = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passphrase.trim();
    if (!trimmed || typeof window === "undefined") return;
    window.sessionStorage.setItem(passphraseStorageKey(bundle.token), trimmed);
    setPassphraseReady(true);
  };

  return (
    <ThemeProvider themeId={bundle.themeId as ThemeId} as="main" className="app-screen paper grain flex-1 min-h-screen">
      <div className="mx-auto max-w-5xl px-6 pb-16" ref={rootRef}>
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
            A bundle for {bundle.recipientName ?? "you"}
          </div>
          <h1 className="mt-2 font-display text-5xl md:text-6xl" style={{ color: "var(--color-ink)" }}>
            {bundle.title}
          </h1>
          {bundle.coverMessage ? (
            <p className="mt-4 mx-auto max-w-xl font-hand text-xl" style={{ color: "var(--color-muted)" }}>
              {bundle.coverMessage}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href={`/b/${bundle.token}/claim`}
              className="rounded-full px-4 py-2 text-xs border"
              style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
            >
              Save to my account
            </Link>
            {envelopes.some((e) => e.openedAt) && (
              <Link
                href={`/b/${bundle.token}/collection`}
                className="rounded-full px-4 py-2 text-xs"
                style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
              >
                View collection ✦
              </Link>
            )}
          </div>
          <p className="mt-3 text-xs" style={{ color: "var(--color-muted)" }}>
            You can open this link without an account. Save it only if you want to revisit everything later.
          </p>
        </div>

        {bundle.hasPassphrase && !passphraseReady ? (
          <form
            onSubmit={submitPassphrase}
            className="paper mx-auto mt-12 max-w-md rounded-[var(--radius-lg)] p-6 text-center"
            style={{ boxShadow: "0 16px 36px var(--color-shadow)" }}
          >
            <Lock size={20} className="mx-auto mb-2" style={{ color: "var(--color-accent)" }} />
            <div className="font-display text-2xl" style={{ color: "var(--color-ink)" }}>
              A word, first.
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
              The sender protected this bundle with a passphrase. Enter it once and the envelopes will remember it in this browser.
            </p>
            <label className="mt-5 flex flex-col gap-2 text-left text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-muted)" }}>
              Passphrase
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="rounded-[var(--radius-md)] px-4 py-3 normal-case tracking-normal bg-white/70"
                style={{ border: "1px solid var(--color-muted)", color: "var(--color-ink)" }}
                autoComplete="off"
              />
            </label>
            <button
              type="submit"
              disabled={!passphrase.trim()}
              className="mt-4 rounded-full px-5 py-2.5 text-sm"
              style={{
                background: "var(--color-ink)",
                color: "var(--color-bg)",
                opacity: passphrase.trim() ? 1 : 0.45,
              }}
            >
              Show Envelopes
            </button>
          </form>
        ) : (
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {envelopes.map((env, i) => (
              <EnvelopeTile key={env.id} token={bundle.token} bundleThemeId={bundle.themeId} envelope={env} index={i} />
            ))}
          </div>
        )}
      </div>
    </ThemeProvider>
  );
}

const CONTENT_LABEL: Record<string, { icon: string; label: string }> = {
  text:       { icon: "✉", label: "letter" },
  image:      { icon: "📷", label: "photo" },
  gif:        { icon: "✨", label: "gif" },
  giftcard:   { icon: "🎁", label: "gift card" },
  money_note: { icon: "💵", label: "cash" },
  audio:      { icon: "🎵", label: "voice" },
};

function ContentChips({ types }: { types: string[] }) {
  // Deduplicate and count
  const counts: Record<string, number> = {};
  for (const t of types) counts[t] = (counts[t] ?? 0) + 1;
  const entries = Object.entries(counts);
  if (!entries.length) return null;
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
      {entries.map(([type, count]) => {
        const meta = CONTENT_LABEL[type] ?? { icon: "•", label: type };
        return (
          <span
            key={type}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
            style={{ background: "var(--color-surface)", color: "var(--color-muted)", border: "1px solid var(--color-muted)", opacity: 0.85 }}
          >
            {meta.icon} {count > 1 ? `${count} ` : ""}{meta.label}{count > 1 ? "s" : ""}
          </span>
        );
      })}
    </div>
  );
}

function EnvelopeTile({
  token,
  bundleThemeId,
  envelope,
  index,
}: {
  token: string;
  bundleThemeId: string;
  envelope: EnvelopePublic;
  index: number;
}) {
  const themeId = (envelope.themeOverrideId as ThemeId) ?? (bundleThemeId as ThemeId);
  const theme = getTheme(themeId);
  const design = getDesign(envelope.envelopeDesignId);
  const locked = useLockedState(envelope);

  const isOpened = !!envelope.openedAt;

  const body = (
    <div data-env className="group paper rounded-[var(--radius-lg)] p-6 text-center relative"
         style={{ boxShadow: "0 12px 30px var(--color-shadow)" }}>
      <div className="flex justify-center">
        {isOpened ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/images/opened.png"
            alt="Opened envelope"
            width={280}
            height={180}
            draggable={false}
            style={{ objectFit: "contain", opacity: 0.82 }}
          />
        ) : design.imageUrl ? (
          <div style={{ position: "relative" }}>
            <PhotoEnvelope
              design={design}
              width={280}
              height={180}
              state="closed"
              sealColorOverride={envelope.sealColorOverride}
            />
            <EnvelopeStampsOverlay stamps={envelope.stamps} width={280} height={180} />
          </div>
        ) : (
          <EnvelopeSVG design={design} width={280} height={180} monogram="" state="closed" sealColorOverride={envelope.sealColorOverride} stamps={envelope.stamps} />
        )}
      </div>
      <div className="mt-4 font-display text-2xl" style={{ color: "var(--color-ink)" }}>
        {envelope.title}
      </div>
      {envelope.caption ? (
        <div className="mt-1 font-hand text-lg" style={{ color: "var(--color-muted)" }}>
          {envelope.caption}
        </div>
      ) : null}
      <div className="mt-3 text-xs flex items-center gap-1.5 justify-center" style={{ color: "var(--color-muted)" }}>
        {isOpened ? (
          <>
            <span>Opened {new Date(envelope.openedAt!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          </>
        ) : locked.state === "ready" ? (
          <><Zap size={12} /> Tap to open</>
        ) : locked.state === "countdown" ? (
          <><Clock size={12} /> Opens in {locked.label}</>
        ) : (
          <><Lock size={12} /> Waiting on sender</>
        )}
      </div>

      {isOpened ? <ContentChips types={envelope.contentTypes} /> : null}

      {/* Postmark stamp for opened envelopes */}
      {isOpened && (
        <div
          className="absolute top-4 right-4 rounded-full w-14 h-14 flex flex-col items-center justify-center border-2 rotate-12 select-none"
          style={{
            borderColor: theme.tokens.colors.accent,
            color: theme.tokens.colors.accent,
            opacity: 0.7,
            fontSize: 9,
            lineHeight: 1.2,
            fontFamily: "var(--font-mono, monospace)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700 }}>READ</span>
          <span>{new Date(envelope.openedAt!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        </div>
      )}
    </div>
  );

  if (locked.state !== "ready") {
    return <div key={envelope.id + index} className="pointer-events-none opacity-95">{body}</div>;
  }
  return <Link href={`/b/${token}/e/${envelope.id}`}>{body}</Link>;
}

function passphraseStorageKey(token: string) {
  return `enveloped:bundle-passphrase:${token}`;
}

function useLockedState(env: EnvelopePublic): { state: "ready" | "countdown" | "manual"; label: string } {
  // Start in a neutral "pre-hydration" state; actual time reads happen in effects so
  // render stays pure (React 19 hooks purity rule).
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Post-hydration clock. `now` is deliberately null on first render to avoid
    // SSR/client mismatch; this effect syncs it to the wall clock and keeps it
    // ticking for countdowns.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    if (env.unlockType !== "date" || !env.unlockAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [env]);

  if (env.unlockType === "manual") return { state: "manual", label: "" };
  if (env.unlockType === "immediate" || env.unlockType === "passphrase") return { state: "ready", label: "" };
  if (env.unlockType === "date" && env.unlockAt) {
    if (now === null) return { state: "countdown", label: "…" };
    const t = new Date(env.unlockAt).getTime();
    if (t <= now) return { state: "ready", label: "" };
    return { state: "countdown", label: relLabel(env.unlockAt, now) };
  }
  return { state: "ready", label: "" };
}

function relLabel(unlockAt: string, now: number): string {
  const diff = new Date(unlockAt).getTime() - now;
  if (diff <= 0) return "now";
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
