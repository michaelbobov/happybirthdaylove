"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ClaimClient({
  token,
  initiallySignedIn,
}: {
  token: string;
  initiallySignedIn: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "claiming" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const claim = async () => {
    setStatus("claiming");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("claim_bundle", { p_token: token });
    if (error) {
      setStatus("error");
      setError(error.message);
    } else {
      setStatus("done");
      router.push("/inbox");
    }
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      `/b/${token}/claim`,
    )}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
    } else setStatus("sent");
  };

  return (
    <main className="flex-1 mx-auto max-w-lg w-full px-6 py-16 text-center">
      <h1 className="font-display text-4xl" style={{ color: "var(--color-ink)" }}>
        Keep this forever.
      </h1>
      <p className="mt-2 font-hand text-lg" style={{ color: "var(--color-muted)" }}>
        Save this bundle to an account and you can come back to these envelopes any time.
      </p>

      {initiallySignedIn ? (
        <button
          onClick={claim}
          disabled={status === "claiming"}
          className="mt-8 rounded-full px-6 py-3 text-sm"
          style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
        >
          {status === "claiming" ? "Saving…" : "Save to my account"}
        </button>
      ) : (
        <form onSubmit={signIn} className="mt-8 flex flex-col gap-3">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-[var(--radius-md)] px-4 py-3 bg-white/70"
            style={{ border: "1px solid var(--color-muted)", color: "var(--color-ink)" }}
          />
          <button
            type="submit"
            className="rounded-full px-6 py-3 text-sm"
            style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
          >
            Send magic link
          </button>
          {status === "sent" ? (
            <p className="text-xs" style={{ color: "var(--color-muted)" }}>
              Check your inbox. When you click the link, we&rsquo;ll save this bundle to your account.
            </p>
          ) : null}
        </form>
      )}
      {error ? <p className="mt-3 text-xs" style={{ color: "var(--color-seal)" }}>{error}</p> : null}
    </main>
  );
}
