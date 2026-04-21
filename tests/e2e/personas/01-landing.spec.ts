/**
 * Persona: Anonymous visitor — no account, no bundle link.
 * These tests require no Supabase connection and always run.
 */

import { test, expect } from "../fixtures/base";

test.describe("Landing page", () => {
  test("loads with correct page title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Enveloped/i);
  });

  test("shows hero headline and CTA", async ({ page }) => {
    await page.goto("/");
    // Headline should be visible
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });

  test("sign-in link is present in navbar", async ({ page }) => {
    await page.goto("/");
    const signinLink = page.getByRole("link", { name: /sign.?in|get started|log.?in/i });
    await expect(signinLink.first()).toBeVisible();
  });

  test("navigates to /sign-in when clicking sign-in link", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /sign.?in|get started|log.?in/i }).first().click();
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe("Sign-in page", () => {
  test("renders email input and submit button", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /continue|send|sign in|magic/i })).toBeVisible();
  });

  test("shows validation feedback for empty submit", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("button", { name: /continue|send|sign in|magic/i }).click();
    // Browser native validation or custom message
    const emailInput = page.getByRole("textbox", { name: /email/i });
    const validationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage,
    );
    expect(validationMessage.length).toBeGreaterThan(0);
  });

  test("shows error for invalid email format", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByRole("textbox", { name: /email/i }).fill("not-an-email");
    await page.getByRole("button", { name: /continue|send|sign in|magic/i }).click();
    const emailInput = page.getByRole("textbox", { name: /email/i });
    const valid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(valid).toBe(false);
  });
});

test.describe("Protected route redirects (no auth)", () => {
  for (const route of ["/create", "/dashboard", "/inbox"]) {
    test(`${route} redirects unauthenticated user to /sign-in`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/sign-in/);
    });
  }
});

test.describe("404 handling", () => {
  test("unknown route shows not-found page", async ({ page }) => {
    const resp = await page.goto("/this-path-does-not-exist-xyz");
    expect(resp?.status()).toBe(404);
  });

  test("bundle with invalid token shows not-found", async ({ page }) => {
    const resp = await page.goto("/b/totally-fake-token-that-does-not-exist");
    expect(resp?.status()).toBe(404);
  });
});
