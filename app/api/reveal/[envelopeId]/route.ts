import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { coerceBytea, decryptToString } from "@/lib/crypto";
import { canUnlock } from "@/lib/unlock";
import { revealRequestSchema } from "@/lib/schemas";
import type { ItemPayload, RevealedItem } from "@/lib/types";

/**
 * POST /api/reveal/:envelopeId
 * Body: { token, passphrase? }
 * Returns: { envelope, items: RevealedItem[] } after server-side unlock check.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ envelopeId: string }> },
) {
  const { envelopeId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = revealRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: envelope, error: envErr } = await admin
    .from("envelopes")
    .select(
      "id, bundle_id, title, caption, unlock_type, unlock_at, envelope_design_id, theme_override_id, opened_at, order_index",
    )
    .eq("id", envelopeId)
    .single();
  if (envErr || !envelope) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: bundle, error: bundleErr } = await admin
    .from("bundles")
    .select("id, access_token, passphrase_hash, theme_id")
    .eq("id", envelope.bundle_id)
    .single();
  if (bundleErr || !bundle) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await canUnlock(
    { accessToken: bundle.access_token, passphraseHash: bundle.passphrase_hash },
    {
      unlockType: envelope.unlock_type,
      unlockAt: envelope.unlock_at ? new Date(envelope.unlock_at) : null,
    },
    { token: parsed.data.token, passphrase: parsed.data.passphrase },
  );

  if (!result.ok) {
    const status = result.reason === "bad_token" ? 403 : result.reason === "bad_passphrase" ? 401 : 423;
    return NextResponse.json(
      {
        error: result.reason,
        unlockAt: "unlockAt" in result ? result.unlockAt?.toISOString() : undefined,
      },
      { status },
    );
  }

  // Fetch encrypted items
  const { data: rows, error: itemErr } = await admin
    .from("envelope_items")
    .select("id, order_index, type, payload_encrypted, meta_json")
    .eq("envelope_id", envelopeId)
    .order("order_index", { ascending: true });
  if (itemErr) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  const items: RevealedItem[] = [];
  for (const row of rows ?? []) {
    let payload: ItemPayload;
    try {
      const plaintext = decryptToString(coerceBytea(row.payload_encrypted));
      payload = JSON.parse(plaintext) as ItemPayload;
    } catch {
      continue; // skip undecipherable rows
    }

    let mediaUrl: string | undefined;
    if (payload.type === "image" || payload.type === "audio") {
      const { data: signed } = await admin.storage
        .from("envelope-media")
        .createSignedUrl(payload.storageKey, 60);
      mediaUrl = signed?.signedUrl;
    }

    items.push({
      id: row.id,
      type: row.type,
      orderIndex: row.order_index,
      payload,
      meta: row.meta_json ?? {},
      mediaUrl,
    });
  }

  // Mark as opened (first time only)
  if (!envelope.opened_at) {
    await admin
      .from("envelopes")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", envelopeId);
  }

  return NextResponse.json({
    envelope: {
      id: envelope.id,
      title: envelope.title,
      caption: envelope.caption,
      orderIndex: envelope.order_index,
      envelopeDesignId: envelope.envelope_design_id,
      themeOverrideId: envelope.theme_override_id,
      unlockType: envelope.unlock_type,
      unlockAt: envelope.unlock_at,
    },
    bundle: { id: bundle.id, themeId: bundle.theme_id },
    items,
  });
}
