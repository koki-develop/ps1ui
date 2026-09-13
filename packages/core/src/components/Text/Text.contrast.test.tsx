// Contrast regression tests. Unlike the other unit tests, this file imports the real
// component CSS and wraps each case in a themed canvas / surface so axe's
// color-contrast rule can compute real ratios. Every (variant × bg) pair is
// verified in both themes — `light-dark()` resolves each token differently
// depending on the `color-scheme` in effect, so a pair that passes in dark
// says nothing about light.

import "../../styles/styles.css";

import { describe, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { THEMES, ThemedCanvas } from "../../testing/theme";
import { Card } from "../Card/Card";
import { Text, type TextVariant } from "./Text";

const VARIANTS = [
  "body",
  "muted",
  "subtle",
  "primary",
  "accent",
  "danger",
] as const satisfies readonly TextVariant[];

const CASES = THEMES.flatMap((theme) => VARIANTS.map((variant) => ({ theme, variant })));

describe("Text contrast", () => {
  describe("on --ps1ui-color-bg (page canvas)", () => {
    test.for(CASES)(
      "theme=$theme / variant=$variant passes WCAG contrast against bg",
      async ({ theme, variant }) => {
        const screen = await render(
          <ThemedCanvas theme={theme}>
            <Text variant={variant}>The quick brown fox jumps over the lazy dog</Text>
          </ThemedCanvas>,
        );
        await expectNoAxeViolations(screen.container);
      },
    );
  });

  describe("on --ps1ui-color-surface (inside Card)", () => {
    test.for(CASES)(
      "theme=$theme / variant=$variant passes WCAG contrast against surface",
      async ({ theme, variant }) => {
        const screen = await render(
          <ThemedCanvas theme={theme}>
            <Card>
              <Text variant={variant}>The quick brown fox jumps over the lazy dog</Text>
            </Card>
          </ThemedCanvas>,
        );
        await expectNoAxeViolations(screen.container);
      },
    );
  });
});
