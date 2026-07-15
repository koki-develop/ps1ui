import { commands, userEvent } from "vitest/browser";
import type { PseudoStateCommands } from "../../vitest.browser-commands";
import { nextFrame } from "./settle";

declare module "vitest/browser" {
  interface BrowserCommands extends PseudoStateCommands {}
}

// Chromium DevTools Protocol supports many more (target, checked, indeterminate, ...),
// but this ships the ones needed for interactive-state a11y regression tests.
// `:focus-within` is deliberately NOT included — it matches when a *descendant* of the
// target has focus, which this helper (given only a single `selector`) can't express;
// `.focus()` on the target itself only satisfies `:focus-within` when the target is
// natively focusable, silently no-op-ing otherwise. Add it back with a proper
// descendant-selector parameter if a real caller needs it.
export type PseudoClass = "hover" | "active" | "focus" | "focus-visible";

type StateHandler = {
  apply(el: HTMLElement, selector: string): Promise<void>;
  release(el: HTMLElement): Promise<void>;
};

// A genuine mousedown+mouseup on the same target fires a real `click` — for an
// `<a href>` (e.g. Anchor) that would navigate the tester iframe away mid-suite.
// Suppressing just the default action doesn't affect `:active` matching, which
// tracks button-down state, not the click's outcome.
const suppressClick = (e: Event) => e.preventDefault();

const HANDLERS: Record<PseudoClass, StateHandler> = {
  hover: {
    apply: async (el) => userEvent.hover(el),
    release: async (el) => userEvent.unhover(el),
  },
  // `:active` needs a genuinely held mouse button, which has no client-side
  // `userEvent` equivalent — only the raw Playwright `Page` (reachable only
  // from a server-side browser command, see vitest.browser-commands.ts)
  // exposes `mouse.down`/`mouse.up`. Each side manages its own cleanup on
  // failure so a thrown `pointerDown`/`releasePointer` can never leave
  // `suppressClick` permanently attached.
  active: {
    apply: async (el, selector) => {
      el.addEventListener("click", suppressClick);
      try {
        await commands.pointerDown(selector);
      } catch (error) {
        el.removeEventListener("click", suppressClick);
        throw error;
      }
    },
    release: async (el) => {
      try {
        await commands.releasePointer();
      } finally {
        el.removeEventListener("click", suppressClick);
      }
    },
  },
  focus: {
    apply: async (el) => el.focus(),
    release: async (el) => el.blur(),
  },
  // `:focus-visible` matching depends on the browser's own "was this focus
  // triggered by keyboard" heuristic — real Tab navigation is the only way to
  // trigger it authentically across engines. `selector` must resolve to the
  // first (or only) tabbable element in the rendered tree; this is verified
  // (not assumed) below, so a violated assumption fails the test loudly
  // instead of silently asserting against the wrong — or no — element.
  //
  // We deliberately use `userEvent.keyboard("{Tab}")` — NOT `userEvent.tab()`.
  // Both route to the Playwright provider, but `__vitest_tab` calls
  // `page.keyboard.press("Tab")` against the TOP-LEVEL page without first
  // establishing iframe focus ownership. Chromium walks focus into the child
  // frame anyway on Tab, but Firefox does not, so the very first `tab()` in
  // a fresh tester iframe (nothing yet focused inside it) never reaches any
  // element — the activeElement check below then throws. `__vitest_keyboard`
  // unconditionally runs a `focusIframe()` step first (calls `window.focus()`
  // inside the iframe when nothing is focused there), which fixes Firefox
  // without changing Chromium/WebKit behavior. See
  // @vitest/browser-playwright@4.1.10 packages/browser-playwright/src/commands/{tab,keyboard}.ts.
  //
  // TODO(upstream): file an issue at https://github.com/vitest-dev/vitest to
  // add the same `focusIframe()` bootstrap to `__vitest_tab`, then revert this
  // to `userEvent.tab()` once a fixed release lands. When filing, replace this
  // line with `TODO(upstream: vitest-dev/vitest#NNNN)` so the tracker stays
  // pinned to the fix.
  "focus-visible": {
    apply: async (el, selector) => {
      await userEvent.keyboard("{Tab}");
      if (document.activeElement !== el) {
        (document.activeElement as HTMLElement | null)?.blur();
        throw new Error(
          `:focus-visible target was not the first tabbable element: expected ${selector} to receive focus after Tab`,
        );
      }
      // See src/testing/settle.ts — closes the gap between Tab landing focus
      // and Firefox's style recalc for the new :focus-visible match actually
      // being reflected in getComputedStyle.
      await nextFrame();
    },
    release: async (el) => el.blur(),
  },
};

/**
 * Run `fn` while the element matched by `selector` genuinely has the given
 * pseudo-classes active — via real hover, real keyboard-driven focus, or (for
 * `:active`) a held mouse button — rather than forcing them through devtools.
 * Every mechanism here is Playwright's standard cross-browser automation API
 * (not devtools), designed to behave the same across engines — though
 * `vitest.config.ts`'s `instances` currently only runs Chromium in CI, so
 * cross-engine parity isn't continuously verified here. States are applied in
 * order; only states that actually finished applying are released, in reverse
 * order, so a state that never fully applied is never wrongly "cleaned up",
 * and a failure in one release doesn't skip releasing the rest.
 */
export async function withPseudoState(
  selector: string,
  states: readonly PseudoClass[],
  fn: () => Promise<void>,
): Promise<void> {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`pseudo-state target not found: ${selector}`);

  const applied: PseudoClass[] = [];
  let hasPrimaryError = false;
  let primaryError: unknown;
  try {
    for (const state of states) {
      await HANDLERS[state].apply(el, selector);
      applied.push(state);
    }
    await fn();
  } catch (error) {
    hasPrimaryError = true;
    primaryError = error;
  }

  const releaseErrors: unknown[] = [];
  for (const state of applied.reverse()) {
    try {
      await HANDLERS[state].release(el);
    } catch (error) {
      releaseErrors.push(error);
    }
  }

  if (hasPrimaryError) throw primaryError;
  if (releaseErrors.length === 1) throw releaseErrors[0];
  if (releaseErrors.length > 1) {
    throw new AggregateError(
      releaseErrors,
      `${releaseErrors.length} pseudo-state release calls failed`,
    );
  }
}

/**
 * State-name-driven wrapper around `withPseudoState` for VRT tests that iterate
 * a mixed matrix of "static" states (e.g. "default", "disabled" — just render
 * variants) and pseudo-class states ("hover", "focus-visible", "active"). Pass
 * the arbitrary state string and the whitelist of names that should be applied
 * as pseudo-classes; anything not in the whitelist runs `fn` with no state
 * applied. Centralizes the "empty pseudo array is a no-op" contract that VRT
 * callers otherwise re-derive per file.
 */
export async function withPseudoStateFor(
  selector: string,
  state: string,
  pseudoStates: readonly PseudoClass[],
  fn: () => Promise<void>,
): Promise<void> {
  const applied: readonly PseudoClass[] = pseudoStates.includes(state as PseudoClass)
    ? [state as PseudoClass]
    : [];
  await withPseudoState(selector, applied, fn);
}
