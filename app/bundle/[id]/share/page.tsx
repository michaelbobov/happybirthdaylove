import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBundle } from "@/app/actions/bundles";
import { ShareLinkClient } from "./ShareLinkClient";

export const metadata = { title: "Share bundle — Enveloped" };

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const { data: bundle } = await supabase
    .from("bundles")
    .select("id, sender_id, title, access_token, passphrase_hash, sent_at")
    .eq("id", id)
    .single();
  if (!bundle || bundle.sender_id !== user.id) notFound();

  const admin = createAdminClient();
  const { data: envelopes } = await admin
    .from("envelopes")
    .select("id, title, unlock_type, unlock_at")
    .eq("bundle_id", bundle.id)
    .order("order_index", { ascending: true });

  const envelopeList = envelopes ?? [];
  const { data: itemRows } = envelopeList.length
    ? await admin
      .from("envelope_items")
      .select("envelope_id")
      .in("envelope_id", envelopeList.map((e) => e.id))
    : { data: [] };

  const itemCounts = new Map<string, number>();
  for (const row of itemRows ?? []) {
    itemCounts.set(row.envelope_id, (itemCounts.get(row.envelope_id) ?? 0) + 1);
  }

  const checklist: string[] = [];
  if (!envelopeList.length) checklist.push("Add at least 1 envelope.");
  for (const envelope of envelopeList) {
    if ((itemCounts.get(envelope.id) ?? 0) === 0) {
      checklist.push(`Add something inside "${envelope.title}".`);
    }
    if (envelope.unlock_type === "date" && !envelope.unlock_at) {
      checklist.push(`Choose an opening date for "${envelope.title}".`);
    }
    if (envelope.unlock_type === "manual") {
      checklist.push(`Change "${envelope.title}" from "Keep locked" before sharing.`);
    }
  }
  const readyToShare = checklist.length === 0;

  return (
    <main className="app-screen flex-1 mx-auto max-w-xl w-full px-6 pb-16 text-center">
      <div className="text-xs uppercase tracking-[0.2em]" style={{ color: bundle.sent_at ? "var(--color-accent)" : "var(--color-muted)" }}>
        {bundle.sent_at ? "Sent bundle" : "Draft bundle"}
      </div>
      <h1 className="font-display text-4xl" style={{ color: "var(--color-ink)" }}>
        {readyToShare ? "It&rsquo;s ready." : "Almost ready."}
      </h1>
      <p className="mt-2 font-hand text-lg" style={{ color: "var(--color-muted)" }}>
        {readyToShare
          ? "Send this link. They&rsquo;ll find every envelope waiting for them."
          : "Finish these few details so the recipient never opens an empty or permanently locked gift."}
      </p>

      {!readyToShare && (
        <div
          className="paper mt-8 rounded-[var(--radius-lg)] p-5 text-left"
          style={{ boxShadow: "0 10px 26px var(--color-shadow)", color: "var(--color-ink)" }}
        >
          <div className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-muted)" }}>
            Before You Share
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {checklist.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      )}

      {readyToShare && !bundle.sent_at && (
        <form action={sendBundle.bind(null, bundle.id)} className="mt-8">
          <button
            type="submit"
            className="rounded-full px-5 py-2.5 text-sm"
            style={{ background: "var(--color-accent)", color: "var(--color-bg)" }}
          >
            Mark Sent
          </button>
        </form>
      )}

      <ShareLinkClient token={bundle.access_token} hasPassphrase={!!bundle.passphrase_hash} disabled={!readyToShare} />
      <div className="mt-6 flex justify-center gap-2">
        <Link
          href={`/bundle/${bundle.id}/edit`}
          className="rounded-full px-4 py-2 text-sm border"
          style={{ borderColor: "var(--color-ink)", color: "var(--color-ink)" }}
        >
          ← Back to edit
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full px-4 py-2 text-sm"
          style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
        >
          All bundles
        </Link>
      </div>
    </main>
  );
}
