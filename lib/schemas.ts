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

const strokeSchema = z.object({
  points: z.array(z.tuple([z.number(), z.number()])).max(4000),
  color: z.string().max(100),
  width: z.number().min(0.1).max(20),
});

const stickerSchema = z.object({
  id: z.string(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  emoji: z.string().min(1).max(16),
  size: z.number().min(12).max(160),
  rotation: z.number().min(-360).max(360),
});

const textBlockSchema = z.object({
  id: z.string(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  text: z.string().max(2000),
  fontFamily: z.string().max(200),
  fontSize: z.number().min(8).max(96),
  color: z.string().max(100),
  bold: z.boolean(),
  italic: z.boolean(),
});

export const itemPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    mode: z.enum(["typed", "positioned", "drawn"]).optional(),
    html: z.string().max(20_000).optional(),
    fontFamily: z.string().max(200).optional(),
    paperStyle: z.string().max(20).optional(),
    blocks: z.array(textBlockSchema).max(50).optional(),
    stickers: z.array(stickerSchema).max(80).optional(),
    strokes: z.array(strokeSchema).max(200).optional(),
  }),
  z.object({
    type: z.literal("image"),
    storageKey: z.string().min(1),
    caption: z.string().max(280).optional(),
    textBlocks: z.array(textBlockSchema).max(12).optional(),
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

export const envelopeStampSchema = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum(["emoji", "asset"]),
  value: z.string().min(1).max(400),
  x: z.number().min(-10).max(110),
  y: z.number().min(-10).max(110),
  size: z.number().min(2).max(40),
  rotation: z.number().min(-720).max(720),
  color: z.string().max(80).optional(),
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
  sealColorOverride: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a hex color like #c06a4a")
    .nullable()
    .optional(),
  stamps: z.array(envelopeStampSchema).max(24).optional(),
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
      filter: z.enum(["none", "warm", "mono", "dreamy", "vivid"]).optional(),
      fit: z.enum(["cover", "contain"]).optional(),
      captionMode: z.enum(["bottom", "onPhoto", "hidden"]).optional(),
      giphyId: z.string().optional(),
      thumbnailUrl: z.string().optional(),
      vendor: z.string().optional(),
      publicAmount: z
        .object({ amount: z.number(), currency: z.string().length(3) })
        .optional(),
      frame: z.enum(["polaroid", "plain", "ticket"]).optional(),
    })
    .default({}),
});

export const updateItemSchema = z.object({
  itemId: z.string().uuid(),
  bundleId: z.string().uuid(),
  payload: itemPayloadSchema,
  meta: addItemSchema.shape.meta,
});

export const updateBundleSchema = z.object({
  id: z.string().uuid(),
  coverMessage: z.string().max(800).optional(),
  recipientName: z.string().max(80).optional(),
  recipientEmail: z.string().email().optional().or(z.literal("")),
  passphrase: z.string().min(3).max(80).optional().or(z.literal("")),
  clearPassphrase: z.boolean().optional(),
});

export const revealRequestSchema = z.object({
  token: z.string().min(20),
  passphrase: z.string().max(120).optional(),
});
