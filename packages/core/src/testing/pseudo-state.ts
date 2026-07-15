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
  "focus-visible": {
    apply: async (el, selector) => {
      await userEvent.tab();
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
