// Contrast regression net for Anchor's interactive states. Loads the real CSS
// and uses CDP `CSS.forcePseudoState` to put the link into :hover / :active so
// axe's color-contrast rule sees the resolved colors. Text.contrast.test.tsx
// already covers the default primary color on bg / surface via the shared
// Text primary variant; hover / active tokens are unique to interactive
// components and are what this file locks in.
//
// :focus-visible is intentionally NOT in the state list — the Anchor CSS only
// touches outline in that state, so color-contrast is byte-identical to default.
// The sanity check that forcePseudoState actually shifts styles lives once in
// src/testing/pseudo-state.test.tsx (shared with Button.contrast).

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { withForcedPseudoState } from "../../testing/pseudo-state";
import { Card } from "../Card/Card";
import { Anchor, type AnchorVariant } from "./Anchor";

const VARIANTS = ["primary", "subtle"] as const satisfies readonly AnchorVariant[];
const STATES = ["default", "hover", "active"] as const;

const CASES = VARIANTS.flatMap((variant) => STATES.map((state) => ({ variant, state })));

describe("Anchor contrast", () => {
  describe("on --ps1ui-color-bg (page canvas)", () => {
    test.for(CASES)(
      "variant=$variant / state=$state passes WCAG contrast against bg",
      async ({ variant, state }) => {
        const screen = await render(
          <div
            style={{
              background: "var(--ps1ui-color-bg)",
              color: "var(--ps1ui-color-fg)",
              padding: 20,
            }}
          >
            <Anchor
              variant={variant}
              href="/x"
              data-testid="ctr-anchor"
              style={{ transition: "none" }}
            >
              The quick brown fox jumps over the lazy dog
            </Anchor>
          </div>,
        );
        if (state === "default") {
          await expectNoAxeViolations(screen.container);
          return;
        }
        await withForcedPseudoState('[data-testid="ctr-anchor"]', [state], async () => {
          await expectNoAxeViolations(screen.container);
        });
      },
    );
  });

  // Locks in the underline-follows-color behavior for subtle: on hover / active
  // the text-decoration-color must shift with `color`, not stay pinned to the
  // base fg-subtle. Expected colors are derived from the CSS vars via probe
  // elements so the assertions don't hardcode hex values.
  describe("subtle underline color tracks state", () => {
    const cases = [
      { state: "hover", expectVar: "--ps1ui-color-primary" },
      { state: "active", expectVar: "--ps1ui-color-primary-active" },
    ] as const;

    test.for(cases)(
      "subtle / $state → text-decoration-color = var($expectVar)",
      async ({ state, expectVar }) => {
        const screen = await render(
          <div
            style={{
              background: "var(--ps1ui-color-bg)",
              color: "var(--ps1ui-color-fg)",
              padding: 20,
            }}
          >
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
          </div>,
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

        await withForcedPseudoState('[data-testid="dec-anchor"]', [state], async () => {
          expect(getComputedStyle(link).textDecorationColor).toBe(expectedColor);
        });
      },
    );
  });

  describe("on --ps1ui-color-surface (inside Card)", () => {
    test.for(CASES)(
      "variant=$variant / state=$state passes WCAG contrast against surface",
      async ({ variant, state }) => {
        const screen = await render(
          <div style={{ background: "var(--ps1ui-color-bg)", padding: 20 }}>
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
          </div>,
        );
        if (state === "default") {
          await expectNoAxeViolations(screen.container);
          return;
        }
        await withForcedPseudoState('[data-testid="ctr-anchor"]', [state], async () => {
          await expectNoAxeViolations(screen.container);
        });
      },
    );
  });
});
