"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { themeList } from "@/lib/themes";
import { createBundle } from "@/app/actions/bundles";
import type { ThemeId } from "@/lib/themes";

export function CreateBundleForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [themeId, setThemeId] = useState<ThemeId>("warm-handmade");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    const res = await createBundle({
      title: name.trim(),
      coverMessage: "",
      recipientName: "",
      recipientEmail: "",
      passphrase: "",
      themeId,
    });
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    router.push(`/bundle/${res.data.id}/edit`);
  };

  return (
    <form onSubmit={submit} className="mt-10 flex flex-col gap-8">
      {/* Name field — big, single focus */}
      <label className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-muted)" }}>
          Who is this for?
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. For when you miss me"
          className="font-display text-3xl bg-transparent border-b-2 outline-none pb-2"
          style={{ borderColor: "var(--color-muted)", color: "var(--color-ink)" }}
          required
        />
      </label>

      {/* Theme — visual cards */}
      <div>
        <div className="text-xs uppercase tracking-[0.18em] mb-4" style={{ color: "var(--color-muted)" }}>
          Pick a feel
        </div>
        <div className="grid grid-cols-2 gap-3">
          {themeList.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setThemeId(t.id)}
              className="rounded-[var(--radius-lg)] p-4 text-left transition-all"
              style={{
                background: t.id === themeId ? "var(--color-ink)" : "rgba(255,255,255,0.5)",
                color: t.id === themeId ? "var(--color-bg)" : "var(--color-ink)",
                border: `2px solid ${t.id === themeId ? "var(--color-ink)" : "transparent"}`,
                boxShadow: t.id === themeId ? "0 6px 20px var(--color-shadow)" : "none",
              }}
            >
              <div className="font-display text-lg">{t.name}</div>
              <div className="mt-1 text-xs opacity-70">{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm" style={{ color: "var(--color-seal)" }}>{error}</p>}

      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="self-start rounded-full px-8 py-3.5 text-sm font-medium"
        style={{ background: "var(--color-ink)", color: "var(--color-bg)", opacity: name.trim() ? 1 : 0.45 }}
      >
        {loading ? "Creating…" : "Start building →"}
      </button>
    </form>
  );
}
