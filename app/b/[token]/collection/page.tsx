import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CollectionHub } from "./CollectionHub";

export const metadata = { title: "Your collection" };

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: bundle } = await admin
    .from("bundles")
    .select("title, theme_id")
    .eq("access_token", token)
    .single();
  if (!bundle) notFound();

  return (
    <CollectionHub
      token={token}
      themeId={bundle.theme_id}
      bundleTitle={bundle.title}
    />
  );
}
