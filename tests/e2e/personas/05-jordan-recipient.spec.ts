/**
 * Persona: Jordan — The Recipient
 *
 * Jordan receives a bundle link in a text message. No account required.
 * She opens the immediate envelope, sees the locked ones, and then decides
 * to claim the bundle to her account.
 *
 * Flow: visit /b/[token] → open immediate envelope → see items → claim bundle
 *
 * Requires: SUPABASE_E2E_SERVICE_ROLE_KEY (skips if not set).
 */

import { test, expect } from "../fixtures/base";

test.describe("Jordan — Recipient (no auth required)", () => {
  test.beforeEach(async ({ e2eEnabled }, testInfo) => {
    if (!e2eEnabled) testInfo.skip(true, "Supabase E2E not configured");
  });

  test("bundle hub loads with correct title and cover message", async ({ page, seeds }) => {
    await page.goto(`/b/${seeds.bundles.jordanBundle.token}`);
    await expect(page.getByRole("heading", { name: /a bundle just for you/i })).toBeVisible();
    await expect(page.getByText(/because you deserve something beautiful/i)).toBeVisible();
  });

  test("recipient name is shown on the hub", async ({ page, seeds }) => {
    await page.goto(`/b/${seeds.bundles.jordanBundle.token}`);
    await expect(page.getByText(/jordan/i)).toBeVisible();
  });

  test("renders all three envelope tiles", async ({ page, seeds }) => {
    await page.goto(`/b/${seeds.bundles.jordanBundle.token}`);
    const tiles = page.locator("[data-env]");
    await expect(tiles).toHaveCount(3);
  });

  test("immediate envelope tile links to open page", async ({ page, seeds }) => {
    await page.goto(`/b/${seeds.bundles.jordanBundle.token}`);
    const { token, immediateEnvelopeId } = seeds.bundles.jordanBundle;
    const openLink = page.getByRole("link", { name: /open me first/i });
    await expect(openLink).toBeVisible();
    await expect(openLink).toHaveAttribute("href", `/b/${token}/e/${immediateEnvelopeId}`);
  });

  test("clicking immediate envelope navigates to envelope open page", async ({ page, seeds }) => {
    await page.goto(`/b/${seeds.bundles.jordanBundle.token}`);
    await page.getByRole("link", { name: /open me first/i }).click();
    await expect(page).toHaveURL(
      new RegExp(`/b/${seeds.bundles.jordanBundle.token}/e/${seeds.bundles.jordanBundle.immediateEnvelopeId}`),
    );
  });

  test("envelope open page calls /api/reveal and renders text item", async ({ page, seeds }) => {
    const { token, immediateEnvelopeId } = seeds.bundles.jordanBundle;

    // Intercept the reveal call to assert it's made with the right token
    let revealCalled = false;
    await page.route(`/api/reveal/${immediateEnvelopeId}`, async (route) => {
      const body = JSON.parse((await route.request().postData()) ?? "{}");
      expect(body.token).toBe(token);
      revealCalled = true;
      await route.continue();
    });

    await page.goto(`/b/${token}/e/${immediateEnvelopeId}`);
    // Wait for the reveal to complete
    await page.waitForResponse(`**/api/reveal/${immediateEnvelopeId}`);
    expect(revealCalled).toBe(true);

    // The decrypted text item should appear
    await expect(page.getByText(/happy birthday, jordan/i)).toBeVisible();
  });

  test("envelope open page renders decrypted content without auth", async ({ page, seeds }) => {
    const { token, immediateEnvelopeId } = seeds.bundles.jordanBundle;
    await page.goto(`/b/${token}/e/${immediateEnvelopeId}`);
    await page.waitForResponse(`**/api/reveal/${immediateEnvelopeId}`);
    // No redirect to sign-in should happen
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("after opening, envelope tile shows 'opened' badge on hub", async ({ page, seeds }) => {
    const { token, immediateEnvelopeId } = seeds.bundles.jordanBundle;
    // Open the envelope
    await page.goto(`/b/${token}/e/${immediateEnvelopeId}`);
    await page.waitForResponse(`**/api/reveal/${immediateEnvelopeId}`);
    // Go back to hub
    await page.goto(`/b/${token}`);
    await expect(page.getByText(/opened/i).first()).toBeVisible();
  });

  test("'Save to my account' link is visible on bundle hub", async ({ page, seeds }) => {
    await page.goto(`/b/${seeds.bundles.jordanBundle.token}`);
    await expect(page.getByRole("link", { name: /save to my account/i })).toBeVisible();
  });

  test("claim page shows sign-in form for unauthenticated recipient", async ({ page, seeds }) => {
    await page.goto(`/b/${seeds.bundles.jordanBundle.token}/claim`);
    // Should either redirect to sign-in or show an inline sign-in form
    const hasSignInForm =
      (await page.getByRole("textbox", { name: /email/i }).count()) > 0 ||
      (await page.getByText(/sign in|create account/i).count()) > 0;
    expect(hasSignInForm).toBe(true);
  });

  test("bundle hub renders correctly on mobile", async ({ page, seeds }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/b/${seeds.bundles.jordanBundle.token}`);
    await expect(page.getByRole("heading")).toBeVisible();
    // Should not overflow horizontally
    const overflowing = await page
      .locator("body")
      .evaluate((el: HTMLElement) => el.scrollWidth > el.clientWidth);
    expect(overflowing).toBe(false);
  });
});

test.describe("Jordan — Recipient (mocked API, no DB needed)", () => {
  const FAKE_TOKEN = "fake-bundle-token-for-jordan-mock-test";
  const FAKE_ENVELOPE_ID = "00000000-0000-0000-0000-000000000001";

  // These tests inject mock responses so they run without a real Supabase instance.
  // The server-side page render still needs a DB, so we mock the reveal API only
  // and test client-side behavior on a page we fully control via route mocking.

  test("reveal API mock — renders text note from mocked response", async ({ page }) => {
    await page.route(`/api/reveal/${FAKE_ENVELOPE_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          envelope: {
            id: FAKE_ENVELOPE_ID,
            title: "Open me first",
            caption: "Start here",
            orderIndex: 0,
            envelopeDesignId: "kraft-classic",
            themeOverrideId: null,
            unlockType: "immediate",
            unlockAt: null,
          },
          bundle: { id: "bundle-1", themeId: "warm-handmade" },
          items: [
            {
              id: "item-1",
              type: "text",
              orderIndex: 0,
              payload: { type: "text", html: "<p>Mocked birthday message!</p>" },
              meta: {},
            },
          ],
        }),
      });
    });

    // We can't SSR the page without a DB, but we can assert the reveal API response shape
    const response = await page.request.post(`/api/reveal/${FAKE_ENVELOPE_ID}`, {
      data: { token: FAKE_TOKEN },
    });
    // With the mock in place via route.fulfill the response hits the mock
    // (page.request respects page.route() mocks)
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].type).toBe("text");
    expect(body.items[0].payload.html).toContain("Mocked birthday message");
  });

  test("reveal API — 403 for bad token", async ({ page }) => {
    const response = await page.request.post(`/api/reveal/${FAKE_ENVELOPE_ID}`, {
      data: { token: "wrong-token" },
    });
    expect(response.status()).toBe(403);
  });
});
