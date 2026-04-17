import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTheme } from "@/lib/themes";

export const metadata = { title: "Inbox — Enveloped" };

export default async function InboxPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: bundles } = await supabase
    .from("bundles")
    .select("id, title, theme_id, cover_message, access_token, created_at")
    .eq("claimed_by_user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-12">
      <h1 className="font-display text-4xl" style={{ color: "var(--color-ink)" }}>
        Yours
      </h1>
      <p className="mt-1 font-hand text-lg" style={{ color: "var(--color-muted)" }}>
        Every bundle anyone&rsquo;s sent you.
      </p>
      <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(bundles ?? []).map((b) => {
          const theme = getTheme(b.theme_id);
          return (
            <Link
              key={b.id}
              href={`/b/${b.access_token}`}
              className="paper rounded-[var(--radius-lg)] p-5 transition-transform hover:-translate-y-1"
              style={{ boxShadow: "0 10px 26px var(--color-shadow)" }}
            >
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
            </Link>
          );
        })}
        {(!bundles || bundles.length === 0) && (
          <div
            className="col-span-full paper rounded-[var(--radius-lg)] p-10 text-center"
            style={{ color: "var(--color-muted)" }}
          >
            Nothing here yet. When someone sends you a bundle you can save it here.
          </div>
        )}
      </div>
    </main>
  );
}
