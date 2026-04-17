import type { EnvelopeDesign, EnvelopeDesignId, Theme, ThemeId } from "./types";
import { warmHandmade } from "./warm-handmade";
import { modernPlayful } from "./modern-playful";
import { cinematicGold } from "./cinematic-gold";
import { minimalistInk } from "./minimalist-ink";

export const themes: Record<ThemeId, Theme> = {
  "warm-handmade": warmHandmade,
  "modern-playful": modernPlayful,
  "cinematic-gold": cinematicGold,
  "minimalist-ink": minimalistInk,
};

export const themeList: Theme[] = [warmHandmade, modernPlayful, cinematicGold, minimalistInk];

export const defaultThemeId: ThemeId = "warm-handmade";

export function getTheme(id: ThemeId | string | null | undefined): Theme {
  if (!id) return themes[defaultThemeId];
  return themes[id as ThemeId] ?? themes[defaultThemeId];
}

export function getDesign(designId: EnvelopeDesignId | string | null | undefined): EnvelopeDesign {
  if (!designId) return warmHandmade.designs[0];
  for (const theme of themeList) {
    const match = theme.designs.find((d) => d.id === designId);
    if (match) return match;
  }
  return warmHandmade.designs[0];
}

export function designsFor(themeId: ThemeId): EnvelopeDesign[] {
  return themes[themeId]?.designs ?? [];
}

export type { Theme, ThemeId, ThemeTokens, EnvelopeDesign, EnvelopeDesignId } from "./types";
