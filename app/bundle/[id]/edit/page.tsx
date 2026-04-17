import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BundleBuilder } from "./BundleBuilder";

export const metadata = { title: "Edit bundle — Enveloped" };

export default async function EditBundlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: bundle } = await supabase
    .from("bundles")
    .select("*")
    .eq("id", id)
    .single();
  if (!bundle || bundle.sender_id !== user.id) notFound();

  const { data: envelopes } = await supabase
    .from("envelopes")
    .select("*")
    .eq("bundle_id", id)
    .order("order_index", { ascending: true });

  const { data: items } = await supabase
    .from("envelope_items")
    .select("id, envelope_id, type, order_index, meta_json")
    .in(
      "envelope_id",
      (envelopes ?? []).map((e) => e.id).length
        ? (envelopes ?? []).map((e) => e.id)
        : ["00000000-0000-0000-0000-000000000000"],
    )
    .order("order_index", { ascending: true });

  return (
    <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest" style={{ color: "var(--color-muted)" }}>
            Bundle
          </div>
          <h1 className="font-display text-4xl" style={{ color: "var(--color-ink)" }}>
            {bundle.title}
          </h1>
          {bundle.recipient_name ? (
            <p className="mt-1 font-hand text-lg" style={{ color: "var(--color-muted)" }}>
              for {bundle.recipient_name}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/b/${bundle.access_token}`}
            target="_blank"
            className="rounded-full px-4 py-2 text-sm border"
            style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
          >
            Preview recipient view
          </Link>
          <Link
            href={`/bundle/${bundle.id}/share`}
            className="rounded-full px-4 py-2 text-sm"
            style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
          >
            Share →
          </Link>
        </div>
      </div>

      <BundleBuilder
        bundle={{
          id: bundle.id,
          themeId: bundle.theme_id,
        }}
        envelopes={(envelopes ?? []).map((e) => ({
          id: e.id,
          title: e.title,
          caption: e.caption,
          orderIndex: e.order_index,
          unlockType: e.unlock_type,
          unlockAt: e.unlock_at,
          envelopeDesignId: e.envelope_design_id,
          themeOverrideId: e.theme_override_id,
        }))}
        items={(items ?? []).map((i) => ({
          id: i.id,
          envelopeId: i.envelope_id,
          type: i.type,
          orderIndex: i.order_index,
          meta: i.meta_json ?? {},
        }))}
      />
    </main>
  );
}
