"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encrypt, newAccessToken } from "@/lib/crypto";
import { hashPassphrase } from "@/lib/unlock";
import {
  addItemSchema,
  createBundleSchema,
  updateItemSchema,
  updateBundleSchema,
  upsertEnvelopeSchema,
} from "@/lib/schemas";
import type { z } from "zod";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createBundle(
  input: z.infer<typeof createBundleSchema>,
): Promise<ActionResult<{ id: string; token: string }>> {
  const parsed = createBundleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const user = await requireUser();
  const supabase = await createClient();

  const passphraseHash = parsed.data.passphrase
    ? await hashPassphrase(parsed.data.passphrase)
    : null;
  const token = newAccessToken();

  const { data, error } = await supabase
    .from("bundles")
    .insert({
      sender_id: user.id,
      title: parsed.data.title,
      cover_message: parsed.data.coverMessage || null,
      recipient_name: parsed.data.recipientName || null,
      recipient_email: parsed.data.recipientEmail || null,
      theme_id: parsed.data.themeId,
      access_token: token,
      passphrase_hash: passphraseHash,
    })
    .select("id, access_token")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed" };

  revalidatePath("/dashboard");
  return { ok: true, data: { id: data.id, token: data.access_token } };
}

export async function updateBundle(
  input: z.infer<typeof updateBundleSchema>,
): Promise<ActionResult<null>> {
  const parsed = updateBundleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const user = await requireUser();
  const supabase = await createClient();

  const { data: bundle } = await supabase
    .from("bundles")
    .select("sender_id")
    .eq("id", parsed.data.id)
    .single();
  if (!bundle || bundle.sender_id !== user.id)
    return { ok: false, error: "Not authorized" };

  const update: Record<string, unknown> = {
    cover_message: parsed.data.coverMessage ?? null,
    recipient_name: parsed.data.recipientName ?? null,
    recipient_email: parsed.data.recipientEmail || null,
  };

  if (parsed.data.clearPassphrase) {
    update.passphrase_hash = null;
  } else if (parsed.data.passphrase) {
    update.passphrase_hash = await hashPassphrase(parsed.data.passphrase);
  }

  const { error } = await supabase
    .from("bundles")
    .update(update)
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/bundle/${parsed.data.id}/edit`);
  return { ok: true, data: null };
}

export async function upsertEnvelope(
  input: z.infer<typeof upsertEnvelopeSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = upsertEnvelopeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const user = await requireUser();
  const supabase = await createClient();

  // ownership check
  const { data: bundle } = await supabase
    .from("bundles")
    .select("sender_id")
    .eq("id", parsed.data.bundleId)
    .single();
  if (!bundle || bundle.sender_id !== user.id) {
    return { ok: false, error: "Not authorized" };
  }

  const payload: Record<string, unknown> = {
    bundle_id: parsed.data.bundleId,
    title: parsed.data.title,
    caption: parsed.data.caption ?? null,
    order_index: parsed.data.orderIndex,
    unlock_type: parsed.data.unlockType,
    unlock_at: parsed.data.unlockAt ?? null,
    envelope_design_id: parsed.data.envelopeDesignId,
    theme_override_id: parsed.data.themeOverrideId ?? null,
    seal_color_override: parsed.data.sealColorOverride ?? null,
  };
  if (parsed.data.stamps !== undefined) {
    payload.stamps = parsed.data.stamps;
  }

  if (parsed.data.id) {
    const { data, error } = await supabase
      .from("envelopes")
      .update(payload)
      .eq("id", parsed.data.id)
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Failed" };
    revalidatePath(`/bundle/${parsed.data.bundleId}/edit`);
    return { ok: true, data: { id: data.id } };
  }

  const { data, error } = await supabase
    .from("envelopes")
    .insert(payload)
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Failed" };
  revalidatePath(`/bundle/${parsed.data.bundleId}/edit`);
  return { ok: true, data: { id: data.id } };
}

export async function deleteEnvelope(envelopeId: string, bundleId: string): Promise<ActionResult<null>> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: bundle } = await supabase
    .from("bundles")
    .select("sender_id")
    .eq("id", bundleId)
    .single();
  if (!bundle || bundle.sender_id !== user.id) {
    return { ok: false, error: "Not authorized" };
  }
  const { error } = await supabase.from("envelopes").delete().eq("id", envelopeId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/bundle/${bundleId}/edit`);
  return { ok: true, data: null };
}

