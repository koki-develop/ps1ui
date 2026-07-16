// Side-effect-only: registers the `declare module "vitest/node"` augmentation that
// adds `page`/`iframe`/`context` to `BrowserCommandContext` below. Without this import,
// `tsc` doesn't know those properties exist on `context` (this only surfaced once this
// file was pulled into the type-checked program — see the `PseudoStateCommands` note).
import type {} from "@vitest/browser-playwright";
import type { BrowserCommand, BrowserCommandContext } from "vitest/node";

function assertPlaywrightProvider(context: BrowserCommandContext, fnName: string): void {
  if (context.provider.name !== "playwright") {
    throw new Error(`${fnName} requires the playwright provider, got: ${context.provider.name}`);
  }
}

// `:active` is the only pseudo-state that needs a held mouse button, and the
// client-side `userEvent` API has no down/up primitive — only the raw Playwright
// `Page` (reachable exclusively from a server-side browser command) exposes
// `mouse.down`/`mouse.up`. `context.iframe` maps selector coordinates from the
// Vitest tester iframe to the top-level page, so `.hover()` positions the real
// mouse cursor before the button is pressed at that same position.
export const pointerDown: BrowserCommand<[selector: string]> = async (context, selector) => {
  assertPlaywrightProvider(context, "pointerDown");
  await context.iframe.locator(selector).hover();
  await context.page.mouse.down();
};

export const pointerUp: BrowserCommand<[]> = async (context) => {
  assertPlaywrightProvider(context, "pointerUp");
  await context.page.mouse.up();
};

// forced-colors can't be entered from inside the page — only Playwright's
// `page.emulateMedia` flips it. `null` (not `"none"`) on release restores the
// real environment default. Engine support varies; callers feature-detect via
// matchMedia after enabling (see src/testing/forced-colors.ts).
export const emulateForcedColors: BrowserCommand<[active: boolean]> = async (context, active) => {
  assertPlaywrightProvider(context, "emulateForcedColors");
  await context.page.emulateMedia({ forcedColors: active ? "active" : null });
};

// `commands.pointerDown(selector)` on the client calls this WITHOUT the leading
// `context` argument (Vitest's RPC layer injects that server-side) — strip it here so
// the derived client type matches what's actually callable.
type ClientCommand<T> = T extends (context: never, ...payload: infer P) => infer R
  ? (...payload: P) => R
  : never;

// Lets `pseudo-state.ts`'s client-side `declare module "vitest/browser"` augmentation
// derive its shape from these functions instead of hand-duplicating signatures — a
// signature drift here (e.g. a changed parameter) now fails `tsc` on the client side
// too. The `import type` this enables also pulls this file into `tsc`'s program: it
// otherwise sits outside `tsconfig.json`'s `include: ["src"]` and is never type-checked
// (Vitest loads config/command files via vite-node, transpile-only, no type-checking).
export type PseudoStateCommands = {
  pointerDown: ClientCommand<typeof pointerDown>;
  releasePointer: ClientCommand<typeof pointerUp>;
};

// Same derivation pattern as PseudoStateCommands, consumed by
// src/testing/forced-colors.ts's `declare module "vitest/browser"`.
export type ForcedColorsCommands = {
  emulateForcedColors: ClientCommand<typeof emulateForcedColors>;
};
