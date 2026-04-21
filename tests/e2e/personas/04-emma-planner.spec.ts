/**
 * Persona: Emma — The Planner
 *
 * Emma creates bundles months in advance. She sets date-locked envelopes and
 * expects the UI to show accurate countdown labels and prevent premature opening.
 *
 * Key assertions:
 *   - Date-locked envelopes show "Opens in Xd Yh" on the bundle hub
 *   - Clicking a locked tile does nothing (no navigation)
 *   - The reveal API returns 423 + error reason "locked_until" before unlock time
 *
 * Requires: SUPABASE_E2E_SERVICE_ROLE_KEY (skips if not set).
 */

import { test, expect } from "../fixtures/base";

test.describe("Emma — The Planner (date-locked envelopes)", () => {
  test.beforeEach(async ({ e2eEnabled }, testInfo) => {
    if (!e2eEnabled) testInfo.skip(true, "Supabase E2E not configured");
  });

  test("bundle hub shows countdown for future-dated envelope", async ({ page, seeds }) => {
    await page.goto(`/b/${seeds.bundles.jordanBundle.token}`);
    // The seeded bundle has one date-locked envelope ~60 days out
    await expect(page.getByText(/opens in/i)).toBeVisible();
  });

  test("date-locked envelope tile is not a link", async ({ page, seeds }) => {
    await page.goto(`/b/${seeds.bundles.jordanBundle.token}`);
    // The date-locked tile is wrapped in a div (no pointer events), not an <a> tag
    const countdownTile = page.locator("[data-env]").filter({ hasText: /opens in/i });
    await expect(countdownTile).toBeVisible();
    // Its ancestor should NOT be an <a> tag (locked = non-navigable div)
    const isLink = await countdownTile.evaluate((el) => {
      let node: Element | null = el;
      while (node) {
        if (node.tagName === "A") return true;
        node = node.parentElement;
      }
      return false;
    });
    expect(isLink).toBe(false);
  });

  test("reveal API returns 423 locked_until for future-dated envelope", async ({
    page,
    seeds,
  }) => {
    const { dateLocked } = seeds.bundles.jordanBundle;
    const response = await page.request.post(`/api/reveal/${dateLocked.id}`, {
      data: { token: seeds.bundles.jordanBundle.token },
    });
    expect(response.status()).toBe(423);
    const body = await response.json();
    expect(body.error).toBe("locked_until");
    // Should include the unlock date
    expect(body.unlockAt).toBeTruthy();
    expect(new Date(body.unlockAt).getTime()).toBeGreaterThan(Date.now());
  });

  test("countdown label format is human readable (days + hours)", async ({ page, seeds }) => {
    await page.goto(`/b/${seeds.bundles.jordanBundle.token}`);
    // e.g. "Opens in 59d 23h" — the seeded envelope unlocks in ~60 days
    const countdownText = await page.getByText(/opens in \d+d \d+h/i).textContent();
    expect(countdownText).toMatch(/\d+d \d+h/);
  });

  test("manual-locked envelope shows 'Waiting on sender'", async ({ page, seeds }) => {
    await page.goto(`/b/${seeds.bundles.jordanBundle.token}`);
    await expect(page.getByText(/waiting on sender/i)).toBeVisible();
  });

  test("reveal API returns 423 manual_locked for manual envelope", async ({ page, seeds }) => {
    const response = await page.request.post(
      `/api/reveal/${seeds.bundles.jordanBundle.manualEnvelopeId}`,
      { data: { token: seeds.bundles.jordanBundle.token } },
    );
    expect(response.status()).toBe(423);
    const body = await response.json();
    expect(body.error).toBe("manual_locked");
  });
});
