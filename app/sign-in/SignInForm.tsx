"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GoogleButton } from "./GoogleButton";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [focused, setFocused] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [err, setErr] = useState<string | null>(null);

  const next =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("next") ?? "/dashboard"
      : "/dashboard";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setErr(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setErr(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  };

  const sending = status === "sending";
  const sent = status === "sent";

  return (
    <div className="mt-7 flex flex-col gap-4">
      <GoogleButton next={next} />

      {/* OR divider with a tiny wax-seal dot */}
      <div
        className="flex items-center gap-3 my-2"
        aria-hidden="true"
      >
        <div
          className="flex-1 h-px"
          style={{ background: "var(--color-muted)", opacity: 0.3 }}
        />
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 22,
            height: 22,
            background: "var(--color-seal)",
            color: "var(--color-bg)",
            boxShadow: "0 2px 4px var(--color-shadow)",
            fontSize: 9,
            letterSpacing: "0.12em",
            fontFamily: "var(--font-display-warm)",
          }}
        >
          or
        </div>
        <div
          className="flex-1 h-px"
          style={{ background: "var(--color-muted)", opacity: 0.3 }}
        />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label
          htmlFor="sign-in-email"
          className="text-[10px] uppercase tracking-[0.25em]"
          style={{ color: "var(--color-muted)" }}
        >
          Your email address
        </label>
        <div
          className="relative rounded-[var(--radius-md)] transition-all"
          style={{
            background: "rgba(255,255,255,0.55)",
            border: `1px solid ${focused ? "var(--color-accent)" : "var(--color-muted)"}`,
            boxShadow: focused
              ? "0 0 0 4px rgba(192,106,74,0.12), 0 1px 0 rgba(255,255,255,0.5) inset"
              : "0 1px 0 rgba(255,255,255,0.5) inset",
          }}
        >
          <input
            id="sign-in-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full bg-transparent px-4 py-3 outline-none"
            style={{ color: "var(--color-ink)" }}
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={sending || sent}
          className="group relative mt-3 rounded-full px-5 py-3.5 text-sm font-medium transition-transform active:translate-y-[1px]"
          style={{
            background: "var(--color-ink)",
            color: "var(--color-bg)",
            boxShadow:
              "0 2px 0 rgba(0,0,0,0.15), 0 10px 22px var(--color-shadow)",
            opacity: sent ? 0.8 : 1,
            cursor: sending || sent ? "default" : "pointer",
          }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            {sent ? (
              <>
                <CheckGlyph />
                Check your inbox
              </>
            ) : sending ? (
              <>
                <Spinner />
                Sending…
              </>
            ) : (
              <>
                Send magic link
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </>
            )}
          </span>
        </button>

        {err ? (
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-seal)" }}
          >
            {err}
          </p>
        ) : null}

        {sent ? (
          <p
            className="text-xs font-hand mt-1"
            style={{ color: "var(--color-muted)" }}
          >
            Open it in this browser — magic links are picky that way.
          </p>
        ) : null}
      </form>
    </div>
  );
}

function CheckGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 12.5l5 5L20 6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ animation: "spin 0.9s linear infinite" }}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="14 42"
        opacity="0.9"
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
