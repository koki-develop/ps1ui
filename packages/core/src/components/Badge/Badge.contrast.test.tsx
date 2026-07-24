// Contrast regression tests for Badge. Unlike Badge.test.tsx (semantic
// a11y only, no CSS loaded), this file imports the real component CSS and
// wraps each (variant × color) combination against both the page canvas
// (--ps1ui-color-bg) and a Card surface (--ps1ui-color-surface) so axe's
// color-contrast rule sees the resolved colors of each pair.
//
// Text.contrast.test.tsx already covers the raw fg colors on canvas and
// surface (variants: body/muted/subtle/primary/accent/danger). Badge
// introduces two new families that Text does not:
//   - solid: fg=--_solid-fg on bg=--_base (a per-color fg-on-color pair)
//   - subtle: fg=--_fg on a color-mix(base 15%, transparent) tinted bg
// This file covers those explicitly; the outline variant is included for
// defensive parity (its fg colors are the same as Text's, but its border
// contribution to perceived colour is worth pinning).
//
// Interactive states (hover / active / focus-visible) are not exercised
// here: their treatment is the same colour-mix formula shifted per state,
// and the resting state is the load-bearing contrast surface.

import "../../styles/styles.css";

import { describe, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Card } from "../Card/Card";
import { Badge, type BadgeColor, type BadgeVariant } from "./Badge";

const VARIANTS = ["solid", "outline", "subtle"] as const satisfies readonly BadgeVariant[];
const COLORS = ["primary", "accent", "danger", "muted"] as const satisfies readonly BadgeColor[];

const CASES = VARIANTS.flatMap((variant) => COLORS.map((color) => ({ variant, color })));

describe("Badge contrast", () => {
  describe("on --ps1ui-color-bg (page canvas)", () => {
    test.for(CASES)(
      "variant=$variant / color=$color passes WCAG contrast against bg",
      async ({ variant, color }) => {
        const screen = await render(
          <div style={{ background: "var(--ps1ui-color-bg)", padding: 20 }}>
            <Badge variant={variant} color={color}>
              The quick brown fox jumps over the lazy dog
            </Badge>
          </div>,
        );
        await expectNoAxeViolations(screen.container);
      },
    );
  });

  describe("on --ps1ui-color-surface (inside Card)", () => {
    test.for(CASES)(
      "variant=$variant / color=$color passes WCAG contrast against surface",
      async ({ variant, color }) => {
        const screen = await render(
          <div style={{ background: "var(--ps1ui-color-bg)", padding: 20 }}>
            <Card>
              <Badge variant={variant} color={color}>
                The quick brown fox jumps over the lazy dog
              </Badge>
            </Card>
          </div>,
        );
        await expectNoAxeViolations(screen.container);
      },
    );
  });
});
