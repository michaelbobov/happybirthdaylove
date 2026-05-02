/**
 * Stamp library for envelope decoration. Two kinds:
 *   - `emoji`: native emoji glyph, renders via SVG <text>.
 *   - `asset`: bundled PNG from /public/images/stamps/ (plus the one-off
 *     /public/images/stamp1.png), renders via SVG <image>.
 *
 * Stamps are decorative only — recipients see them on the closed envelope
 * preview. They never appear inside the letter.
 */

export type StampKind = "emoji" | "asset";

export type EnvelopeStamp = {
  id: string;
  kind: StampKind;
  /** Emoji glyph (for kind="emoji") or image URL path (for kind="asset"). */
  value: string;
  /** x/y as percentages (0–100) of envelope width/height. Represents center. */
  x: number;
  y: number;
  /** Size as percentage of the shorter envelope dimension. */
  size: number;
  /** Rotation in degrees, unconstrained. */
  rotation: number;
  /** Optional text color for special envelope text placement metadata. */
  color?: string;
};

export type StampAsset = {
  id: string;
  url: string;
  label: string;
};

export const STAMP_ASSETS: StampAsset[] = [
  { id: "stamp1", url: "/images/stamp1.png", label: "Classic stamp" },
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
