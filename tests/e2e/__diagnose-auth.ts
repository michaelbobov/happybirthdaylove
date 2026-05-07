/**
 * Diagnostic script: verify that signInWithPassword + cookie injection
 * actually produces a session that the dev server can validate.
 *
 * Run via: pnpm exec tsx tests/e2e/__diagnose-auth.ts
 */
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { stringFromBase64URL } from "@supabase/ssr/dist/main/utils/base64url";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.test.local" });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey =
    process.env.SUPABASE_E2E_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  console.log("Supabase URL:", url);
  console.log("Has service key:", !!serviceKey);
  console.log("Has anon key:", !!anonKey);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = `diag-${Date.now()}@test.enveloped.dev`;
  const password = "DiagTest!99";

  const { data: createData, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) throw createErr;
  console.log("Created user:", createData.user!.id);

  // Sign in via password (no PKCE)
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signInData, error: signInErr } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) throw signInErr;

  const session = signInData.session!;
  console.log("\n=== SESSION ===");
  console.log("access_token (first 60 chars):", session.access_token.slice(0, 60));
  console.log("refresh_token (first 30 chars):", session.refresh_token.slice(0, 30));
  console.log("expires_at:", session.expires_at);
  console.log("user.id:", session.user.id);

  // Decode JWT to see issuer
  const [, payload] = session.access_token.split(".");
  const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  console.log("\n=== JWT PAYLOAD ===");
  console.log(JSON.stringify(decoded, null, 2));

  // Encode like SSR does
  const raw = JSON.stringify(session);
  console.log("\n=== RAW SESSION JSON length ===", raw.length);
  const encoded = "base64-" + Buffer.from(raw, "utf8").toString("base64url");
  console.log("Encoded cookie value length:", encoded.length);

  // Round-trip test: decode using SSR's own decoder
  const stripped = encoded.substring("base64-".length);
  const decodedJson = stringFromBase64URL(stripped);
  console.log("Round-trip OK:", decodedJson === raw);

  // Hit our local server with the cookie and see what happens
  const cookieValue = encoded;
  console.log("\n=== Testing cookie with local server ===");
  const res = await fetch("http://localhost:3000/dashboard", {
    headers: { Cookie: `supabase.auth.token=${encodeURIComponent(cookieValue)}` },
    redirect: "manual",
  });
  console.log("Status:", res.status);
  console.log("Location:", res.headers.get("location"));
  console.log("Set-Cookie:", res.headers.get("set-cookie")?.slice(0, 200));

  // Also try directly hitting Supabase's /auth/v1/user with the access_token
  console.log("\n=== Testing access_token directly with Supabase ===");
  const userRes = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
    },
  });
  console.log("Supabase /auth/v1/user status:", userRes.status);
  const userBody = await userRes.text();
  console.log("Body:", userBody.slice(0, 300));

  // Cleanup
  await admin.auth.admin.deleteUser(createData.user!.id);
  console.log("\nUser cleaned up.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
