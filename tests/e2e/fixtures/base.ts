/**
 * Extended Playwright test fixtures shared across all personas.
 *
 * Fixtures provided:
 *   seeds         — parsed .seeds.json written by global-setup
 *   e2eEnabled    — true when Supabase test project is configured
 *   authedPage    — a Page with the sender's session cookies already set
 */

import path from "node:path";
import fs from "node:fs/promises";
import { test as base, expect, type Page } from "@playwright/test";
import type { Seeds } from "../global-setup";

export { expect };

const SEEDS_FILE = path.join(__dirname, ".seeds.json");
const MAGIC_LINK_FILE = path.join(__dirname, ".sender-magic-link.txt");
// Where we store the Playwright storage state (cookies/localStorage) for the sender.
const SENDER_STORAGE_STATE = path.join(__dirname, ".sender-storage.json");

async function loadSeeds(): Promise<Seeds> {
  try {
    return JSON.parse(await fs.readFile(SEEDS_FILE, "utf8"));
  } catch {
    return {
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
  }
}

type Fixtures = {
  seeds: Seeds;
  e2eEnabled: boolean;
  authedPage: Page;
};

export const test = base.extend<Fixtures>({
  seeds: async ({}, use) => {
    use(await loadSeeds());
  },

  e2eEnabled: async ({ seeds }, use) => {
    use(seeds.configured);
  },

  authedPage: async ({ page, seeds }, use) => {
    if (!seeds.configured) {
      await use(page);
      return;
    }

    // Check if we already have a stored session for this run
    const hasStoredState = await fs.access(SENDER_STORAGE_STATE).then(() => true).catch(() => false);

    if (!hasStoredState) {
      // Use the magic link to sign in and save the session
      const magicLink = await fs.readFile(MAGIC_LINK_FILE, "utf8").catch(() => null);
      if (magicLink) {
        await page.goto(magicLink);
        await page.waitForURL(/\/dashboard|\/create|\/$/);
        await page.context().storageState({ path: SENDER_STORAGE_STATE });
      }
    } else {
      // Reuse existing session
      await page.context().addCookies(
        JSON.parse(await fs.readFile(SENDER_STORAGE_STATE, "utf8")).cookies ?? [],
      );
    }

    await use(page);
  },
});
