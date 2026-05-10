/**
 * Image reveal — no placeholder images
 *
 * Verifies that when a recipient opens an envelope containing an image item:
 *   1. The reveal API returns a valid signed URL (not empty/undefined).
 *   2. The <img> rendered in the ItemViewer loads without error (naturalWidth > 0).
 *   3. On a second visit the spread view still shows the real image, not a placeholder.
 *   4. The collection view also loads the image without placeholder.
 *
 * Requires: SUPABASE_E2E_SERVICE_ROLE_KEY (skips if not set).
 */

import { test, expect } from "../fixtures/base";

test.describe("Image reveal — real photos, no placeholders", () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ e2eEnabled }, testInfo) => {
    if (!e2eEnabled) testInfo.skip(true, "Supabase E2E not configured");
  });

  test("reveal API returns a non-empty signed URL for the image item", async ({ page, seeds }) => {
    const { token, imageEnvelopeId } = seeds.bundles.jordanBundle;

    const res = await page.request.post(`/api/reveal/${imageEnvelopeId}`, {
      data: { token },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    const imageItem = body.items.find((i: { type: string }) => i.type === "image");
    expect(imageItem, "no image item in reveal response").toBeTruthy();
    expect(imageItem.mediaUrl, "mediaUrl must be a non-empty string").toBeTruthy();
    expect(typeof imageItem.mediaUrl).toBe("string");
    expect(imageItem.mediaUrl.length).toBeGreaterThan(0);
  });

  test("image loads (naturalWidth > 0) in the ItemViewer on first open", async ({ page, seeds }) => {
    const { token, imageEnvelopeId } = seeds.bundles.jordanBundle;

    // Capture the signed URL via route interception.
    let capturedMediaUrl = "";
    await page.route(`**/api/reveal/${imageEnvelopeId}`, async (route) => {
      const res = await route.fetch();
      const body = await res.json();
      const imgItem = body.items?.find((i: { type: string }) => i.type === "image");
      if (imgItem?.mediaUrl) capturedMediaUrl = imgItem.mediaUrl;
      await route.fulfill({ response: res, body: JSON.stringify(body) });
    });

    await page.goto(`/b/${token}/e/${imageEnvelopeId}`);

    // Wait for the Polaroid to appear — the envelope auto-opens and ItemViewer mounts.
    await page.waitForSelector(".inline-block.bg-white", { timeout: 60_000 });

    // Poll until the image inside the Polaroid has fully decoded (naturalWidth > 0).
    const loaded = await page.waitForFunction(
      () => {
        const imgs = Array.from(document.querySelectorAll(".inline-block.bg-white img"));
        return imgs.some((el) => (el as HTMLImageElement).naturalWidth > 0);
      },
      { timeout: 15_000 },
    ).then(() => true).catch(() => false);
    expect(loaded).toBe(true);
    expect(capturedMediaUrl).toBeTruthy();
  });

  test("image still visible on second visit (spread view, no placeholder)", async ({ page, seeds }) => {
    const { token, imageEnvelopeId } = seeds.bundles.jordanBundle;

    // First visit — wait for ItemViewer (proves reveal completed and opened_at was set).
    await page.goto(`/b/${token}/e/${imageEnvelopeId}`);
    await page.waitForSelector(".inline-block.bg-white", { timeout: 60_000 });

    // Second visit — opened_at is now set so it goes straight to spread view.
    await page.goto(`/b/${token}/e/${imageEnvelopeId}`);
    // Spread renders item cards the same way — wait for the Polaroid.
    await page.waitForSelector(".inline-block.bg-white", { timeout: 30_000 });

    // No emoji placeholder fallback.
    expect(await page.locator("text=🖼").count()).toBe(0);

    // Poll until the image inside the Polaroid has decoded.
    const loaded = await page.waitForFunction(
      () => {
        const imgs = Array.from(document.querySelectorAll(".inline-block.bg-white img"));
        return imgs.some((el) => (el as HTMLImageElement).naturalWidth > 0);
      },
      { timeout: 15_000 },
    ).then(() => true).catch(() => false);
    expect(loaded).toBe(true);
  });

  test("collection view shows real image, not placeholder", async ({ page, seeds }) => {
    const { token, imageEnvelopeId } = seeds.bundles.jordanBundle;

    // Open the envelope first so opened_at is set (collection only shows opened envelopes).
    await page.goto(`/b/${token}/e/${imageEnvelopeId}`);
    await page.waitForSelector(".inline-block.bg-white", { timeout: 60_000 });

    // Now visit the collection.
    await page.goto(`/b/${token}/collection`);
    // Wait for photo grid — collection fetches client-side, grid appears after load.
    await page.waitForSelector("[style*='aspect-ratio']", { timeout: 30_000 });

    // No emoji placeholder fallback.
    expect(await page.locator("text=🖼").count()).toBe(0);

    // At least one <img> from storage (not a local /images/ asset) should have loaded.
    const loaded = await page.waitForFunction(
      () => {
        const imgs = Array.from(document.querySelectorAll("img"));
        return imgs.some(
          (el) =>
            el.src &&
            !el.src.includes("/images/") &&
            !el.src.startsWith("http://localhost") &&
            (el as HTMLImageElement).naturalWidth > 0,
        );
      },
      { timeout: 15_000 },
    ).then(() => true).catch(() => false);
    expect(loaded).toBe(true);
  });

  test("collection signed URLs refresh on tab re-focus (no stale placeholders)", async ({
    page,
    seeds,
  }) => {
    const { token, imageEnvelopeId } = seeds.bundles.jordanBundle;

    // Open the envelope first so collection has something to show.
    await page.goto(`/b/${token}/e/${imageEnvelopeId}`);
    await page.waitForSelector(".inline-block.bg-white", { timeout: 60_000 });

    await page.goto(`/b/${token}/collection`);
    await page.waitForSelector("[style*='aspect-ratio']", { timeout: 30_000 });

    // Simulate tab going away and coming back — should trigger a re-fetch.
    let refetchCount = 0;
    page.on("response", (res) => {
      if (res.url().includes("/api/collection/")) refetchCount++;
    });

    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { value: "hidden", writable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { value: "visible", writable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await page.waitForResponse("**/api/collection/**", { timeout: 60_000 });
    expect(refetchCount).toBeGreaterThanOrEqual(1);
  });
});
