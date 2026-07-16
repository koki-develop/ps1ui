// Contrast regression net for interactive states. Unlike Button.test.tsx (semantic
// a11y only, no CSS loaded), this file imports the real component CSS and puts the
// button into :hover / :active / :focus-visible via real userEvent hover, a held
// mouse button, and real Tab-key focus (see src/testing/pseudo-state.ts) so axe's
// color-contrast rule sees the resolved colors of those transient states. The
// sanity check that withPseudoState actually shifts styles lives once in
// src/testing/pseudo-state.test.tsx.

import "../../styles/styles.css";

import { describe, test } from "vitest";
import { render } from "vitest-browser-react";
import { server } from "vitest/browser";
import { expectNoAxeViolations } from "../../testing/axe";
import { withPseudoState } from "../../testing/pseudo-state";
import { Button, type ButtonVariant } from "./Button";

const VARIANTS = ["primary", "secondary"] as const satisfies readonly ButtonVariant[];
const STATES = ["default", "hover", "active", "focus-visible"] as const;

const CASES = VARIANTS.flatMap((variant) => STATES.map((state) => ({ variant, state })));

describe("Button contrast", () => {
  test.for(CASES)(
    "variant=$variant / state=$state passes WCAG contrast",
    async ({ variant, state }, ctx) => {
      // macOS Safari's default "Full Keyboard Access" setting limits Tab to
      // text boxes and lists — <button> (and <a>) are excluded from the Tab
      // sequence unless the user opts in via System Settings or Safari's own
      // "Press Tab to highlight each item on a webpage" preference. Verified
      // empirically that this Playwright WebKit build matches that real-world
      // default (userEvent.tab() never lands on a bare <button>), so
      // :focus-visible can't be authentically reached here — a real user
      // tabbing through a default-configured Safari hits the same
      // limitation, so this isn't something our CSS/component can fix.
      ctx.skip(
        state === "focus-visible" && server.browser === "webkit",
        "WebKit's Full-Keyboard-Access default excludes <button> from Tab; :focus-visible unreachable",
      );

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
      await withPseudoState('[data-testid="ctr-btn"]', [state], async () => {
        await expectNoAxeViolations(screen.container);
      });
    },
  );
});
