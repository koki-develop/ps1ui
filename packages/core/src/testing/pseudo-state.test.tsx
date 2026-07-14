// Sanity net for withForcedPseudoState — proves that CDP `CSS.forcePseudoState`
// actually shifts computed styles in the Vitest tester iframe, AND that the
// finally-block release cleans up afterwards. Uses inline CSS so the check
// stays component-agnostic; every *.contrast.test.tsx relies on this working,
// so it's centralized here rather than duplicated per file.
//
// If Blink, Playwright, or the tester-iframe wiring regresses, this fails
// loudly BEFORE the component contrast matrices silently pass with no state
// ever forced.

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { withForcedPseudoState } from "./pseudo-state";

describe("withForcedPseudoState", () => {
  test("forces :hover and releases it after the callback", async () => {
    const screen = await render(
      <>
        <style>
          {`.pseudo-state-probe { color: rgb(0, 0, 0); transition: none; }
            .pseudo-state-probe:hover { color: rgb(255, 0, 0); }`}
        </style>
        <span className="pseudo-state-probe" data-testid="pseudo-state-probe">
          probe
        </span>
      </>,
    );
    const probe = screen.container.querySelector<HTMLElement>('[data-testid="pseudo-state-probe"]');
    if (!probe) throw new Error("probe not found");

    const baseColor = getComputedStyle(probe).color;
    expect(baseColor).toBe("rgb(0, 0, 0)");

    await withForcedPseudoState('[data-testid="pseudo-state-probe"]', ["hover"], async () => {
      expect(getComputedStyle(probe).color).toBe("rgb(255, 0, 0)");
    });

    // finally-block release restores the base color.
    expect(getComputedStyle(probe).color).toBe(baseColor);
  });
});
