"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setErr(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      new URLSearchParams(window.location.search).get("next") ?? "/dashboard",
    )}`;
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

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
      <label className="text-xs uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
        Email
      </label>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-[var(--radius-md)] bg-white/60 px-4 py-3 outline-none"
        style={{
          border: "1px solid var(--color-muted)",
          color: "var(--color-ink)",
        }}
        placeholder="you@example.com"
      />
      <button
        type="submit"
        disabled={status === "sent"}
        className="mt-2 rounded-full px-5 py-3 text-sm font-medium"
        style={{
          background: "var(--color-ink)",
          color: "var(--color-bg)",
        }}
      >
        {status === "sent" ? "Check your inbox" : "Send magic link"}
      </button>
      {err ? (
        <p className="text-xs" style={{ color: "var(--color-seal)" }}>
          {err}
        </p>
      ) : null}
    </form>
  );
}