export async function addItem(
  input: z.infer<typeof addItemSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = addItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const user = await requireUser();
  const supabase = await createClient();

  // ownership: envelope -> bundle -> sender
  const { data: env } = await supabase
    .from("envelopes")
    .select("id, bundle_id, bundles(sender_id)")
    .eq("id", parsed.data.envelopeId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const senderId = (env as any)?.bundles?.sender_id;
  if (!env || senderId !== user.id) return { ok: false, error: "Not authorized" };

  const encrypted = encrypt(JSON.stringify(parsed.data.payload));

  // Use admin client to insert bytea (RLS still enforced via prior ownership check)
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("envelope_items")
    .insert({
      envelope_id: parsed.data.envelopeId,
      order_index: parsed.data.orderIndex,
      type: parsed.data.payload.type,
      payload_encrypted: encrypted,
      meta_json: parsed.data.meta ?? {},
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Failed" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  revalidatePath(`/bundle/${(env as any).bundle_id}/edit`);
  return { ok: true, data: { id: data.id } };
}

export async function deleteItem(itemId: string, bundleId: string): Promise<ActionResult<null>> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: bundle } = await supabase
    .from("bundles")
    .select("sender_id")
    .eq("id", bundleId)
    .single();
  if (!bundle || bundle.sender_id !== user.id) return { ok: false, error: "Not authorized" };

  const admin = createAdminClient();
  const { error } = await admin.from("envelope_items").delete().eq("id", itemId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/bundle/${bundleId}/edit`);
  return { ok: true, data: null };
}

export async function updateItem(
  input: z.infer<typeof updateItemSchema>,
): Promise<ActionResult<null>> {
  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const user = await requireUser();
  const supabase = await createClient();
  const { data: bundle } = await supabase
    .from("bundles")
    .select("sender_id")
    .eq("id", parsed.data.bundleId)
    .single();
  if (!bundle || bundle.sender_id !== user.id) return { ok: false, error: "Not authorized" };

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("envelope_items")
    .select("id, envelope_id, envelopes(bundle_id)")
    .eq("id", parsed.data.itemId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!item || (item as any).envelopes?.bundle_id !== parsed.data.bundleId) {
    return { ok: false, error: "Not authorized" };
  }

  const encrypted = encrypt(JSON.stringify(parsed.data.payload));
  const { error } = await admin
    .from("envelope_items")
    .update({
      type: parsed.data.payload.type,
      payload_encrypted: encrypted,
      meta_json: parsed.data.meta ?? {},
    })
    .eq("id", parsed.data.itemId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/bundle/${parsed.data.bundleId}/edit`);
  return { ok: true, data: null };
}

export async function reorderItems(
  bundleId: string,
  envelopeId: string,
  itemIds: string[],
): Promise<ActionResult<null>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: bundle } = await supabase
    .from("bundles")
    .select("sender_id")
    .eq("id", bundleId)
    .single();
  if (!bundle || bundle.sender_id !== user.id) return { ok: false, error: "Not authorized" };

  const admin = createAdminClient();
  const { data: envelope } = await admin
    .from("envelopes")
    .select("id")
    .eq("id", envelopeId)
    .eq("bundle_id", bundleId)
    .single();
  if (!envelope) return { ok: false, error: "Not authorized" };

  const { data: rows, error: readError } = await admin
    .from("envelope_items")
    .select("id, envelope_id")
    .in("id", itemIds);
  if (readError) return { ok: false, error: readError.message };

  const knownIds = new Set((rows ?? []).filter((row) => row.envelope_id === envelopeId).map((row) => row.id));
  if (knownIds.size !== itemIds.length) return { ok: false, error: "Invalid item order" };

  const updates = await Promise.all(
    itemIds.map((id, orderIndex) =>
      admin
        .from("envelope_items")
        .update({ order_index: orderIndex })
        .eq("id", id)
        .eq("envelope_id", envelopeId),
    ),
  );
  const failed = updates.find((result) => result.error);
  if (failed?.error) return { ok: false, error: failed.error.message };

  revalidatePath(`/bundle/${bundleId}/edit`);
  return { ok: true, data: null };
}

export async function sendBundle(bundleId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: ownedBundle } = await supabase
    .from("bundles")
    .select("id")
    .eq("id", bundleId)
    .eq("sender_id", user.id)
    .single();
  if (!ownedBundle) redirect("/dashboard");

  const admin = createAdminClient();
  const { data: envelopes } = await admin
    .from("envelopes")
    .select("id, unlock_type, unlock_at")
    .eq("bundle_id", bundleId);

  if (!envelopes?.length) redirect(`/bundle/${bundleId}/share`);

  const invalidEnvelope = envelopes.some((envelope) =>
    envelope.unlock_type === "manual" ||
    (envelope.unlock_type === "date" && !envelope.unlock_at),
  );
  if (invalidEnvelope) redirect(`/bundle/${bundleId}/share`);

  const { data: itemRows } = await admin
    .from("envelope_items")
    .select("envelope_id")
    .in("envelope_id", envelopes.map((e) => e.id));

  const itemCounts = new Map<string, number>();
  for (const row of itemRows ?? []) {
    itemCounts.set(row.envelope_id, (itemCounts.get(row.envelope_id) ?? 0) + 1);
  }
  if (envelopes.some((envelope) => (itemCounts.get(envelope.id) ?? 0) === 0)) {
    redirect(`/bundle/${bundleId}/share`);
  }

  const { data } = await supabase
    .from("bundles")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", bundleId)
    .eq("sender_id", user.id)
    .select("access_token")
    .single();
  if (!data) redirect("/dashboard");
  redirect(`/bundle/${bundleId}/share`);
}
