import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { BundleHub } from "./BundleHub";

export const metadata = { title: "A bundle for you — Enveloped" };

export default async function RecipientBundlePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();
  const { data: bundle } = await admin
    .from("bundles")
    .select("id, title, cover_message, theme_id, passphrase_hash, recipient_name, access_token")
    .eq("access_token", token)
    .single();
  if (!bundle) notFound();

  const { data: envelopes } = await admin
    .from("envelopes")
    .select(
      "id, title, caption, order_index, unlock_type, unlock_at, envelope_design_id, theme_override_id, seal_color_override, stamps, opened_at",
    )
    .eq("bundle_id", bundle.id)
    .order("order_index", { ascending: true });

  const envelopeList = envelopes ?? [];

  // Fetch item types (unencrypted) for content preview chips.
  // One query for all envelopes in the bundle — no decryption needed.
  const { data: itemRows } = await admin
    .from("envelope_items")
    .select("envelope_id, type")
    .in("envelope_id", envelopeList.map((e) => e.id));

  // Group by envelope id
  const itemTypesByEnvelope: Record<string, string[]> = {};
  for (const row of itemRows ?? []) {
    (itemTypesByEnvelope[row.envelope_id] ??= []).push(row.type);
  }

  return (
    <BundleHub
      bundle={{
        id: bundle.id,
        token: bundle.access_token,
        title: bundle.title,
        coverMessage: bundle.cover_message,
        themeId: bundle.theme_id,
        hasPassphrase: !!bundle.passphrase_hash,
        recipientName: bundle.recipient_name,
      }}
      envelopes={envelopeList.map((e) => ({
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
        openedAt: e.opened_at,
        contentTypes: itemTypesByEnvelope[e.id] ?? [],
      }))}
    />
  );
}
