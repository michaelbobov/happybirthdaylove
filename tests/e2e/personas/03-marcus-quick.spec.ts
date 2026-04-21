/**
 * Persona: Marcus — The Busy Friend
 *
 * Marcus just wants to send a quick "Happy Birthday!" without fuss. He picks the
 * Modern Playful theme, skips every optional field, creates one envelope with a
 * text note, and sends the link via text message.
 *
 * Validates: minimal required flow, immediate-unlock path, mobile viewport.
 *
 * Requires: SUPABASE_E2E_SERVICE_ROLE_KEY (skips if not set).
 */

import { test, expect } from "../fixtures/base";

test.describe("Marcus — Quick Sender", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14-ish

  test.beforeEach(async ({ e2eEnabled }, testInfo) => {
    if (!e2eEnabled) testInfo.skip(true, "Supabase E2E not configured");
  });

  test("create form works with only title filled in", async ({ authedPage: page }) => {
    await page.goto("/create");
    // Only required field: title
    await page.getByRole("textbox", { name: /bundle title/i }).fill("Happy Birthday! 🎉");
    await page.getByRole("button", { name: /modern|playful/i }).click();
    await page.getByRole("button", { name: /create bundle/i }).click();
    await expect(page).toHaveURL(/\/bundle\/.+\/edit/);
  });

  test("envelope with immediate unlock shows 'Tap to open' on recipient hub", async ({
    page,
    seeds,
  }) => {
    // Use the pre-seeded Jordan bundle which has an immediate envelope
    await page.goto(`/b/${seeds.bundles.jordanBundle.token}`);
    await expect(page.getByText(/tap to open/i)).toBeVisible();
  });

  test("bundle hub renders on mobile viewport", async ({ page, seeds }) => {
    await page.goto(`/b/${seeds.bundles.jordanBundle.token}`);
    // All envelope tiles should be visible without horizontal scroll
    const grid = page.locator(".grid, [class*='grid']").first();
    await expect(grid).toBeVisible();
    // No horizontal overflow
    const overflowing = await grid.evaluate((el: HTMLElement) => el.scrollWidth > el.clientWidth);
    expect(overflowing).toBe(false);
  });

  test("create page is usable on mobile without overflow", async ({ authedPage: page }) => {
    await page.goto("/create");
    const body = page.locator("body");
    const overflowing = await body.evaluate((el: HTMLElement) => el.scrollWidth > el.clientWidth);
    expect(overflowing).toBe(false);
  });
});
