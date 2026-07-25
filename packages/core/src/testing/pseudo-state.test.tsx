// Sanity net for withPseudoState — proves that each mechanism (real hover via
// userEvent, a held mouse button via the pointerDown/releasePointer browser
// commands, real DOM focus/blur, real Tab navigation) actually shifts computed
// styles, AND that release restores the base state afterwards. Uses inline CSS
// so the check stays component-agnostic; every *.contrast.test.tsx relies on
// this working, so it's centralized here rather than duplicated per file.
//
// If the userEvent wiring, the pointerDown/releasePointer commands, or the
// tester-iframe setup regresses, this fails loudly BEFORE the component
// contrast matrices silently pass with no state ever actually applied.

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { withPseudoState } from "./pseudo-state";

describe("withPseudoState", () => {
  test("applies :hover and releases it after the callback", async () => {
    // The wrapper's 120 px padding offsets the probe away from the viewport
    // origin. Vitest Browser Mode (Playwright provider) does NOT auto-reset
    // the pointer between tests or on file bootstrap — only keyboard state
    // is reset — and the provider's initial cursor lands at (0, 0), which
    // otherwise overlaps a top-left-rendered probe and matches `:hover` on
    // the very first render (observed on the Playwright Firefox provider;
    // Chromium / WebKit don't reflect the same synchronous hover in
    // getComputedStyle). We deliberately avoid a beforeEach that moves the
    // pointer instead: padding is a property of THIS fixture, while a global
    // pointer move is a side effect on every test in the file. Pointer moves do
    // happen here — `userEvent.hover` in the next test, and the `resetPointer`
    // that both pointer-driven states now run on release — and the
    // focus-visible test below still passes because `establishFocus` verifies
    // the pseudo-class actually matched and re-Tabs if it did not, which also
    // re-asserts keyboard modality. That is what replaced this test's old
    // `retry: 3`; see the note above it. See
    // https://github.com/vitest-dev/vitest/discussions/9878 for upstream
    // context on the non-reset pointer.
    const screen = await render(
      <div style={{ padding: 120 }}>
        <style>
          {`.pseudo-state-probe-hover { color: rgb(0, 0, 0); transition: none; }
            .pseudo-state-probe-hover:hover { color: rgb(255, 0, 0); }`}
        </style>
        <span className="pseudo-state-probe-hover" data-testid="pseudo-state-probe-hover">
          probe
        </span>
      </div>,
    );
    const probe = screen.container.querySelector<HTMLElement>(
      '[data-testid="pseudo-state-probe-hover"]',
    );
    if (!probe) throw new Error("probe not found");

    const baseColor = getComputedStyle(probe).color;
    expect(baseColor).toBe("rgb(0, 0, 0)");

    await withPseudoState('[data-testid="pseudo-state-probe-hover"]', ["hover"], async () => {
      expect(getComputedStyle(probe).color).toBe("rgb(255, 0, 0)");
    });

    // finally-block release restores the base color.
    expect(getComputedStyle(probe).color).toBe(baseColor);
  });

  test("applies :active via a held mouse button and releases it after the callback", async () => {
    const screen = await render(
      <>
        <style>
          {`.pseudo-state-probe-active { color: rgb(0, 0, 0); transition: none; }
            .pseudo-state-probe-active:active { color: rgb(0, 0, 255); }`}
        </style>
        <button className="pseudo-state-probe-active" data-testid="pseudo-state-probe-active">
          probe
        </button>
      </>,
    );
    const probe = screen.container.querySelector<HTMLElement>(
      '[data-testid="pseudo-state-probe-active"]',
    );
    if (!probe) throw new Error("probe not found");

    const baseColor = getComputedStyle(probe).color;
    expect(baseColor).toBe("rgb(0, 0, 0)");

    await withPseudoState('[data-testid="pseudo-state-probe-active"]', ["active"], async () => {
      expect(getComputedStyle(probe).color).toBe("rgb(0, 0, 255)");
    });

    // finally-block release (releasePointer) restores the base color.
    expect(getComputedStyle(probe).color).toBe(baseColor);
  });

  test("applies :focus and releases it after the callback", async () => {
    const screen = await render(
      <>
        <style>
          {`.pseudo-state-probe-focus { color: rgb(0, 0, 0); transition: none; }
            .pseudo-state-probe-focus:focus { color: rgb(0, 128, 0); }`}
        </style>
        <button className="pseudo-state-probe-focus" data-testid="pseudo-state-probe-focus">
          probe
        </button>
      </>,
    );
    const probe = screen.container.querySelector<HTMLElement>(
      '[data-testid="pseudo-state-probe-focus"]',
    );
    if (!probe) throw new Error("probe not found");

    const baseColor = getComputedStyle(probe).color;
    expect(baseColor).toBe("rgb(0, 0, 0)");

    await withPseudoState('[data-testid="pseudo-state-probe-focus"]', ["focus"], async () => {
      expect(getComputedStyle(probe).color).toBe("rgb(0, 128, 0)");
    });

    // finally-block release restores the base color.
    expect(getComputedStyle(probe).color).toBe(baseColor);
  });

  // This test used to carry `retry: 3`, blamed on the Playwright Firefox
  // provider synthesizing a Tab press that lands focus but isn't classified as
  // "keyboard-triggered" by Firefox's `:focus-visible` modality heuristic. That
  // diagnosis was wrong. The real mechanism was measured: `document.hasFocus()`
  // returns false because Vitest's concurrently-running per-file pages steal
  // the window's OS focus from one another, and Firefox refuses to match
  // `:focus` / `:focus-visible` in a page that doesn't own it — `activeElement`
  // still points at the probe throughout, which is exactly what made it look
  // like a modality problem. pseudo-state.ts's `establishFocus` now reclaims OS
  // focus (via the `bringPageToFront` browser command) and verifies the
  // pseudo-class actually matches before returning, so the retry is gone and
  // all four sanity checks are strictly single-shot again.
  test("applies :focus-visible via real Tab navigation and releases it after the callback", async () => {
    const screen = await render(
      <>
        <style>
          {`.pseudo-state-probe-focus-visible { color: rgb(0, 0, 0); transition: none; }
            .pseudo-state-probe-focus-visible:focus-visible { color: rgb(128, 0, 128); }`}
        </style>
        {/* An <input>, not a <button> — macOS Safari's default "Full Keyboard
            Access" setting limits Tab to text boxes and lists, excluding
            buttons/links (see Button.contrast.test.tsx's comment for the
            same limitation, verified empirically to match this Playwright
            WebKit build too). This sanity test only needs to prove the
            Tab-navigation mechanism itself works, so a universally-tabbable
            element keeps it meaningful on every engine. */}
        <input
          className="pseudo-state-probe-focus-visible"
          data-testid="pseudo-state-probe-focus-visible"
        />
      </>,
    );
    const probe = screen.container.querySelector<HTMLElement>(
      '[data-testid="pseudo-state-probe-focus-visible"]',
    );
    if (!probe) throw new Error("probe not found");

    const baseColor = getComputedStyle(probe).color;
    expect(baseColor).toBe("rgb(0, 0, 0)");

    await withPseudoState(
      '[data-testid="pseudo-state-probe-focus-visible"]',
      ["focus-visible"],
      async () => {
        // Proves the activeElement check inside the "focus-visible" handler
        // actually landed on the target, not just that some element got focus.
        expect(document.activeElement).toBe(probe);
        expect(getComputedStyle(probe).color).toBe("rgb(128, 0, 128)");
      },
    );

    // finally-block release restores the base color.
    expect(getComputedStyle(probe).color).toBe(baseColor);
  });
});
