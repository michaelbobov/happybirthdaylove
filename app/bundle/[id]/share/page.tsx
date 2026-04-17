import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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
    .select("id, sender_id, title, access_token, passphrase_hash")
    .eq("id", id)
    .single();
  if (!bundle || bundle.sender_id !== user.id) notFound();

  return (
    <main className="flex-1 mx-auto max-w-xl w-full px-6 py-16 text-center">
      <h1 className="font-display text-4xl" style={{ color: "var(--color-ink)" }}>
        It&rsquo;s ready.
      </h1>
      <p className="mt-2 font-hand text-lg" style={{ color: "var(--color-muted)" }}>
        Send this link. They&rsquo;ll find every envelope waiting for them.
      </p>
      <ShareLinkClient token={bundle.access_token} hasPassphrase={!!bundle.passphrase_hash} />
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
