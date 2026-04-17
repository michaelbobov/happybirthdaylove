"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { Lock, Clock, Zap } from "lucide-react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { EnvelopeSVG } from "@/components/envelope/EnvelopeSVG";
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

  return (
    <ThemeProvider themeId={bundle.themeId as ThemeId} as="main" className="paper grain flex-1 min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-16" ref={rootRef}>
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
          <div className="mt-6 flex justify-center gap-2">
            <Link
              href={`/b/${bundle.token}/claim`}
              className="rounded-full px-4 py-2 text-xs border"
              style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
            >
              Save to my account
            </Link>
          </div>
        </div>

        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {envelopes.map((env, i) => (
            <EnvelopeTile key={env.id} token={bundle.token} bundleThemeId={bundle.themeId} envelope={env} index={i} />
          ))}
        </div>
      </div>
    </ThemeProvider>
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

  const body = (
    <div data-env className="group paper rounded-[var(--radius-lg)] p-6 text-center relative"
         style={{ boxShadow: "0 12px 30px var(--color-shadow)" }}>
      <div className="flex justify-center">
        <EnvelopeSVG design={design} width={280} height={180} monogram="" />
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
        {locked.state === "ready" && (
          <>
            <Zap size={12} /> Tap to open
          </>
        )}
        {locked.state === "countdown" && (
          <>
            <Clock size={12} /> Opens in {locked.label}
          </>
        )}
        {locked.state === "manual" && (
          <>
            <Lock size={12} /> Waiting on sender
          </>
        )}
      </div>
      {envelope.openedAt ? (
        <div
          className="absolute top-3 right-3 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: theme.tokens.colors.accent, color: theme.tokens.colors.background }}
        >
          opened
        </div>
      ) : null}
    </div>
  );

  if (locked.state !== "ready") {
    return <div key={envelope.id + index} className="pointer-events-none opacity-95">{body}</div>;
  }
  return <Link href={`/b/${token}/e/${envelope.id}`}>{body}</Link>;
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
