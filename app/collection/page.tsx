import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { coerceBytea, decryptToString } from "@/lib/crypto";
import { GlobalCollection } from "./GlobalCollection";
import type { ItemPayload, RevealedItem } from "@/lib/types";

export const metadata = { title: "Your collection — Enveloped" };

export type CollectedItem = RevealedItem & {
  envelopeId: string;
  envelopeTitle: string;
  bundleId: string;
  bundleTitle: string;
  bundleToken: string;
  openedAt: string;
};

export default async function CollectionPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const admin = createAdminClient();

  // All bundles claimed by this user
  const { data: bundles } = await supabase
    .from("bundles")
    .select("id, title, access_token")
    .eq("claimed_by_user_id", user.id);

  if (!bundles?.length) {
    return (
      <main className="app-screen flex-1 mx-auto max-w-5xl w-full px-6 pb-20 text-center">
        <div className="font-hand text-2xl" style={{ color: "var(--color-muted)" }}>
          Nothing collected yet — open an envelope first.
        </div>
      </main>
    );
  }

  const bundleMap = Object.fromEntries(bundles.map((b) => [b.id, b]));

  // All opened envelopes across those bundles
  const { data: envelopes } = await admin
    .from("envelopes")
    .select("id, bundle_id, title, opened_at")
    .in("bundle_id", bundles.map((b) => b.id))
    .not("opened_at", "is", null)
    .order("opened_at", { ascending: false });

  if (!envelopes?.length) {
    return (
      <main className="app-screen flex-1 mx-auto max-w-5xl w-full px-6 pb-20 text-center">
        <div className="font-hand text-2xl" style={{ color: "var(--color-muted)" }}>
          Nothing collected yet — open an envelope first.
        </div>
      </main>
    );
  }

  const envelopeMap = Object.fromEntries(envelopes.map((e) => [e.id, e]));

  // All items from those envelopes
  const { data: rows } = await admin
    .from("envelope_items")
    .select("id, envelope_id, order_index, type, payload_encrypted, meta_json")
    .in("envelope_id", envelopes.map((e) => e.id))
    .order("order_index", { ascending: true });

  const items: CollectedItem[] = [];
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
        .createSignedUrl(payload.storageKey, 3600);
      mediaUrl = signed?.signedUrl;
    }

    const env = envelopeMap[row.envelope_id];
    const bundle = bundleMap[env.bundle_id];

    items.push({
      id: row.id,
      envelopeId: row.envelope_id,
      envelopeTitle: env.title,
      bundleId: env.bundle_id,
      bundleTitle: bundle.title,
      bundleToken: bundle.access_token,
      openedAt: env.opened_at!,
      type: row.type,
      orderIndex: row.order_index,
      payload,
      meta: row.meta_json ?? {},
      mediaUrl,
    });
  }

  return <GlobalCollection items={items} />;
}
