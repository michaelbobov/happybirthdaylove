import type { EnvelopeDesignId, ThemeId } from "./themes";

export type ItemType = "text" | "image" | "gif" | "giftcard" | "money_note" | "audio";

export type UnlockType = "immediate" | "date" | "passphrase" | "manual";

/** Sensitive payload shapes — what ends up inside `payload_encrypted`. */
export type ItemPayload =
  | { type: "text"; html: string }
  | { type: "image"; storageKey: string; caption?: string }
  | { type: "gif"; url: string; caption?: string }
  | { type: "giftcard"; vendor: string; code: string; note?: string; redeemUrl?: string }
  | { type: "money_note"; amount: number; currency: string; instructions?: string; link?: string }
  | { type: "audio"; storageKey: string; durationSec?: number };

export type ItemMeta = {
  captionHint?: string;
  width?: number;
  height?: number;
  mime?: string;
  giphyId?: string;
  thumbnailUrl?: string;
  vendor?: string;
  /** For money_note: public amount shown on the back of the card (non-sensitive). */
  publicAmount?: { amount: number; currency: string };
};

/** Shape returned to the recipient after a successful reveal. */
export type RevealedItem = {
  id: string;
  type: ItemType;
  orderIndex: number;
  payload: ItemPayload;
  meta: ItemMeta;
  /** Short-lived signed URL for media items. */
  mediaUrl?: string;
};

export type BundleSummary = {
  id: string;
  title: string;
  themeId: ThemeId;
  coverMessage: string | null;
  recipientName: string | null;
  senderId: string;
  claimedByUserId: string | null;
  hasPassphrase: boolean;
  createdAt: string;
};

export type EnvelopePublic = {
  id: string;
  orderIndex: number;
  title: string;
  caption: string | null;
  unlockType: UnlockType;
  unlockAt: string | null;
  envelopeDesignId: EnvelopeDesignId;
  themeOverrideId: ThemeId | null;
  openedAt: string | null;
};
