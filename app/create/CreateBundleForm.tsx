"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { themeList } from "@/lib/themes";
import { createBundle } from "@/app/actions/bundles";

export function CreateBundleForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [themeId, setThemeId] = useState<"warm-handmade" | "modern-playful" | "cinematic-gold" | "minimalist-ink">(
    "warm-handmade",
  );

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await createBundle({
      title: String(form.get("title") ?? ""),
      coverMessage: String(form.get("coverMessage") ?? ""),
      recipientName: String(form.get("recipientName") ?? ""),
      recipientEmail: String(form.get("recipientEmail") ?? ""),
      passphrase: String(form.get("passphrase") ?? ""),
      themeId,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(`/bundle/${res.data.id}/edit`);
  };

  return (
    <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
      <Field label="Bundle title" name="title" placeholder="For when you need me" required />
      <Field label="Recipient's name" name="recipientName" placeholder="Their first name" />
      <Field label="Recipient's email (optional)" name="recipientEmail" type="email" />
      <Textarea label="Cover message" name="coverMessage" placeholder="A note they'll see first, before any envelope." />
      <Field
        label="Passphrase (optional)"
        name="passphrase"
        placeholder="A word only the two of you share"
        helper="Adds a second lock in front of every envelope."
      />

      <div>
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--color-muted)" }}>
          Theme
        </div>
        <div className="flex flex-wrap gap-2">
          {themeList.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setThemeId(t.id)}
              className="rounded-full px-3 py-1.5 text-xs border"
              style={{
                background: t.id === themeId ? "var(--color-ink)" : "transparent",
                color: t.id === themeId ? "var(--color-bg)" : "var(--color-ink)",
                borderColor: "var(--color-ink)",
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {error ? <p style={{ color: "var(--color-seal)" }}>{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="self-start rounded-full px-6 py-3 text-sm"
        style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
      >
        {loading ? "Creating…" : "Create bundle"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  helper,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  helper?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
        {label}
      </span>
      <input
        required={required}
        type={type}
        name={name}
        placeholder={placeholder}
        className="rounded-[var(--radius-md)] bg-white/60 px-4 py-3 outline-none"
        style={{ border: "1px solid var(--color-muted)", color: "var(--color-ink)" }}
      />
      {helper ? (
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          {helper}
        </span>
      ) : null}
    </label>
  );
}

function Textarea({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
        {label}
      </span>
      <textarea
        name={name}
        placeholder={placeholder}
        rows={3}
        className="rounded-[var(--radius-md)] bg-white/60 px-4 py-3 outline-none font-hand text-lg"
        style={{ border: "1px solid var(--color-muted)", color: "var(--color-ink)" }}
      />
    </label>
  );
}
