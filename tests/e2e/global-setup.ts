/**
 * Playwright global setup — seeds test data into Supabase before the test run.
 *
 * Requires these env vars (in .env.test.local or CI secrets):
 *   SUPABASE_E2E_SERVICE_ROLE_KEY  — service-role key for a dedicated TEST project
 *   NEXT_PUBLIC_SUPABASE_URL       — already in .env.local
 *   ENVELOPE_ENC_KEY               — already in .env.local
 *
 * If SUPABASE_E2E_SERVICE_ROLE_KEY is absent the setup writes a "not configured"
 * marker so all DB-dependent tests self-skip instead of failing.
 */

import path from "node:path";
import fs from "node:fs/promises";
import { createCipheriv, randomBytes } from "node:crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.test.local" }); // optional overrides

const SEEDS_FILE = path.join(__dirname, "fixtures", ".seeds.json");
const AUTH_STATE_DIR = path.join(__dirname, "fixtures");

// ── encryption helpers (mirrors lib/crypto.ts without server-only guard) ──────
function encryptPayload(payload: object): string {
  const b64 = process.env.ENVELOPE_ENC_KEY;
  if (!b64) throw new Error("ENVELOPE_ENC_KEY not set");
  const key = Buffer.from(b64, "base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const pt = Buffer.from(JSON.stringify(payload), "utf8");
  const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Return as Postgres \x hex literal expected by PostgREST
  return "\\x" + Buffer.concat([iv, tag, ct]).toString("hex");
}

function randomToken() {
  return randomBytes(32).toString("base64url");
}

export interface Seeds {
  configured: boolean;
  senderEmail: string;
  senderPassword: string;
  recipientEmail: string;
  recipientPassword: string;
  bundles: {
    jordanBundle: {
      token: string;
      id: string;
      immediateEnvelopeId: string;
      dateLocked: { id: string; unlockAt: string };
      manualEnvelopeId: string;
    };
    sarahDraftBundle: {
      token: string;
      id: string;
    };
  };
}

async function setup() {
  const serviceRoleKey = process.env.SUPABASE_E2E_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || serviceRoleKey.startsWith("stub-")) {
    const notConfigured: Seeds = {
      configured: false,
      senderEmail: "",
      senderPassword: "",
      recipientEmail: "",
      recipientPassword: "",
      bundles: {
        jordanBundle: {
          token: "",
          id: "",
          immediateEnvelopeId: "",
          dateLocked: { id: "", unlockAt: "" },
          manualEnvelopeId: "",
        },
        sarahDraftBundle: { token: "", id: "" },
      },
    };
    await fs.writeFile(SEEDS_FILE, JSON.stringify(notConfigured, null, 2));
    console.info("[E2E] No SUPABASE_E2E_SERVICE_ROLE_KEY — DB-dependent tests will be skipped.");
    return;
  }

  const admin = createClient(supabaseUrl!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── create test users ────────────────────────────────────────────────────────
  const senderEmail = `e2e-sarah-${Date.now()}@test.enveloped.dev`;
  const recipientEmail = `e2e-jordan-${Date.now()}@test.enveloped.dev`;
  const testPassword = "E2eTest@Password99!";

  const { data: senderUser } = await admin.auth.admin.createUser({
    email: senderEmail,
    password: testPassword,
    email_confirm: true,
  });
  const { data: recipientUser } = await admin.auth.admin.createUser({
    email: recipientEmail,
    password: testPassword,
    email_confirm: true,
  });

  const senderId = senderUser.user!.id;

  // ── Jordan's bundle (recipient happy-path) ───────────────────────────────────
  const jordanToken = randomToken();
  const { data: jordanBundle } = await admin
    .from("bundles")
    .insert({
      sender_id: senderId,
      title: "A bundle just for you",
      cover_message: "Because you deserve something beautiful.",
      recipient_name: "Jordan",
      access_token: jordanToken,
      theme_id: "warm-handmade",
    })
    .select("id")
    .single();

  const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // +60 days

  const { data: envelopes } = await admin
    .from("envelopes")
    .insert([
      {
        bundle_id: jordanBundle!.id,
        order_index: 0,
        title: "Open me first",
        caption: "Start here",
        unlock_type: "immediate",
        envelope_design_id: "kraft-classic",
      },
      {
        bundle_id: jordanBundle!.id,
        order_index: 1,
        title: "On your special day",
        caption: "Save for later",
        unlock_type: "date",
        unlock_at: futureDate,
        envelope_design_id: "cream-scallop",
      },
      {
        bundle_id: jordanBundle!.id,
        order_index: 2,
        title: "When the time is right",
        caption: "Sender will unlock",
        unlock_type: "manual",
        envelope_design_id: "sage-botanical",
      },
    ])
    .select("id, unlock_type");

  const immediateEnv = envelopes!.find((e) => e.unlock_type === "immediate")!;
  const dateEnv = envelopes!.find((e) => e.unlock_type === "date")!;
  const manualEnv = envelopes!.find((e) => e.unlock_type === "manual")!;

  // Add an encrypted text item to the immediate envelope
  await admin.from("envelope_items").insert({
    envelope_id: immediateEnv.id,
    order_index: 0,
    type: "text",
    payload_encrypted: encryptPayload({ type: "text", html: "<p>Happy birthday, Jordan! 🎉</p>" }),
    meta_json: {},
  });

  // ── Sarah's draft bundle (sender edit-flow) ──────────────────────────────────
  const sarahToken = randomToken();
  const { data: sarahBundle } = await admin
    .from("bundles")
    .insert({
      sender_id: senderId,
      title: "Birthday Memories",
      cover_message: "Three years, and still not enough time.",
      recipient_name: "Alex",
      access_token: sarahToken,
      theme_id: "cinematic-gold",
    })
    .select("id")
    .single();

  // ── persist Playwright auth state for sender ──────────────────────────────────
  const { data: session } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: senderEmail,
  });

  const seeds: Seeds = {
    configured: true,
    senderEmail,
    senderPassword: testPassword,
    recipientEmail,
    recipientPassword: testPassword,
    bundles: {
      jordanBundle: {
        token: jordanToken,
        id: jordanBundle!.id,
        immediateEnvelopeId: immediateEnv.id,
        dateLocked: { id: dateEnv.id, unlockAt: futureDate },
        manualEnvelopeId: manualEnv.id,
      },
      sarahDraftBundle: {
        token: sarahToken,
        id: sarahBundle!.id,
      },
    },
  };

  await fs.writeFile(SEEDS_FILE, JSON.stringify(seeds, null, 2));
  console.info("[E2E] Test data seeded successfully.");
  console.info(`      Sender:    ${senderEmail}`);
  console.info(`      Recipient: ${recipientEmail}`);
  console.info(`      Jordan's bundle token: ${jordanToken.slice(0, 10)}…`);

  // Save auth storage state for the sender persona
  // Tests that need the sender authed will use storageState with a real session.
  // We store the magic link URL so the `authedPage` fixture can visit it once.
  const authStateFile = path.join(AUTH_STATE_DIR, ".sender-magic-link.txt");
  if (session?.properties?.action_link) {
    await fs.writeFile(authStateFile, session.properties.action_link);
  }
}

export default setup;
