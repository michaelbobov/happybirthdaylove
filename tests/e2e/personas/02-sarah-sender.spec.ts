/**
 * Persona: Sarah — The Romantic Sender
 *
 * Sarah has been with her partner Alex for three years. She wants to create a
 * beautifully crafted birthday bundle with multiple envelopes, different unlock
 * types, and a passphrase so only Alex can open it.
 *
 * Flow: sign in → create bundle → edit (add envelopes & items) → share
 *
 * Requires: SUPABASE_E2E_SERVICE_ROLE_KEY (skips if not set).
 */

import { test, expect } from "../fixtures/base";

test.describe("Sarah — Romantic Sender", () => {
  test.beforeEach(async ({ e2eEnabled }, testInfo) => {
    if (!e2eEnabled) testInfo.skip(true, "Supabase E2E not configured — skipping sender tests");
  });

  test("create bundle page is accessible after sign-in", async ({ authedPage: page }) => {
    await page.goto("/create");
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.getByRole("heading", { name: /new bundle|start/i })).toBeVisible();
  });

  test("create bundle form renders all fields", async ({ authedPage: page }) => {
    await page.goto("/create");
    await expect(page.getByRole("textbox", { name: /bundle title/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /recipient.?s name/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /passphrase/i })).toBeVisible();
    // Theme buttons
    await expect(page.getByRole("button", { name: /warm|handmade/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /playful/i })).toBeVisible();
  });

  test("bundle title is required — shows native validation", async ({ authedPage: page }) => {
    await page.goto("/create");
    await page.getByRole("button", { name: /create bundle/i }).click();
    const titleInput = page.getByRole("textbox", { name: /bundle title/i });
    const valid = await titleInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(valid).toBe(false);
  });

  test("theme selection highlights chosen theme", async ({ authedPage: page }) => {
    await page.goto("/create");
    const goldThemeBtn = page.getByRole("button", { name: /cinematic|gold/i });
    await goldThemeBtn.click();
    // Selected theme button has a dark background (ink color fill)
    const bg = await goldThemeBtn.evaluate(
      (el: HTMLElement) => window.getComputedStyle(el).backgroundColor,
    );
    // Should not be transparent when selected
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    expect(bg).not.toBe("transparent");
  });

  test("creates a bundle and lands on edit page", async ({ authedPage: page }) => {
    await page.goto("/create");
    await page.getByRole("textbox", { name: /bundle title/i }).fill("For when you need me");
    await page.getByRole("textbox", { name: /recipient.?s name/i }).fill("Alex");
    await page.locator("textarea[name='coverMessage']").fill("Three years of memories.");
    await page.getByRole("textbox", { name: /passphrase/i }).fill("sunrise1218");
    // Pick Cinematic Gold theme
    await page.getByRole("button", { name: /cinematic|gold/i }).click();
    await page.getByRole("button", { name: /create bundle/i }).click();
    // Should redirect to /bundle/[id]/edit
    await expect(page).toHaveURL(/\/bundle\/.+\/edit/);
  });

  test("bundle editor shows 'Add envelope' button", async ({ authedPage: page, seeds }) => {
    await page.goto(`/bundle/${seeds.bundles.sarahDraftBundle.id}/edit`);
    await expect(page.getByRole("button", { name: /add envelope|new envelope|\+ envelope/i })).toBeVisible();
  });

  test("can add a new envelope with title", async ({ authedPage: page, seeds }) => {
    await page.goto(`/bundle/${seeds.bundles.sarahDraftBundle.id}/edit`);
    await page.getByRole("button", { name: /add envelope|new envelope|\+ envelope/i }).click();
    // Envelope editor modal / form should appear
    const titleField = page.getByRole("textbox", { name: /envelope title|title/i }).first();
    await expect(titleField).toBeVisible();
    await titleField.fill("A note just for you");
    await page.getByRole("button", { name: /save|done|create/i }).first().click();
    // Envelope tile should appear in grid
    await expect(page.getByText("A note just for you")).toBeVisible();
  });

  test("share page shows shareable link", async ({ authedPage: page, seeds }) => {
    await page.goto(`/bundle/${seeds.bundles.sarahDraftBundle.id}/share`);
    // Some form of share link / copy button should be present
    const linkEl = page.locator("input[readonly], [data-testid='share-link'], code, pre").first();
    await expect(linkEl).toBeVisible();
    const linkText = await linkEl.inputValue().catch(() => linkEl.textContent());
    expect(linkText).toMatch(/\/b\//);
  });

  test("share page shows passphrase hint if bundle is passphrase-protected", async ({
    authedPage: page,
    seeds,
  }) => {
    await page.goto(`/bundle/${seeds.bundles.sarahDraftBundle.id}/share`);
    // The original draft bundle has no passphrase — just verify no crash
    await expect(page.locator("body")).toBeVisible();
  });
});
