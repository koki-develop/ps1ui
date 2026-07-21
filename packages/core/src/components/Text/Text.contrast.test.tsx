// Contrast regression tests. Unlike the other unit tests, this file imports the real
// component CSS and wraps each case in the ps1ui background / surface so axe's
// color-contrast rule can compute real ratios.

import "../../styles/styles.css";

import { describe, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
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

describe("Text contrast", () => {
  describe("on --ps1ui-color-bg (page canvas)", () => {
    test.for(VARIANTS.map((variant) => ({ variant })))(
      "variant=$variant passes WCAG contrast against bg",
      async ({ variant }) => {
        const screen = await render(
          <div style={{ background: "var(--ps1ui-color-bg)", padding: 20 }}>
            <Text variant={variant}>The quick brown fox jumps over the lazy dog</Text>
          </div>,
        );
        await expectNoAxeViolations(screen.container);
      },
    );
  });

  describe("on --ps1ui-color-surface (inside Card)", () => {
    test.for(VARIANTS.map((variant) => ({ variant })))(
      "variant=$variant passes WCAG contrast against surface",
      async ({ variant }) => {
        const screen = await render(
          <div style={{ background: "var(--ps1ui-color-bg)", padding: 20 }}>
            <Card>
              <Text variant={variant}>The quick brown fox jumps over the lazy dog</Text>
            </Card>
          </div>,
        );
        await expectNoAxeViolations(screen.container);
      },
    );
  });
});
