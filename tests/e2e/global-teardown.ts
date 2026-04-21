import path from "node:path";
import fs from "node:fs/promises";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Seeds } from "./global-setup";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.test.local" });

const SEEDS_FILE = path.join(__dirname, "fixtures", ".seeds.json");

async function teardown() {
  let seeds: Seeds;
  try {
    seeds = JSON.parse(await fs.readFile(SEEDS_FILE, "utf8"));
  } catch {
    return;
  }

  if (!seeds.configured) return;

  const serviceRoleKey = process.env.SUPABASE_E2E_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) return;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Delete all bundles created for sender (cascades to envelopes + items via FK)
  if (seeds.bundles.jordanBundle.id) {
    await admin.from("bundles").delete().eq("id", seeds.bundles.jordanBundle.id);
  }
  if (seeds.bundles.sarahDraftBundle.id) {
    await admin.from("bundles").delete().eq("id", seeds.bundles.sarahDraftBundle.id);
  }

  // Delete test users
  for (const email of [seeds.senderEmail, seeds.recipientEmail]) {
    const { data: users } = await admin.auth.admin.listUsers();
    const user = users?.users?.find((u) => u.email === email);
    if (user) await admin.auth.admin.deleteUser(user.id);
  }

  await fs.unlink(SEEDS_FILE).catch(() => {});
  const magicLinkFile = path.join(__dirname, "fixtures", ".sender-magic-link.txt");
  await fs.unlink(magicLinkFile).catch(() => {});

  console.info("[E2E] Test data cleaned up.");
}

export default teardown;
