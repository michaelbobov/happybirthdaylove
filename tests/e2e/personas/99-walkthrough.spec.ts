/**
 * Comprehensive end-to-end walkthrough — sender + recipient + inbox.
 *
 * This spec is independent of the persona seeds. It seeds its own users
 * and bundle so it can run any time the SUPABASE_E2E_SERVICE_ROLE_KEY
 * (or SUPABASE_SERVICE_ROLE_KEY) is configured.
 *
 * What it covers:
 *  1. Anonymous landing
 *  2. Sender sign-in via session injection → dashboard / create / edit / share
 *  3. Anonymous recipient: bundle hub, opens immediate envelope, sees content
 *  4. Recipient signs in → claims bundle → /inbox shows it with progress
 *  5. Recipient visits /collection
 *
 * Screenshots are written under test-results/walkthrough/ for visual review.
 */

import path from "node:path";
import fs from "node:fs/promises";
import { createCipheriv, randomBytes } from "node:crypto";
import dotenv from "dotenv";
import { test, expect, type BrowserContext } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env.test.local" });

const SCREENSHOT_DIR = path.join(__dirname, "..", "..", "..", "test-results", "walkthrough");

// Lazy: created in beforeAll, used everywhere.
let admin: ReturnType<typeof createClient>;
let senderEmail: string;
let recipientEmail: string;
let senderId: string;
let recipientId: string;
let bundleId: string;
let bundleToken: string;
let immediateEnvId: string;
let dateLockedEnvId: string;
let manualEnvId: string;
let senderSession: Session;
let recipientSession: Session;

const SCREEN = (name: string) => path.join(SCREENSHOT_DIR, name);

