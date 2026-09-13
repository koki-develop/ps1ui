import type { PS1RootTheme } from "@ps1ui/core";
import { THEME_STORAGE_KEY } from "./site";

// Shared by SiteHeader's theme <Select> script. BaseLayout's inline head
// script needs the same light/dark/system → color-scheme mapping, but it
// can't import this module (an `is:inline` script can't use ES imports) —
// it repeats the mapping inline instead, self-contained by necessity.

/** Maps a theme to the `<meta name="color-scheme">` content the UA reads
 * before any CSS arrives. "system" defers to the OS via both keywords. */
export function themeColorScheme(theme: PS1RootTheme): "light" | "dark" | "light dark" {
  return theme === "system" ? "light dark" : theme;
}

export function isPS1RootTheme(value: string): value is PS1RootTheme {
  return value === "light" || value === "dark" || value === "system";
}

// Applies a theme choice: the `data-ps1ui-theme` attribute on <html>, the
// `color-scheme` meta tag, and persists the choice to localStorage.
export function applyTheme(theme: PS1RootTheme): void {
  document.documentElement.dataset.ps1uiTheme = theme;
  document
    .querySelector('meta[name="color-scheme"]')
    ?.setAttribute("content", themeColorScheme(theme));
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage may be unavailable (private browsing, blocked site data) — the
    // theme still applies for this page view, it just won't persist.
  }
}
