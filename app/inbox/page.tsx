import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTheme } from "@/lib/themes";

export const metadata = { title: "Inbox — Enveloped" };

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q = "", status = "all" } = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: bundles } = await supabase
    .from("bundles")
    .select("id, title, theme_id, cover_message, access_token, created_at")
    .eq("claimed_by_user_id", user.id)
    .order("created_at", { ascending: false });

  const bundleList = bundles ?? [];

  // Fetch envelope open counts for each bundle
  const openedCounts: Record<string, { total: number; opened: number }> = {};
  if (bundleList.length > 0) {
    const { data: envRows } = await admin
      .from("envelopes")
      .select("bundle_id, opened_at")
      .in("bundle_id", bundleList.map((b) => b.id));
    for (const row of envRows ?? []) {
      const entry = (openedCounts[row.bundle_id] ??= { total: 0, opened: 0 });
      entry.total++;
      if (row.opened_at) entry.opened++;
    }
  }

  const anyOpened = bundleList.some((b) => (openedCounts[b.id]?.opened ?? 0) > 0);
  const normalizedQuery = q.trim().toLowerCase();
  const filteredBundles = bundleList.filter((bundle) => {
    const counts = openedCounts[bundle.id] ?? { total: 0, opened: 0 };
    const matchesQuery = !normalizedQuery ||
      bundle.title.toLowerCase().includes(normalizedQuery) ||
      (bundle.cover_message ?? "").toLowerCase().includes(normalizedQuery);
    const matchesStatus =
      status === "all" ||
      (status === "unopened" && counts.opened === 0) ||
      (status === "in-progress" && counts.opened > 0 && counts.opened < counts.total) ||
      (status === "complete" && counts.total > 0 && counts.opened === counts.total);
    return matchesQuery && matchesStatus;
  });

  const statusHref = (nextStatus: string) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (nextStatus !== "all") params.set("status", nextStatus);
    const qs = params.toString();
    return qs ? `/inbox?${qs}` : "/inbox";
  };

  return (
    <main className="app-screen flex-1 mx-auto max-w-5xl w-full px-6 pb-12">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl" style={{ color: "var(--color-ink)" }}>
            Yours
          </h1>
          <p className="mt-1 font-hand text-lg" style={{ color: "var(--color-muted)" }}>
            Every bundle anyone&rsquo;s sent you.
          </p>
        </div>
        {anyOpened && (
          <Link
            href="/collection"
            className="rounded-full px-5 py-2.5 text-sm font-medium"
            style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
          >
            All collected items ✦
          </Link>
        )}
      </div>

      <div className="paper mt-6 rounded-[var(--radius-lg)] p-4" style={{ boxShadow: "0 8px 22px var(--color-shadow)" }}>
        <form className="flex flex-col gap-3 sm:flex-row" action="/inbox">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search received bundles…"
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
            ["unopened", "Unopened"],
            ["in-progress", "In Progress"],
            ["complete", "Complete"],
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
          const counts = openedCounts[b.id] ?? { total: 0, opened: 0 };
          const allOpened = counts.total > 0 && counts.opened === counts.total;

          return (
            <Link
              key={b.id}
              href={`/b/${b.access_token}`}
              className="paper rounded-[var(--radius-lg)] p-5 transition-transform hover:-translate-y-1 relative overflow-hidden"
              style={{ boxShadow: "0 10px 26px var(--color-shadow)" }}
            >
              {/* Opened envelope thumbnail */}
              {counts.opened > 0 && (
                <div className="flex justify-center mb-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/opened.png"
                    alt=""
                    width={120}
                    height={78}
                    draggable={false}
                    style={{ objectFit: "contain", opacity: allOpened ? 0.75 : 1 }}
                  />
                </div>
              )}

              <div className="text-[11px] uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
                {theme.name}
              </div>
              <div className="mt-1 font-display text-2xl" style={{ color: "var(--color-ink)" }}>
                {b.title}
              </div>
              {b.cover_message ? (
                <div className="mt-2 font-hand" style={{ color: "var(--color-muted)" }}>
                  {b.cover_message}
                </div>
              ) : null}

              {/* Progress indicator */}
              {counts.total > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    {Array.from({ length: counts.total }).map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: i < counts.opened ? "var(--color-accent)" : "var(--color-muted)",
                          opacity: i < counts.opened ? 1 : 0.3,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                    {counts.opened}/{counts.total} opened
                  </span>
                </div>
              )}
            </Link>
          );
        })}

        {bundleList.length === 0 && (
          <div
            className="col-span-full paper rounded-[var(--radius-lg)] p-10 text-center"
            style={{ color: "var(--color-muted)" }}
          >
            Nothing here yet. When someone sends you a bundle you can save it here.
          </div>
        )}
        {bundleList.length > 0 && filteredBundles.length === 0 && (
          <div
            className="col-span-full paper rounded-[var(--radius-lg)] p-10 text-center"
            style={{ color: "var(--color-muted)" }}
          >
            No received bundles match that search.
          </div>
        )}
      </div>
    </main>
  );
}
