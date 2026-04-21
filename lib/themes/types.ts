export type ThemeId = "warm-handmade" | "modern-playful" | "cinematic-gold" | "minimalist-ink";

export type ThemeTokens = {
  /** CSS custom properties applied to the theme root. */
  colors: {
    background: string;
    surface: string;
    paper: string;
    ink: string;
    accent: string;
    seal: string;
    muted: string;
    shadow: string;
  };
  radii: {
    sm: string;
    md: string;
    lg: string;
  };
  fonts: {
    display: string;
    body: string;
    hand: string;
  };
  /** GSAP timing preferences used by the opener. */
  timing: {
    openDuration: number;
    easing: string;
    paperRustle: number;
  };
  texture: {
    paperUrl: string;
    grain: "soft" | "heavy" | "none";
  };
};

export type EnvelopeDesignId =
  | "kraft-classic"
  | "cream-scallop"
  | "sage-botanical"
  | "blush-linen"
  | "playful-candy"
  | "playful-confetti"
  | "playful-holo"
  | "cinematic-midnight"
  | "cinematic-foil"
  | "cinematic-velvet"
  | "ink-minimal"
  | "ink-deboss"
  | "ink-grid";

export type EnvelopeDesign = {
  id: EnvelopeDesignId;
  themeId: ThemeId;
  name: string;
  /** Paper fill color for the envelope body. */
  paper: string;
  /** Flap can be slightly darker/lighter than paper. */
  flap: string;
  /** Seal color. */
  seal: string;
  /** Optional accent line / pattern stroke. */
  accent?: string;
  /** Optional SVG pattern id to render inside body (see EnvelopePatterns). */
  pattern?: "none" | "dots" | "linen" | "botanical" | "confetti" | "stripes" | "grid" | "foil";
  /** A short label visible to the giver. */
  description: string;
  /**
   * Optional photorealistic envelope PNG (flap closed, transparent background).
   * When set, the opener renders <PhotoEnvelope /> instead of the SVG fallback.
   * The PNG should be near-neutral; `paper` and `seal` colors tint it at runtime
   * via mix-blend-mode so the same asset skins every color.
   */
  imageUrl?: string;
  /** Natural pixel dimensions of imageUrl. Required for correct aspect ratio
   *  and clip-path alignment when the container size differs from the image. */
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  /** If true, renders the PNG with no color tint — shows the photo as-is. */
  noTint?: boolean;
  /**
   * Envelope outer silhouette in the PNG, as fractions of image dimensions.
   * Needed when the asset has transparent padding around the envelope.
   */
  bounds?: {
    top: number;
    left: number;
    right: number;
    bottom: number;
    apexY?: number;
  };
  /**
   * Exact vertices of the flap polygon in PNG-fraction coordinates [x, y].
   * List them in order around the flap perimeter (the first and last points
   * sit on the envelope's top edge). Supports any number of points — use this
   * when the flap isn't a simple triangle (e.g. has small diagonal corners).
   * If omitted, falls back to a plain triangle derived from bounds.
   */
  flapPoints?: Array<[number, number]>;
};

export type Theme = {
  id: ThemeId;
  name: string;
  description: string;
  tokens: ThemeTokens;
  designs: EnvelopeDesign[];
};
