"use client";

import { createContext, useContext, useMemo } from "react";
import type { CSSProperties, ReactNode } from "react";
import { getTheme, type Theme, type ThemeId } from "@/lib/themes";

type ThemeContextValue = {
  theme: Theme;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function themeStyle(theme: Theme): CSSProperties {
  const { colors, radii, timing } = theme.tokens;
  return {
    ["--color-bg" as string]: colors.background,
    ["--color-surface" as string]: colors.surface,
    ["--color-paper" as string]: colors.paper,
    ["--color-ink" as string]: colors.ink,
    ["--color-accent" as string]: colors.accent,
    ["--color-seal" as string]: colors.seal,
    ["--color-muted" as string]: colors.muted,
    ["--color-shadow" as string]: colors.shadow,
    ["--radius-sm" as string]: radii.sm,
    ["--radius-md" as string]: radii.md,
    ["--radius-lg" as string]: radii.lg,
    ["--open-duration" as string]: `${timing.openDuration}s`,
  } as CSSProperties;
}

export function ThemeProvider({
  themeId,
  children,
  as: Tag = "div",
  className,
  style,
}: {
  themeId: ThemeId | string | null | undefined;
  children: ReactNode;
  as?: "div" | "section" | "main";
  className?: string;
  style?: CSSProperties;
}) {
  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const vars = useMemo(() => themeStyle(theme), [theme]);

  return (
    <ThemeContext.Provider value={{ theme }}>
      <Tag
        data-theme={theme.id}
        className={className}
        style={{ ...vars, ...style }}
      >
        {children}
      </Tag>
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx.theme;
}