function encryptPayload(payload: object): string {
  const b64 = process.env.ENVELOPE_ENC_KEY;
  if (!b64) throw new Error("ENVELOPE_ENC_KEY not set");
  const key = Buffer.from(b64, "base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const pt = Buffer.from(JSON.stringify(payload), "utf8");
  const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
  const tag = cipher.getAuthTag();
  return "\\x" + Buffer.concat([iv, tag, ct]).toString("hex");
}

function randomToken() {
  return randomBytes(32).toString("base64url");
}

/**
 * Injects a Supabase session directly into a Playwright browser context as
 * cookies using the exact format produced by @supabase/ssr (base64url-encoded,
 * chunked at 3180 encoded-character boundaries).
 *
 * This bypasses the PKCE handshake that breaks admin-generated magic links
 * in test environments.
 */
async function injectSupabaseSession(context: BrowserContext, session: Session) {
  const STORAGE_KEY = "supabase.auth.token";
  const MAX_CHUNK = 3180; // encodeURIComponent length limit per @supabase/ssr chunker
  const domain = "localhost";

  // @supabase/ssr stores: "base64-" + stringToBase64URL(JSON.stringify(session))
  // Node's Buffer base64url encoding is identical to supabase's custom impl.
  const raw = JSON.stringify(session);
  const encoded = "base64-" + Buffer.from(raw, "utf8").toString("base64url");

  // base64url chars are all URL-safe, so encodeURIComponent(encoded).length === encoded.length
  const cookiesToAdd: Parameters<typeof context.addCookies>[0] = [];

  if (encoded.length <= MAX_CHUNK) {
    cookiesToAdd.push({ name: STORAGE_KEY, value: encoded, domain, path: "/" });
  } else {
    let i = 0;
    let remaining = encoded;
    while (remaining.length > 0) {
      const chunk = remaining.slice(0, MAX_CHUNK);
      cookiesToAdd.push({ name: `${STORAGE_KEY}.${i}`, value: chunk, domain, path: "/" });
      remaining = remaining.slice(MAX_CHUNK);
      i++;
    }
  }

  await context.addCookies(cookiesToAdd);
}

test.describe.configure({ mode: "serial" });

test.describe("Full walkthrough — sender + recipient + inbox", () => {
  test.beforeAll(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey =
      process.env.SUPABASE_E2E_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) {
      throw new Error("Supabase URL or service-role key missing");
    }
    admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

    senderEmail = `wk-sender-${Date.now()}@test.enveloped.dev`;
    recipientEmail = `wk-recip-${Date.now()}@test.enveloped.dev`;

    const { data: senderUser, error: sErr } = await admin.auth.admin.createUser({
      email: senderEmail,
      password: "Walkthrough!Test99",
      email_confirm: true,
    });
    if (sErr) throw sErr;
    senderId = senderUser.user!.id;

    const { data: recipUser, error: rErr } = await admin.auth.admin.createUser({
      email: recipientEmail,
      password: "Walkthrough!Test99",
      email_confirm: true,
    });
    if (rErr) throw rErr;
    recipientId = recipUser.user!.id;

    // Sign in with password (avoids PKCE exchange — no code verifier needed).
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const anonClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: sData, error: sSignInErr } = await anonClient.auth.signInWithPassword({
      email: senderEmail,
      password: "Walkthrough!Test99",
    });
    if (sSignInErr) throw sSignInErr;
    senderSession = sData.session!;

    const { data: rData, error: rSignInErr } = await anonClient.auth.signInWithPassword({
      email: recipientEmail,
      password: "Walkthrough!Test99",
    });
    if (rSignInErr) throw rSignInErr;
    recipientSession = rData.session!;

    bundleToken = randomToken();
    const { data: bundle, error: bErr } = await admin
      .from("bundles")
      .insert({
        sender_id: senderId,
        title: "For when the world feels heavy",
        cover_message:
          "Three little envelopes. Open one whenever you need a hand to hold.",
        recipient_name: "Sam",
        access_token: bundleToken,
        theme_id: "warm-handmade",
      })
      .select("id")
      .single();
    if (bErr) throw bErr;
    bundleId = bundle!.id;

    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: envs, error: eErr } = await admin
      .from("envelopes")
      .insert([
        {
          bundle_id: bundleId,
          order_index: 0,
          title: "Open me first",
          caption: "A hello, before everything else.",
          unlock_type: "immediate",
          envelope_design_id: "kraft-classic",
        },
        {
          bundle_id: bundleId,
          order_index: 1,
          title: "Open on your birthday",
          caption: "Save this one — it grows sweeter waiting.",
          unlock_type: "date",
          unlock_at: future,
          envelope_design_id: "cream-scallop",
        },
        {
          bundle_id: bundleId,
          order_index: 2,
          title: "When the time is right",
          caption: "I'll let you know.",
          unlock_type: "manual",
          envelope_design_id: "sage-botanical",
        },
      ])
      .select("id, unlock_type, order_index");
    if (eErr) throw eErr;

    const byType = (t: string) => envs!.find((e) => e.unlock_type === t)!;
    immediateEnvId = byType("immediate").id;
    dateLockedEnvId = byType("date").id;
    manualEnvId = byType("manual").id;

    // Multiple items in the immediate envelope so the spread view has variety.
    await admin.from("envelope_items").insert([
      {
        envelope_id: immediateEnvId,
        order_index: 0,
        type: "text",
        payload_encrypted: encryptPayload({
          type: "text",
          html: "<p>Sam — I made this for you. Pull a card whenever you need one.</p><p>I love you.</p>",
        }),
        meta_json: {},
      },
      {
        envelope_id: immediateEnvId,
        order_index: 1,
        type: "money_note",
        payload_encrypted: encryptPayload({
          type: "money_note",
          amount: 20,
          currency: "USD",
          note: "Coffee on me. ☕",
        }),
        meta_json: {},
      },
      {
        envelope_id: immediateEnvId,
        order_index: 2,
        type: "giftcard",
        payload_encrypted: encryptPayload({
          type: "giftcard",
          brand: "Spotify",
          code: "DEMO-WALK-1234-XYZ",
          amount: 15,
          currency: "USD",
        }),
        meta_json: { brand: "Spotify" },
      },
    ]);

    // Even the date-locked one should have content so it isn't a "missing items" warning.
    await admin.from("envelope_items").insert({
      envelope_id: dateLockedEnvId,
      order_index: 0,
      type: "text",
      payload_encrypted: encryptPayload({
        type: "text",
        html: "<p>Happy birthday, Sam. ♥</p>",
      }),
      meta_json: {},
    });

    // eslint-disable-next-line no-console
    console.info(`[WALKTHROUGH] Sender:    ${senderEmail}`);
    // eslint-disable-next-line no-console
    console.info(`[WALKTHROUGH] Recipient: ${recipientEmail}`);
    // eslint-disable-next-line no-console
    console.info(`[WALKTHROUGH] Token:     ${bundleToken.slice(0, 12)}…`);
  });

  test.afterAll(async () => {
    if (!admin) return;
    if (bundleId) await admin.from("bundles").delete().eq("id", bundleId);
    for (const id of [senderId, recipientId]) {
      if (id) await admin.auth.admin.deleteUser(id);
    }
  });

  // ──────────────────────────────────────────────────────────────────────
  // 1. Anonymous landing
  // ──────────────────────────────────────────────────────────────────────
  test("01 — anonymous landing renders hero", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Enveloped/i);
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await page.screenshot({ path: SCREEN("01-landing.png"), fullPage: true });
  });

  test("02 — sign-in page renders", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("textbox").first()).toBeVisible();
    await page.screenshot({ path: SCREEN("02-signin.png"), fullPage: true });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 2. Sender flow (signed in)
  // ──────────────────────────────────────────────────────────────────────
  test("03 — sender session injected and lands on dashboard authenticated", async ({ page }) => {
    await injectSupabaseSession(page.context(), senderSession);
    // Diagnostic: dump cookies the context actually has after injection
    const cookies = await page.context().cookies("http://localhost:3000");
    // eslint-disable-next-line no-console
    console.info(
      `[03] cookies in context: ${cookies.map((c) => `${c.name}(${c.value.length}b)`).join(", ")}`,
    );
    await page.goto("/dashboard");
    // Diagnostic: what URL did we end up at?
    // eslint-disable-next-line no-console
    console.info(`[03] after goto URL: ${page.url()}`);
    await expect(page).not.toHaveURL(/sign-in/, { timeout: 10_000 });
    await page.screenshot({ path: SCREEN("03-sender-dashboard.png"), fullPage: true });
    // Save sender storage so subsequent sender tests reuse it
    await page.context().storageState({ path: SCREEN("sender-storage.json") });
  });

  test("04 — sender visits /create page", async ({ page }) => {
    await page.context().addCookies(
      JSON.parse(await fs.readFile(SCREEN("sender-storage.json"), "utf8")).cookies ?? [],
    );
    await page.goto("/create");
    await expect(page).not.toHaveURL(/sign-in/);
    await page.screenshot({ path: SCREEN("04-sender-create.png"), fullPage: true });
  });

  test("05 — sender opens bundle editor with seeded bundle", async ({ page }) => {
    await page.context().addCookies(
      JSON.parse(await fs.readFile(SCREEN("sender-storage.json"), "utf8")).cookies ?? [],
    );
    await page.goto(`/bundle/${bundleId}/edit`);
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.getByRole("heading", { name: /for when the world feels heavy/i })).toBeVisible();
    await page.waitForTimeout(500); // let envelopes render
    await page.screenshot({ path: SCREEN("05-sender-editor.png"), fullPage: true });
  });

  test("06 — sender opens share page", async ({ page }) => {
    await page.context().addCookies(
      JSON.parse(await fs.readFile(SCREEN("sender-storage.json"), "utf8")).cookies ?? [],
    );
    await page.goto(`/bundle/${bundleId}/share`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: SCREEN("06-sender-share.png"), fullPage: true });
  });

  test("07 — sender previews recipient view", async ({ page }) => {
    await page.context().addCookies(
      JSON.parse(await fs.readFile(SCREEN("sender-storage.json"), "utf8")).cookies ?? [],
    );
    await page.goto(`/b/${bundleToken}`);
    await expect(page.getByRole("heading", { name: /for when the world feels heavy/i })).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: SCREEN("07-sender-preview-bundle.png"), fullPage: true });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 3. Recipient flow (anonymous)
  // ──────────────────────────────────────────────────────────────────────
  test("08 — anonymous recipient opens bundle hub", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/b/${bundleToken}`);
    await expect(page.getByRole("heading", { name: /for when the world feels heavy/i })).toBeVisible();
    const tiles = page.locator("[data-env]");
    await expect(tiles).toHaveCount(3);
    await page.waitForTimeout(800);
    await page.screenshot({ path: SCREEN("08-recipient-hub.png"), fullPage: true });
    await ctx.close();
  });

  test("09 — recipient opens immediate envelope and sees decrypted content", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/b/${bundleToken}/e/${immediateEnvId}`);
    // Wait for the reveal call
    await page.waitForResponse(`**/api/reveal/${immediateEnvId}`, { timeout: 15_000 });
    // Wait through the envelope opening animation
    await page.waitForTimeout(2200);
    await page.screenshot({ path: SCREEN("09a-recipient-opening.png"), fullPage: true });
    // Try to advance through items if there's a "Next" / continue affordance
    for (let i = 0; i < 4; i++) {
      const next = page.getByRole("button", { name: /next|continue|done|all together/i }).first();
      if (await next.count()) {
        await next.click().catch(() => {});
        await page.waitForTimeout(700);
      } else {
        break;
      }
    }
    await page.screenshot({ path: SCREEN("09b-recipient-revealed.png"), fullPage: true });

    // Should show one of the items (text body)
    const bodyText = await page.locator("body").innerText();
    expect(
      bodyText.toLowerCase().includes("sam") ||
        bodyText.toLowerCase().includes("coffee") ||
        bodyText.toLowerCase().includes("spotify") ||
        bodyText.toLowerCase().includes("with love"),
    ).toBe(true);
    await ctx.close();
  });

  test("10 — recipient hub now shows opened state", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/b/${bundleToken}`);
    await page.waitForTimeout(800);
    // The "Open me first" tile should now show "Opened" state
    await expect(page.getByText(/opened/i).first()).toBeVisible();
    // Collection link should appear since something was opened
    await expect(page.getByRole("link", { name: /view collection/i })).toBeVisible();
    await page.screenshot({ path: SCREEN("10-recipient-hub-after-open.png"), fullPage: true });
    await ctx.close();
  });

  test("11 — recipient visits the collection page anonymously", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/b/${bundleToken}/collection`);
    await page.waitForTimeout(600);
    await page.screenshot({ path: SCREEN("11-recipient-collection.png"), fullPage: true });
    await ctx.close();
  });

  test("12 — date-locked envelope is gated", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/b/${bundleToken}/e/${dateLockedEnvId}`);
    await page.waitForTimeout(800);
    // Should NOT show the underlying html content
    const body = await page.locator("body").innerText();
    expect(body.toLowerCase()).not.toContain("happy birthday, sam");
    // Should show "Not yet" / locked messaging
    expect(body.toLowerCase()).toMatch(/not yet|opens on|sealed|locked/);
    await page.screenshot({ path: SCREEN("12-recipient-date-locked.png"), fullPage: true });
    await ctx.close();
  });

  test("13 — manual envelope is also gated", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`/b/${bundleToken}/e/${manualEnvId}`);
    await page.waitForTimeout(800);
    const body = await page.locator("body").innerText();
    expect(body.toLowerCase()).toMatch(/sender|not yet|will unlock|locked/);
    await page.screenshot({ path: SCREEN("13-recipient-manual-locked.png"), fullPage: true });
    await ctx.close();
  });

  // ──────────────────────────────────────────────────────────────────────
  // 4. Recipient signs in → claim → inbox
  // ──────────────────────────────────────────────────────────────────────
  test("14 — recipient session injected, then claims bundle", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await injectSupabaseSession(ctx, recipientSession);

    // Now visit the claim page
    await page.goto(`/b/${bundleToken}/claim`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: SCREEN("14a-recipient-claim.png"), fullPage: true });

    const saveBtn = page.getByRole("button", { name: /save to my account/i });
    if (await saveBtn.count()) {
      await saveBtn.click();
      // It pushes to /inbox after success
      await page.waitForURL(/\/inbox/, { timeout: 15_000 });
    }

    await page.waitForTimeout(800);
    await page.screenshot({ path: SCREEN("14b-recipient-inbox.png"), fullPage: true });

    // The bundle should be visible in the inbox
    await expect(page.getByText(/for when the world feels heavy/i)).toBeVisible();

    // Save state for subsequent recipient checks
    await ctx.storageState({ path: SCREEN("recipient-storage.json") });
    await ctx.close();
  });

  test("15 — recipient inbox shows progress and theme name", async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: SCREEN("recipient-storage.json"),
    });
    const page = await ctx.newPage();
    await page.goto("/inbox");
    await expect(page.getByText(/for when the world feels heavy/i)).toBeVisible();
    // We opened 1 of 3, so progress text should reflect that
    const inboxText = await page.locator("body").innerText();
    expect(inboxText).toMatch(/1\s*\/\s*3\s*opened/i);
    await page.screenshot({ path: SCREEN("15-recipient-inbox-progress.png"), fullPage: true });
    await ctx.close();
  });

  test("16 — recipient global /collection lists collected items", async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: SCREEN("recipient-storage.json"),
    });
    const page = await ctx.newPage();
    await page.goto("/collection");
    await page.waitForTimeout(800);
    await page.screenshot({ path: SCREEN("16-recipient-global-collection.png"), fullPage: true });
    await ctx.close();
  });

  test("17 — re-opening an already-opened envelope shows spread view directly", async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: SCREEN("recipient-storage.json"),
    });
    const page = await ctx.newPage();
    await page.goto(`/b/${bundleToken}/e/${immediateEnvId}`);
    await page.waitForResponse(`**/api/reveal/${immediateEnvId}`, { timeout: 15_000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: SCREEN("17-recipient-reopened.png"), fullPage: true });
    await ctx.close();
  });
});
