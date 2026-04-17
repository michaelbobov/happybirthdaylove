import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "node:crypto";

/**
 * POST /api/upload
 * multipart form with 'file' and 'bundleId'.
 * Verifies the caller owns the bundle, then uploads to the private bucket
 * under `bundles/<bundleId>/<random>-<ext>`. Returns the storageKey.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const bundleId = form.get("bundleId") as string | null;
  if (!file || !bundleId) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { data: bundle } = await supabase
    .from("bundles")
    .select("sender_id")
    .eq("id", bundleId)
    .single();
  if (!bundle || bundle.sender_id !== userData.user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const ext = (file.name.split(".").pop() || "bin").toLowerCase().slice(0, 8);
  const storageKey = `bundles/${bundleId}/${randomBytes(10).toString("hex")}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("envelope-media")
    .upload(storageKey, bytes, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    storageKey,
    mime: file.type,
    size: file.size,
  });
}
