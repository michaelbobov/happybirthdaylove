import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTheme } from "@/lib/themes";
import { formatDistanceToNow } from "date-fns";
import { Plus } from "lucide-react";

export const metadata = { title: "Your bundles — Enveloped" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = "", status = "all" } = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: bundles } = await supabase
    .from("bundles")
    .select("id, title, theme_id, created_at, sent_at, recipient_name, access_token")
    .eq("sender_id", user.id)
    .order("created_at", { ascending: false });

  const normalizedQuery = q.trim().toLowerCase();
  const filteredBundles = (bundles ?? []).filter((bundle) => {
    const matchesQuery = !normalizedQuery ||
      bundle.title.toLowerCase().includes(normalizedQuery) ||
      (bundle.recipient_name ?? "").toLowerCase().includes(normalizedQuery);
    const matchesStatus =
      status === "all" ||
      (status === "sent" && bundle.sent_at) ||
      (status === "draft" && !bundle.sent_at);
    return matchesQuery && matchesStatus;
  });

  const statusHref = (nextStatus: string) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (nextStatus !== "all") params.set("status", nextStatus);
    const qs = params.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  };

  return (
    <main className="app-screen flex-1 mx-auto max-w-5xl w-full px-6 pb-12">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-display text-4xl" style={{ color: "var(--color-ink)" }}>
          Your bundles
        </h1>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm"
          style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
        >
          <Plus size={16} /> New bundle
        </Link>
      </div>

      <div className="paper mt-6 rounded-[var(--radius-lg)] p-4" style={{ boxShadow: "0 8px 22px var(--color-shadow)" }}>
        <form className="flex flex-col gap-3 sm:flex-row" action="/dashboard">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by title or recipient…"
            className="min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm bg-white/70"
            style={{ border: "1px solid var(--color-muted)", color: "var(--color-ink)" }}
          />
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <button
            type="submit"
            className="rounded-full px-5 py-2.5 text-sm"
            style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
          >
            Search
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["all", "All"],
            ["draft", "Drafts"],
            ["sent", "Sent"],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={statusHref(value)}
              className="rounded-full px-3 py-1.5 text-xs border"
              style={{
                background: status === value ? "var(--color-ink)" : "transparent",
                color: status === value ? "var(--color-bg)" : "var(--color-ink)",
                borderColor: "var(--color-ink)",
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBundles.map((b) => {
          const theme = getTheme(b.theme_id);
          return (
            <Link
              key={b.id}
              href={`/bundle/${b.id}/edit`}
              className="group paper rounded-[var(--radius-lg)] p-5 block transition-transform hover:-translate-y-1"
              style={{ boxShadow: "0 10px 26px var(--color-shadow)" }}
            >
              <div className="text-[11px] uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
                {theme.name}
              </div>
              <div className="mt-1 font-display text-2xl" style={{ color: "var(--color-ink)" }}>
                {b.title}
              </div>
              <div className="mt-2 text-sm" style={{ color: "var(--color-muted)" }}>
                {b.recipient_name ? `For ${b.recipient_name} · ` : ""}
                {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
              </div>
              <div className="mt-4 text-xs" style={{ color: b.sent_at ? "var(--color-accent)" : "var(--color-muted)" }}>
                {b.sent_at ? "Sent" : "Draft"}
              </div>
            </Link>
          );
        })}
        {(!bundles || bundles.length === 0) && (
          <div className="col-span-full paper rounded-[var(--radius-lg)] p-10 text-center" style={{ color: "var(--color-muted)" }}>
            You haven&rsquo;t made a bundle yet. Your first one is waiting.
          </div>
        )}
        {(bundles?.length ?? 0) > 0 && filteredBundles.length === 0 && (
          <div className="col-span-full paper rounded-[var(--radius-lg)] p-10 text-center" style={{ color: "var(--color-muted)" }}>
            No bundles match that search.
          </div>
        )}
      </div>
    </main>
  );
}
