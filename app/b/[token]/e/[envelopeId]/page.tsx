import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { EnvelopeOpenClient } from "./EnvelopeOpenClient";

export const metadata = { title: "Opening your envelope…" };

export default async function OpenPage({
  params,
}: {
  params: Promise<{ token: string; envelopeId: string }>;
}) {
  const { token, envelopeId } = await params;
  const admin = createAdminClient();

  const { data: bundle } = await admin
    .from("bundles")
    .select("id, theme_id, passphrase_hash")
    .eq("access_token", token)
    .single();
  if (!bundle) notFound();

  const { data: envelope } = await admin
    .from("envelopes")
    .select("id, title, caption, envelope_design_id, theme_override_id, seal_color_override, stamps, unlock_type, unlock_at, opened_at")
    .eq("id", envelopeId)
    .eq("bundle_id", bundle.id)
    .single();
  if (!envelope) notFound();

  return (
    <EnvelopeOpenClient
      token={token}
      hasPassphrase={!!bundle.passphrase_hash}
      bundleThemeId={bundle.theme_id}
      envelope={{
        id: envelope.id,
        title: envelope.title,
        caption: envelope.caption,
        envelopeDesignId: envelope.envelope_design_id,
        themeOverrideId: envelope.theme_override_id,
        sealColorOverride: envelope.seal_color_override ?? null,
        stamps: Array.isArray(envelope.stamps) ? envelope.stamps : [],
        unlockType: envelope.unlock_type,
        unlockAt: envelope.unlock_at,
        openedAt: envelope.opened_at,
      }}
    />
  );
}
