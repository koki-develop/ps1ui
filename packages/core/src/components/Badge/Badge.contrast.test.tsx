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
//
// The `size` axis is not crossed with (variant × color) either, but for a
// different reason than the states above: size changes no colour at all, and
// every step (10 / 12 / 14px at font-weight 600) sits below both WCAG
// large-text thresholds — 24px, or 18.66px at bold, which axe-core scores as
// weight ≥ 700. So all three sizes are held to the same 4.5:1 requirement the
// md cases above already prove. That equivalence is the whole argument for
// not expanding the matrix, so it is asserted directly below rather than left
// as a comment — if a future type-scale or font-weight tuning pushed lg over
// a threshold boundary, the reasoning would silently stop holding.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Card } from "../Card/Card";
import { Badge, type BadgeColor, type BadgeSize, type BadgeVariant } from "./Badge";

const VARIANTS = ["solid", "outline", "subtle"] as const satisfies readonly BadgeVariant[];
const COLORS = ["primary", "accent", "danger", "muted"] as const satisfies readonly BadgeColor[];
const SIZES = ["sm", "md", "lg"] as const satisfies readonly BadgeSize[];

// WCAG 1.4.3 "large scale" text, in px at the tester's root font size, as
// axe-core evaluates it: 18pt = 24px at any weight, or 14pt = 18.66px when
// bold. axe-core treats font-weight ≥ 700 as bold.
const LARGE_TEXT_PX = 24;
const LARGE_TEXT_BOLD_PX = 18.66;
const BOLD_WEIGHT = 700;

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

  // Pins the premise that lets the two matrices above stand in for all three
  // sizes: every size renders below the large-text thresholds, so each is
  // held to the same 4.5:1 ratio. A type-scale bump that pushed lg past
  // 18.66px while some future variant also went bold would relax the
  // requirement for lg only — and the matrices, all captured at md, would no
  // longer prove anything about it.
  describe("size axis stays under the WCAG large-text thresholds", () => {
    test.for(SIZES.map((size) => ({ size })))(
      "size=$size is scored as normal-size text",
      async ({ size }) => {
        const screen = await render(
          <div style={{ background: "var(--ps1ui-color-bg)", padding: 20 }}>
            <Badge size={size} data-testid="badge">
              label
            </Badge>
          </div>,
        );
        const styles = getComputedStyle(screen.getByTestId("badge").element());
        const fontSize = Number.parseFloat(styles.fontSize);
        const fontWeight = Number.parseFloat(styles.fontWeight);
        expect(fontWeight).toBeLessThan(BOLD_WEIGHT);
        expect(fontSize).toBeLessThan(LARGE_TEXT_PX);
        // Belt and braces: even if the weight ever crossed into bold, the
        // size would still have to clear the stricter bold threshold for the
        // md-only matrices to keep covering it.
        expect(fontSize).toBeLessThan(LARGE_TEXT_BOLD_PX);
      },
    );
  });
});
