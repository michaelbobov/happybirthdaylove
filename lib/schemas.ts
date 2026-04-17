import { z } from "zod";

export const themeIdSchema = z.enum([
  "warm-handmade",
  "modern-playful",
  "cinematic-gold",
  "minimalist-ink",
]);

export const envelopeDesignIdSchema = z.enum([
  "kraft-classic",
  "cream-scallop",
  "sage-botanical",
  "blush-linen",
  "playful-candy",
  "playful-confetti",
  "playful-holo",
  "cinematic-midnight",
  "cinematic-foil",
  "cinematic-velvet",
  "ink-minimal",
  "ink-deboss",
  "ink-grid",
]);

export const unlockTypeSchema = z.enum(["immediate", "date", "passphrase", "manual"]);

export const itemPayloadSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), html: z.string().max(20_000) }),
  z.object({
    type: z.literal("image"),
    storageKey: z.string().min(1),
    caption: z.string().max(280).optional(),
  }),
  z.object({
    type: z.literal("gif"),
    url: z.string().url(),
    caption: z.string().max(280).optional(),
  }),
  z.object({
    type: z.literal("giftcard"),
    vendor: z.string().min(1).max(80),
    code: z.string().min(1).max(200),
    note: z.string().max(400).optional(),
    redeemUrl: z.string().url().optional(),
  }),
  z.object({
    type: z.literal("money_note"),
    amount: z.number().positive(),
    currency: z.string().length(3),
    instructions: z.string().max(400).optional(),
    link: z.string().url().optional(),
  }),
  z.object({
    type: z.literal("audio"),
    storageKey: z.string().min(1),
    durationSec: z.number().nonnegative().optional(),
  }),
]);

export const createBundleSchema = z.object({
  title: z.string().min(1).max(140),
  coverMessage: z.string().max(800).optional(),
  recipientName: z.string().max(80).optional(),
  recipientEmail: z.string().email().optional().or(z.literal("")),
  themeId: themeIdSchema.default("warm-handmade"),
  passphrase: z.string().min(3).max(80).optional().or(z.literal("")),
});

export const upsertEnvelopeSchema = z.object({
  id: z.string().uuid().optional(),
  bundleId: z.string().uuid(),
  title: z.string().min(1).max(140),
  caption: z.string().max(400).optional(),
  orderIndex: z.number().int().min(0),
  unlockType: unlockTypeSchema,
  unlockAt: z.string().datetime().nullable().optional(),
  envelopeDesignId: envelopeDesignIdSchema,
  themeOverrideId: themeIdSchema.nullable().optional(),
});

export const addItemSchema = z.object({
  envelopeId: z.string().uuid(),
  orderIndex: z.number().int().min(0),
  payload: itemPayloadSchema,
  meta: z
    .object({
      captionHint: z.string().max(280).optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      mime: z.string().optional(),
      giphyId: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      vendor: z.string().optional(),
      publicAmount: z
        .object({ amount: z.number(), currency: z.string().length(3) })
        .optional(),
    })
    .default({}),
});

export const revealRequestSchema = z.object({
  token: z.string().min(20),
  passphrase: z.string().max(120).optional(),
});
