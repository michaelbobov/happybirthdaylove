import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { coerceBytea, decryptToString } from "@/lib/crypto";
import { sendBundle } from "@/app/actions/bundles";
import { BundleBuilder } from "./BundleBuilder";
import type { ItemPayload } from "@/lib/types";

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
    .select("id, envelope_id, type, order_index, meta_json, payload_encrypted")
    .in(
      "envelope_id",
      (envelopes ?? []).map((e) => e.id).length
        ? (envelopes ?? []).map((e) => e.id)
        : ["00000000-0000-0000-0000-000000000000"],
    )
    .order("order_index", { ascending: true });
  const admin = createAdminClient();
  const itemPayloads = new Map<string, ItemPayload>();
  const itemMediaUrls = new Map<string, string>();
  for (const item of items ?? []) {
    try {
      const payload = JSON.parse(decryptToString(coerceBytea(item.payload_encrypted))) as ItemPayload;
      itemPayloads.set(item.id, payload);
      if (payload.type === "image" || payload.type === "audio") {
        const { data: signed } = await admin.storage
          .from("envelope-media")
          .createSignedUrl(payload.storageKey, 3600);
        if (signed?.signedUrl) itemMediaUrls.set(item.id, signed.signedUrl);
      }
    } catch {
      // Keep rendering the editor even if an older item cannot be decoded.
    }
  }

  return (
    <main className="app-screen flex-1 mx-auto max-w-5xl w-full px-6 pb-10">
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
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Link
            href={`/b/${bundle.access_token}`}
            target="_blank"
            className="rounded-full px-4 py-2 text-sm border"
            style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
          >
            Preview recipient view
          </Link>
          <form action={sendBundle.bind(null, bundle.id)}>
            <button
              type="submit"
              className="rounded-full px-4 py-2 text-sm"
              style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
            >
              Mark Ready & Share →
            </button>
          </form>
        </div>
      </div>

      <BundleBuilder
        bundle={{
          id: bundle.id,
          themeId: bundle.theme_id,
          coverMessage: bundle.cover_message ?? "",
          recipientName: bundle.recipient_name ?? "",
          recipientEmail: bundle.recipient_email ?? "",
          hasPassphrase: !!bundle.passphrase_hash,
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
          sealColorOverride: e.seal_color_override ?? null,
          stamps: Array.isArray(e.stamps) ? e.stamps : [],
        }))}
        items={(items ?? []).map((i) => ({
          id: i.id,
          envelopeId: i.envelope_id,
          type: i.type,
          orderIndex: i.order_index,
          meta: i.meta_json ?? {},
          previewPayload: itemPayloads.get(i.id),
          previewUrl: itemMediaUrls.get(i.id),
        }))}
      />
    </main>
  );
}
