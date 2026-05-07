# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: personas\99-walkthrough.spec.ts >> Full walkthrough — sender + recipient + inbox >> 03 — sender session injected and lands on dashboard authenticated
- Location: tests\e2e\personas\99-walkthrough.spec.ts:298:7

# Error details

```
Error: expect(page).not.toHaveURL(expected) failed

Expected pattern: not /sign-in/
Received string: "http://localhost:3000/sign-in"
Timeout: 10000ms

Call log:
  - Expect "not toHaveURL" with timeout 10000ms
    14 × unexpected value "http://localhost:3000/sign-in"

```

# Test source

```ts
  210 |     manualEnvId = byType("manual").id;
  211 | 
  212 |     // Multiple items in the immediate envelope so the spread view has variety.
  213 |     await admin.from("envelope_items").insert([
  214 |       {
  215 |         envelope_id: immediateEnvId,
  216 |         order_index: 0,
  217 |         type: "text",
  218 |         payload_encrypted: encryptPayload({
  219 |           type: "text",
  220 |           html: "<p>Sam — I made this for you. Pull a card whenever you need one.</p><p>I love you.</p>",
  221 |         }),
  222 |         meta_json: {},
  223 |       },
  224 |       {
  225 |         envelope_id: immediateEnvId,
  226 |         order_index: 1,
  227 |         type: "money_note",
  228 |         payload_encrypted: encryptPayload({
  229 |           type: "money_note",
  230 |           amount: 20,
  231 |           currency: "USD",
  232 |           note: "Coffee on me. ☕",
  233 |         }),
  234 |         meta_json: {},
  235 |       },
  236 |       {
  237 |         envelope_id: immediateEnvId,
  238 |         order_index: 2,
  239 |         type: "giftcard",
  240 |         payload_encrypted: encryptPayload({
  241 |           type: "giftcard",
  242 |           brand: "Spotify",
  243 |           code: "DEMO-WALK-1234-XYZ",
  244 |           amount: 15,
  245 |           currency: "USD",
  246 |         }),
  247 |         meta_json: { brand: "Spotify" },
  248 |       },
  249 |     ]);
  250 | 
  251 |     // Even the date-locked one should have content so it isn't a "missing items" warning.
  252 |     await admin.from("envelope_items").insert({
  253 |       envelope_id: dateLockedEnvId,
  254 |       order_index: 0,
  255 |       type: "text",
  256 |       payload_encrypted: encryptPayload({
  257 |         type: "text",
  258 |         html: "<p>Happy birthday, Sam. ♥</p>",
  259 |       }),
  260 |       meta_json: {},
  261 |     });
  262 | 
  263 |     // eslint-disable-next-line no-console
  264 |     console.info(`[WALKTHROUGH] Sender:    ${senderEmail}`);
  265 |     // eslint-disable-next-line no-console
  266 |     console.info(`[WALKTHROUGH] Recipient: ${recipientEmail}`);
  267 |     // eslint-disable-next-line no-console
  268 |     console.info(`[WALKTHROUGH] Token:     ${bundleToken.slice(0, 12)}…`);
  269 |   });
  270 | 
  271 |   test.afterAll(async () => {
  272 |     if (!admin) return;
  273 |     if (bundleId) await admin.from("bundles").delete().eq("id", bundleId);
  274 |     for (const id of [senderId, recipientId]) {
  275 |       if (id) await admin.auth.admin.deleteUser(id);
  276 |     }
  277 |   });
  278 | 
  279 |   // ──────────────────────────────────────────────────────────────────────
  280 |   // 1. Anonymous landing
  281 |   // ──────────────────────────────────────────────────────────────────────
  282 |   test("01 — anonymous landing renders hero", async ({ page }) => {
  283 |     await page.goto("/");
  284 |     await expect(page).toHaveTitle(/Enveloped/i);
  285 |     await expect(page.locator("h1, h2").first()).toBeVisible();
  286 |     await page.screenshot({ path: SCREEN("01-landing.png"), fullPage: true });
  287 |   });
  288 | 
  289 |   test("02 — sign-in page renders", async ({ page }) => {
  290 |     await page.goto("/sign-in");
  291 |     await expect(page.getByRole("textbox").first()).toBeVisible();
  292 |     await page.screenshot({ path: SCREEN("02-signin.png"), fullPage: true });
  293 |   });
  294 | 
  295 |   // ──────────────────────────────────────────────────────────────────────
  296 |   // 2. Sender flow (signed in)
  297 |   // ──────────────────────────────────────────────────────────────────────
  298 |   test("03 — sender session injected and lands on dashboard authenticated", async ({ page }) => {
  299 |     await injectSupabaseSession(page.context(), senderSession);
  300 |     // Diagnostic: dump cookies the context actually has after injection
  301 |     const cookies = await page.context().cookies("http://localhost:3000");
  302 |     // eslint-disable-next-line no-console
  303 |     console.info(
  304 |       `[03] cookies in context: ${cookies.map((c) => `${c.name}(${c.value.length}b)`).join(", ")}`,
  305 |     );
  306 |     await page.goto("/dashboard");
  307 |     // Diagnostic: what URL did we end up at?
  308 |     // eslint-disable-next-line no-console
  309 |     console.info(`[03] after goto URL: ${page.url()}`);
> 310 |     await expect(page).not.toHaveURL(/sign-in/, { timeout: 10_000 });
      |                            ^ Error: expect(page).not.toHaveURL(expected) failed
  311 |     await page.screenshot({ path: SCREEN("03-sender-dashboard.png"), fullPage: true });
  312 |     // Save sender storage so subsequent sender tests reuse it
  313 |     await page.context().storageState({ path: SCREEN("sender-storage.json") });
  314 |   });
  315 | 
  316 |   test("04 — sender visits /create page", async ({ page }) => {
  317 |     await page.context().addCookies(
  318 |       JSON.parse(await fs.readFile(SCREEN("sender-storage.json"), "utf8")).cookies ?? [],
  319 |     );
  320 |     await page.goto("/create");
  321 |     await expect(page).not.toHaveURL(/sign-in/);
  322 |     await page.screenshot({ path: SCREEN("04-sender-create.png"), fullPage: true });
  323 |   });
  324 | 
  325 |   test("05 — sender opens bundle editor with seeded bundle", async ({ page }) => {
  326 |     await page.context().addCookies(
  327 |       JSON.parse(await fs.readFile(SCREEN("sender-storage.json"), "utf8")).cookies ?? [],
  328 |     );
  329 |     await page.goto(`/bundle/${bundleId}/edit`);
  330 |     await expect(page).not.toHaveURL(/sign-in/);
  331 |     await expect(page.getByRole("heading", { name: /for when the world feels heavy/i })).toBeVisible();
  332 |     await page.waitForTimeout(500); // let envelopes render
  333 |     await page.screenshot({ path: SCREEN("05-sender-editor.png"), fullPage: true });
  334 |   });
  335 | 
  336 |   test("06 — sender opens share page", async ({ page }) => {
  337 |     await page.context().addCookies(
  338 |       JSON.parse(await fs.readFile(SCREEN("sender-storage.json"), "utf8")).cookies ?? [],
  339 |     );
  340 |     await page.goto(`/bundle/${bundleId}/share`);
  341 |     await page.waitForTimeout(300);
  342 |     await page.screenshot({ path: SCREEN("06-sender-share.png"), fullPage: true });
  343 |   });
  344 | 
  345 |   test("07 — sender previews recipient view", async ({ page }) => {
  346 |     await page.context().addCookies(
  347 |       JSON.parse(await fs.readFile(SCREEN("sender-storage.json"), "utf8")).cookies ?? [],
  348 |     );
  349 |     await page.goto(`/b/${bundleToken}`);
  350 |     await expect(page.getByRole("heading", { name: /for when the world feels heavy/i })).toBeVisible();
  351 |     await page.waitForTimeout(800);
  352 |     await page.screenshot({ path: SCREEN("07-sender-preview-bundle.png"), fullPage: true });
  353 |   });
  354 | 
  355 |   // ──────────────────────────────────────────────────────────────────────
  356 |   // 3. Recipient flow (anonymous)
  357 |   // ──────────────────────────────────────────────────────────────────────
  358 |   test("08 — anonymous recipient opens bundle hub", async ({ browser }) => {
  359 |     const ctx = await browser.newContext();
  360 |     const page = await ctx.newPage();
  361 |     await page.goto(`/b/${bundleToken}`);
  362 |     await expect(page.getByRole("heading", { name: /for when the world feels heavy/i })).toBeVisible();
  363 |     const tiles = page.locator("[data-env]");
  364 |     await expect(tiles).toHaveCount(3);
  365 |     await page.waitForTimeout(800);
  366 |     await page.screenshot({ path: SCREEN("08-recipient-hub.png"), fullPage: true });
  367 |     await ctx.close();
  368 |   });
  369 | 
  370 |   test("09 — recipient opens immediate envelope and sees decrypted content", async ({ browser }) => {
  371 |     const ctx = await browser.newContext();
  372 |     const page = await ctx.newPage();
  373 |     await page.goto(`/b/${bundleToken}/e/${immediateEnvId}`);
  374 |     // Wait for the reveal call
  375 |     await page.waitForResponse(`**/api/reveal/${immediateEnvId}`, { timeout: 15_000 });
  376 |     // Wait through the envelope opening animation
  377 |     await page.waitForTimeout(2200);
  378 |     await page.screenshot({ path: SCREEN("09a-recipient-opening.png"), fullPage: true });
  379 |     // Try to advance through items if there's a "Next" / continue affordance
  380 |     for (let i = 0; i < 4; i++) {
  381 |       const next = page.getByRole("button", { name: /next|continue|done|all together/i }).first();
  382 |       if (await next.count()) {
  383 |         await next.click().catch(() => {});
  384 |         await page.waitForTimeout(700);
  385 |       } else {
  386 |         break;
  387 |       }
  388 |     }
  389 |     await page.screenshot({ path: SCREEN("09b-recipient-revealed.png"), fullPage: true });
  390 | 
  391 |     // Should show one of the items (text body)
  392 |     const bodyText = await page.locator("body").innerText();
  393 |     expect(
  394 |       bodyText.toLowerCase().includes("sam") ||
  395 |         bodyText.toLowerCase().includes("coffee") ||
  396 |         bodyText.toLowerCase().includes("spotify") ||
  397 |         bodyText.toLowerCase().includes("with love"),
  398 |     ).toBe(true);
  399 |     await ctx.close();
  400 |   });
  401 | 
  402 |   test("10 — recipient hub now shows opened state", async ({ browser }) => {
  403 |     const ctx = await browser.newContext();
  404 |     const page = await ctx.newPage();
  405 |     await page.goto(`/b/${bundleToken}`);
  406 |     await page.waitForTimeout(800);
  407 |     // The "Open me first" tile should now show "Opened" state
  408 |     await expect(page.getByText(/opened/i).first()).toBeVisible();
  409 |     // Collection link should appear since something was opened
  410 |     await expect(page.getByRole("link", { name: /view collection/i })).toBeVisible();
```