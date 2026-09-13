// Contrast regression net for Anchor's interactive states. Loads the real CSS
// and puts the link into :hover / :active via real userEvent hover / a held
// mouse button (see src/testing/pseudo-state.ts) so axe's color-contrast rule
// sees the resolved colors. Text.contrast.test.tsx already covers the default
// primary color on bg / surface via the shared Text primary variant; hover /
// active tokens are unique to interactive components and are what this file
// locks in. Every pair is verified in both themes, since `light-dark()`
// resolves each token differently per `color-scheme`.
//
// :focus-visible is intentionally NOT in the state list — the Anchor CSS only
// touches outline in that state, so color-contrast is byte-identical to default.
// The sanity check that withPseudoState actually shifts styles lives once in
// src/testing/pseudo-state.test.tsx (shared with Button.contrast).

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { withPseudoState } from "../../testing/pseudo-state";
import { THEMES, ThemedCanvas } from "../../testing/theme";
import { Card } from "../Card/Card";
import { Anchor, type AnchorVariant } from "./Anchor";

const VARIANTS = ["primary", "subtle"] as const satisfies readonly AnchorVariant[];
const STATES = ["default", "hover", "active"] as const;

const CASES = THEMES.flatMap((theme) =>
  VARIANTS.flatMap((variant) => STATES.map((state) => ({ theme, variant, state }))),
);

describe("Anchor contrast", () => {
  describe("on --ps1ui-color-bg (page canvas)", () => {
    test.for(CASES)(
      "theme=$theme / variant=$variant / state=$state passes WCAG contrast against bg",
      async ({ theme, variant, state }) => {
        const screen = await render(
          <ThemedCanvas theme={theme}>
            <Anchor
              variant={variant}
              href="/x"
              data-testid="ctr-anchor"
              style={{ transition: "none" }}
            >
              The quick brown fox jumps over the lazy dog
            </Anchor>
          </ThemedCanvas>,
        );
        if (state === "default") {
          await expectNoAxeViolations(screen.container);
          return;
        }
        await withPseudoState('[data-testid="ctr-anchor"]', [state], async () => {
          await expectNoAxeViolations(screen.container);
        });
      },
    );
  });

  // Locks in the underline-follows-color behavior for subtle: on hover / active
  // the text-decoration-color must shift with `color`, not stay pinned to the
  // base fg-subtle. Expected colors are derived from the CSS vars via probe
  // elements so the assertions don't hardcode hex values. Verified in both
  // themes since the underlying tokens are `light-dark()` pairs.
  describe("subtle underline color tracks state", () => {
    const baseCases = [
      { state: "hover", expectVar: "--ps1ui-color-primary-text" },
      { state: "active", expectVar: "--ps1ui-color-primary-text-active" },
    ] as const;
    const cases = THEMES.flatMap((theme) => baseCases.map((c) => ({ theme, ...c })));

    test.for(cases)(
      "theme=$theme / subtle / $state → text-decoration-color = var($expectVar)",
      async ({ theme, state, expectVar }) => {
        const screen = await render(
          <ThemedCanvas theme={theme}>
            <Anchor
              variant="subtle"
              href="/x"
              data-testid="dec-anchor"
              style={{ transition: "none" }}
            >
              subtle link
            </Anchor>
            <span data-testid="dec-expected" style={{ color: `var(${expectVar})` }} />
            <span data-testid="dec-base" style={{ color: "var(--ps1ui-color-fg-subtle)" }} />
          </ThemedCanvas>,
        );
        const link = screen.container.querySelector<HTMLElement>('[data-testid="dec-anchor"]');
        const expected = screen.container.querySelector<HTMLElement>(
          '[data-testid="dec-expected"]',
        );
        const base = screen.container.querySelector<HTMLElement>('[data-testid="dec-base"]');
        if (!link || !expected || !base) throw new Error("probes not found");

        const expectedColor = getComputedStyle(expected).color;
        const baseColor = getComputedStyle(base).color;

        // Sanity: at rest the underline is fg-subtle, distinct from the target color.
        expect(getComputedStyle(link).textDecorationColor).toBe(baseColor);
        expect(expectedColor).not.toBe(baseColor);

        await withPseudoState('[data-testid="dec-anchor"]', [state], async () => {
          expect(getComputedStyle(link).textDecorationColor).toBe(expectedColor);
        });
      },
    );
  });

  describe("on --ps1ui-color-surface (inside Card)", () => {
    test.for(CASES)(
      "theme=$theme / variant=$variant / state=$state passes WCAG contrast against surface",
      async ({ theme, variant, state }) => {
        const screen = await render(
          <ThemedCanvas theme={theme}>
            <Card>
              <Anchor
                variant={variant}
                href="/x"
                data-testid="ctr-anchor"
                style={{ transition: "none" }}
              >
                The quick brown fox jumps over the lazy dog
              </Anchor>
            </Card>
          </ThemedCanvas>,
        );
        if (state === "default") {
          await expectNoAxeViolations(screen.container);
          return;
        }
        await withPseudoState('[data-testid="ctr-anchor"]', [state], async () => {
          await expectNoAxeViolations(screen.container);
        });
      },
    );
  });
});
