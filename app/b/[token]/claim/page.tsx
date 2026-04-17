import { createClient } from "@/lib/supabase/server";
import { ClaimClient } from "./ClaimClient";

export const metadata = { title: "Save this bundle — Enveloped" };

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return <ClaimClient token={token} initiallySignedIn={!!data.user} />;
}
