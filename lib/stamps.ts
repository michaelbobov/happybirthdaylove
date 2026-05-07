/**
 * Stamp library for envelope decoration. Kinds:
 *   - `emoji`: native emoji glyph, renders via SVG <text>.
 *   - `asset`: bundled PNGs from /public/images/stamp{1..n}.png.
 *   - `text`: free-form positioned text on the envelope front.
 *   - `postmark`: round dashed-ring postmark (outer arc text + inner center
 *     text), the same look used on the landing-page collage.
 *
 * Stamps are decorative only — recipients see them on the closed envelope
 * preview. They never appear inside the letter.
 */

export type StampKind = "emoji" | "asset" | "text" | "postmark";

export type EnvelopeStamp = {
  id: string;
  kind: StampKind;
  /** Emoji glyph, text content, or image URL path. */
  value: string;
  /** x/y as percentages (0–100) of envelope width/height. Represents center. */
  x: number;
  y: number;
  /** Size as percentage of the shorter envelope dimension. */
  size: number;
  /** Optional text box width as percentage of envelope width. */
  width?: number;
  /** Optional text box height as percentage of envelope height. */
  height?: number;
  /** Rotation in degrees, unconstrained. */
  rotation: number;
  /** Optional text color for special envelope text placement metadata. */
  color?: string;
  /** Optional font family for text stamps. */
  fontFamily?: string;
  /** For `postmark` kind: curved text along the upper arc. `value` is the inner center text. */
  outerText?: string;
};

/**
 * Curated postmark presets — each is one click to add. Users can also build
 * custom postmarks from the composer.
 */
export type PostmarkPreset = {
  id: string;
  outerText: string;
  innerText: string;
};

export const POSTMARK_PRESETS: PostmarkPreset[] = [
  { id: "kept-safe",     outerText: "ENVELOPED · KEPT SAFE",   innerText: String(new Date().getFullYear()) },
  { id: "with-love",     outerText: "SEALED WITH LOVE",        innerText: "♡" },
  { id: "first-class",   outerText: "FIRST CLASS · POSTAGE",   innerText: "MAIL" },
  { id: "for-you",       outerText: "JUST FOR YOU",            innerText: "★" },
  { id: "handmade",      outerText: "HANDMADE · WITH CARE",    innerText: "♡" },
  { id: "open-when",     outerText: "OPEN WHEN READY",         innerText: "✿" },
];

export const ENVELOPE_FRONT_TEXT_STAMP_ID = "__captionPlacement";
export const DEFAULT_FRONT_TEXT_POSITION = { x: 50, y: 65 };
export const DEFAULT_FRONT_TEXT_SIZE = 22;
export const DEFAULT_FRONT_TEXT_ROTATION = -1.4;
export const DEFAULT_FRONT_TEXT_COLOR = "rgba(40,24,8,0.62)";
export const DEFAULT_FRONT_TEXT_FONT = "var(--font-hand)";

export function getEnvelopeFrontText(title: string, caption: string | null | undefined) {
  return caption?.trim() || title.trim();
}

export type StampAsset = {
  id: string;
  url: string;
  label: string;
};

export const STAMP_ASSETS: StampAsset[] = [
  { id: "stamp1", url: "/images/stamp1.png", label: "Classic stamp" },
  { id: "stamp2", url: "/images/stamp2.png", label: "Kiss mark" },
  { id: "stamp3", url: "/images/stamp3.png", label: "Stamp 3" },
  { id: "stamp4", url: "/images/stamp4.png", label: "Stamp 4" },
  { id: "stamp5", url: "/images/stamp5.png", label: "Stamp 5" },
];

export type StampCategory = {
  id: string;
  label: string;
  emojis: string[];
};

export const STAMP_EMOJI_LIBRARY: StampCategory[] = [
  {
    id: "postal",
    label: "Postal",
    emojis: [
      "💌", "✉️", "📮", "📬", "📫", "📪", "📭", "📨", "📩",
      "📜", "📃", "🖋️", "✒️", "🪶", "🔖", "📌", "📍",
    ],
  },
  {
    id: "love",
    label: "Love",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍",
      "❤️‍🔥", "💕", "💖", "💗", "💘", "💝", "💞", "💓", "💟",
      "🌹", "🌷", "💐", "💋",
    ],
  },
  {
    id: "celebrate",
    label: "Celebrate",
    emojis: [
      "🎉", "🎊", "🎈", "🎂", "🍰", "🧁", "🎁", "🎀",
      "🥂", "🍾", "🥳", "🤩", "👑", "🏆", "🎖️",
      "✨", "🌟", "⭐", "💫", "🪅", "🪩",
    ],
  },
  {
    id: "nature",
    label: "Nature",
    emojis: [
      "🌸", "🌺", "🌻", "🌼", "🪷", "🪻", "🌿", "🍀",
      "🍃", "🍂", "🍁", "🌰", "🍄", "🌵", "🌾",
      "🦋", "🐝", "🐞", "🐚", "🌊",
    ],
  },
  {
    id: "travel",
    label: "Travel",
    emojis: [
      "✈️", "🚀", "🛸", "⛵", "🚢", "🗺️", "🧳", "🎒",
      "📸", "🏝️", "🏖️", "🌍", "🌎", "🌏", "🏕️",
    ],
  },
  {
    id: "sparkle",
    label: "Sparkle",
    emojis: [
      "✨", "🌟", "⭐", "💫", "⚡", "☄️", "🪐", "🌠",
      "💎", "🔆", "🕯️", "🔮", "🌈", "🎐",
    ],
  },
];

export function findAsset(id: string): StampAsset | undefined {
  return STAMP_ASSETS.find((a) => a.id === id);
}
