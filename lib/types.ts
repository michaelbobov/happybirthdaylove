import type { EnvelopeDesignId, ThemeId } from "./themes";
import type { EnvelopeStamp } from "./stamps";

export type ItemType = "text" | "image" | "gif" | "giftcard" | "money_note" | "audio";

export type UnlockType = "immediate" | "date" | "passphrase" | "manual";

export type Stroke = {
  /** [x, y] points as percentages (0-100) of canvas dimensions. */
  points: Array<[number, number]>;
  color: string;
  width: number;
};

export type TextBlock = {
  id: string;
  x: number;       // % of canvas width
  y: number;       // % of canvas height
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
};

export type Sticker = {
  id: string;
  x: number;       // % of canvas width
  y: number;       // % of canvas height
  emoji: string;
  size: number;    // px
  rotation: number;
};

/** Sensitive payload shapes — what ends up inside `payload_encrypted`. */
export type ItemPayload =
  | { type: "text"; mode?: "typed"; html: string; fontFamily?: string; paperStyle?: string }
  | { type: "text"; mode: "positioned"; blocks: TextBlock[]; stickers?: Sticker[]; paperStyle?: string }
  | { type: "text"; mode: "drawn"; strokes: Stroke[]; paperStyle?: string }
  | { type: "image"; storageKey: string; caption?: string; textBlocks?: TextBlock[] }
  | { type: "gif"; url: string; caption?: string }
  | { type: "giftcard"; vendor: string; code: string; note?: string; redeemUrl?: string }
  | { type: "money_note"; amount: number; currency: string; instructions?: string; link?: string }
  | { type: "audio"; storageKey: string; durationSec?: number };

export type ItemMeta = {
  captionHint?: string;
  width?: number;
  height?: number;
  mime?: string;
  filter?: "none" | "warm" | "mono" | "dreamy" | "vivid";
  fit?: "cover" | "contain";
  captionMode?: "bottom" | "onPhoto" | "hidden";
  giphyId?: string;
  thumbnailUrl?: string;
  vendor?: string;
  /** For money_note: public amount shown on the back of the card (non-sensitive). */
  publicAmount?: { amount: number; currency: string };
  /** Visual frame for image payloads — e.g. "ticket" wraps the photo in a perforated ticket stub. */
  frame?: "polaroid" | "plain" | "ticket";
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
  /** Overrides the design's default seal color, hex. Null = use design default. */
  sealColorOverride: string | null;
  stamps: EnvelopeStamp[];
  openedAt: string | null;
  /** Unencrypted item type hints — used for content preview chips in the inbox. */
  contentTypes: string[];
};
