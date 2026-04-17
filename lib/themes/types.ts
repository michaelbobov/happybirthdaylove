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
};

export type Theme = {
  id: ThemeId;
  name: string;
  description: string;
  tokens: ThemeTokens;
  designs: EnvelopeDesign[];
};
