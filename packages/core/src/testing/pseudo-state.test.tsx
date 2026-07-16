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

import { beforeEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { withPseudoState } from "./pseudo-state";

describe("withPseudoState", () => {
  // Vitest Browser Mode (Playwright provider) does NOT auto-reset the pointer
  // position between tests or on file bootstrap — only keyboard state is
  // reset. The provider's initial cursor lands at (0, 0), which overlaps
  // freshly-rendered probes at the viewport's top-left and matches `:hover`
  // before any user action fires. Retiring the pointer off the body via
  // `unhover(document.body)` before each test defuses this. Firefox is the
  // engine that consistently trips the failure — see
  // https://github.com/vitest-dev/vitest/discussions/9878 for the same
  // pattern documented upstream.
  beforeEach(async () => {
    await userEvent.unhover(document.body);
  });

  test("applies :hover and releases it after the callback", async () => {
    const screen = await render(
      <>
        <style>
          {`.pseudo-state-probe-hover { color: rgb(0, 0, 0); transition: none; }
            .pseudo-state-probe-hover:hover { color: rgb(255, 0, 0); }`}
        </style>
        <span className="pseudo-state-probe-hover" data-testid="pseudo-state-probe-hover">
          probe
        </span>
      </>,
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
