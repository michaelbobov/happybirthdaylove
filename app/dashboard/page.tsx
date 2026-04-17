import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTheme } from "@/lib/themes";
import { formatDistanceToNow } from "date-fns";
import { Plus } from "lucide-react";

export const metadata = { title: "Your bundles — Enveloped" };

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: bundles } = await supabase
    .from("bundles")
    .select("id, title, theme_id, created_at, sent_at, recipient_name, access_token")
    .eq("sender_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-12">
      <div className="flex items-center justify-between">
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

      <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(bundles ?? []).map((b) => {
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
      </div>
    </main>
  );
}
