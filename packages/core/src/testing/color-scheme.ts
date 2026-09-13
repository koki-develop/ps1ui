import { commands } from "vitest/browser";
import type { ColorSchemeCommands } from "../../vitest.browser-commands";

declare module "vitest/browser" {
  interface BrowserCommands extends ColorSchemeCommands {}
}

/**
 * Turn on Playwright's `prefers-color-scheme` emulation for the current page.
 * Emulation is page-global and Browser Mode shares the page per FILE — keep
 * every color-scheme-emulation test in its own file and always pair with
 * `disableColorSchemeEmulation` (e.g. in `afterEach`) so no other test
 * inherits it.
 */
export async function emulateColorScheme(scheme: "light" | "dark"): Promise<void> {
  await commands.emulateColorScheme(scheme);
}

/** Restore the page's real (non-emulated) color-scheme preference. */
export async function disableColorSchemeEmulation(): Promise<void> {
  await commands.emulateColorScheme(null);
}
