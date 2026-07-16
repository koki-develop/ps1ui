import { commands } from "vitest/browser";
import type { ForcedColorsCommands } from "../../vitest.browser-commands";

declare module "vitest/browser" {
  interface BrowserCommands extends ForcedColorsCommands {}
}

/**
 * Turn on Playwright's forced-colors emulation for the current page and report
 * whether it actually took effect (engine support varies — callers `ctx.skip`
 * on `false` instead of asserting against styles that never switched).
 * Emulation is page-global and Browser Mode shares the page per FILE — keep
 * every forced-colors test in its own file and always pair with
 * `disableForcedColors` (e.g. in `afterEach`) so no other test inherits it.
 */
export async function enableForcedColors(): Promise<boolean> {
  await commands.emulateForcedColors(true);
  return window.matchMedia("(forced-colors: active)").matches;
}

/** Restore the page's real (non-emulated) forced-colors environment. */
export async function disableForcedColors(): Promise<void> {
  await commands.emulateForcedColors(false);
}
