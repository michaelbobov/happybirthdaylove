import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { coerceBytea, decryptToString } from "@/lib/crypto";
import type { ItemPayload, RevealedItem } from "@/lib/types";

export type CollectionItem = RevealedItem & {
  envelopeId: string;
  envelopeTitle: string;
};

/**
 * GET /api/collection/:token
 * Returns all decrypted items from every *opened* envelope in the bundle.
 * No passphrase required — opened_at proves the recipient already authenticated.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const admin = createAdminClient();

  const { data: bundle } = await admin
    .from("bundles")
    .select("id")
    .eq("access_token", token)
    .single();
  if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: envelopes } = await admin
    .from("envelopes")
    .select("id, title")
    .eq("bundle_id", bundle.id)
    .not("opened_at", "is", null)
    .order("order_index", { ascending: true });
  if (!envelopes?.length) return NextResponse.json({ items: [] });

  const envelopeIds = envelopes.map((e) => e.id);
  const envelopeMap = Object.fromEntries(envelopes.map((e) => [e.id, e.title]));

  const { data: rows } = await admin
    .from("envelope_items")
    .select("id, envelope_id, order_index, type, payload_encrypted, meta_json")
    .in("envelope_id", envelopeIds)
    .order("order_index", { ascending: true });

  const items: CollectionItem[] = [];
  for (const row of rows ?? []) {
    let payload: ItemPayload;
    try {
      const plaintext = decryptToString(coerceBytea(row.payload_encrypted));
      payload = JSON.parse(plaintext) as ItemPayload;
    } catch {
      continue;
    }

    let mediaUrl: string | undefined;
    if (payload.type === "image" || payload.type === "audio") {
      const { data: signed } = await admin.storage
        .from("envelope-media")
        .createSignedUrl(payload.storageKey, 300); // 5-min TTL for collection view
      mediaUrl = signed?.signedUrl;
    }

    items.push({
      id: row.id,
      envelopeId: row.envelope_id,
      envelopeTitle: envelopeMap[row.envelope_id] ?? "",
      type: row.type,
      orderIndex: row.order_index,
      payload,
      meta: row.meta_json ?? {},
      mediaUrl,
    });
  }

  return NextResponse.json({ items });
}
