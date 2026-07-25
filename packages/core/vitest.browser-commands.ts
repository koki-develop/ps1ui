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

// Where to park the cursor when no viewport size is reported (a persistent
// context sized to the window). Playwright dispatches `mouse.move` at the raw
// coordinate without clamping it to the viewport, which is fine here — landing
// outside the viewport is just as "off the fixture" as landing in its corner —
// but it does mean this constant must stay at least as large as any viewport
// the suite runs at, or the cursor could park ON content.
const PARKING_FALLBACK = { width: 1280, height: 1024 };

// Playwright's mouse is one physical cursor per page and NOTHING resets it
// between tests — Vitest resets keyboard state only, and `userEvent.unhover`
// dispatches the leave events without reliably moving the cursor off the
// target. `pointerDown` must park the real cursor ON its target in order to
// press there, so with no explicit reset it stays there for the REST OF THE
// FILE and every later capture meant to show a resting state silently renders
// `:hover` instead. Measured, not theorised: regenerating Button's
// `secondary-default` baseline in isolation yields the resting fg-subtle
// border, while the committed CI baseline (captured after the primary row's
// hover/active tests) shows the primary-green HOVER border.
//
// The far corner of the viewport is the cheapest spot guaranteed to be clear of
// the top-left-rendered fixtures.
//
// This is a move, never a click. Whether a bare move can still nudge Firefox's
// `:focus-visible` modality heuristic is not something we rely on either way:
// `establishFocus` verifies the pseudo-class actually matches and retries if it
// does not, so a lost modality race costs an extra Tab rather than a wrong
// assertion. See pseudo-state.test.tsx, whose focus-visible sanity check runs
// last — after both pointer-driven tests have parked the cursor — precisely so
// that ordering stays covered.
export const resetPointer: BrowserCommand<[]> = async (context) => {
  assertPlaywrightProvider(context, "resetPointer");
  const { width, height } = context.page.viewportSize() ?? PARKING_FALLBACK;
  await context.page.mouse.move(width - 1, height - 1);
};

// Firefox ties `:focus` / `:focus-visible` MATCHING to the page owning real OS
// focus — `document.activeElement` pointing at the element is not enough, and
// `document.hasFocus()` is what tells the two apart. Vitest runs test FILES
// concurrently as separate pages in one browser instance, so a sibling file
// bootstrapping steals the window's focus at an arbitrary moment and every
// focus-dependent style read in this page silently returns the RESTING colours
// instead. Chromium and WebKit keep matching either way, which is why this only
// ever surfaced on Firefox — and why it was previously misfiled as Firefox's
// `:focus-visible` modality heuristic mis-classifying a synthesized Tab (see
// pseudo-state.test.tsx). Only Playwright's `Page` can hand focus back;
// `bringToFront()` has no in-page equivalent.
export const bringPageToFront: BrowserCommand<[]> = async (context) => {
  assertPlaywrightProvider(context, "bringPageToFront");
  await context.page.bringToFront();
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
  bringPageToFront: ClientCommand<typeof bringPageToFront>;
  resetPointer: ClientCommand<typeof resetPointer>;
};

// Same derivation pattern as PseudoStateCommands, consumed by
// src/testing/forced-colors.ts's `declare module "vitest/browser"`.
export type ForcedColorsCommands = {
  emulateForcedColors: ClientCommand<typeof emulateForcedColors>;
};
