// Contrast regression net for interactive states. Unlike Button.test.tsx (semantic
// a11y only, no CSS loaded), this file imports the real component CSS and uses CDP
// `CSS.forcePseudoState` to put the button into :hover / :active / :focus-visible
// so axe's color-contrast rule sees the resolved colors of those transient states.
// The sanity check that forcePseudoState actually shifts styles lives once in
// src/testing/pseudo-state.test.tsx.

import "../../styles/styles.css";

import { describe, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { withForcedPseudoState } from "../../testing/pseudo-state";
import { Button, type ButtonVariant } from "./Button";

const VARIANTS = ["primary", "secondary"] as const satisfies readonly ButtonVariant[];
const STATES = ["default", "hover", "active", "focus-visible"] as const;

const CASES = VARIANTS.flatMap((variant) => STATES.map((state) => ({ variant, state })));

describe("Button contrast", () => {
  test.for(CASES)(
    "variant=$variant / state=$state passes WCAG contrast",
    async ({ variant, state }) => {
      const screen = await render(
        <div style={{ background: "var(--ps1ui-color-bg)", padding: 20 }}>
          <Button variant={variant} data-testid="ctr-btn" style={{ transition: "none" }}>
            The quick brown fox jumps over the lazy dog
          </Button>
        </div>,
      );
      if (state === "default") {
        await expectNoAxeViolations(screen.container);
        return;
      }
      await withForcedPseudoState('[data-testid="ctr-btn"]', [state], async () => {
        await expectNoAxeViolations(screen.container);
      });
    },
  );
});
