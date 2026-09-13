// Contrast regression tests. Unlike the other unit tests, this file imports the real
// component CSS and wraps each case in a themed canvas / surface so axe's
// color-contrast rule can compute real ratios.
//
// The (fg-token, bg-token) pairs here are the same ones Text.contrast.test.tsx
// covers — this file exists because the pair is only half the story: it also
// pins Heading's OWN variant → token mapping in Heading.css. A variant pointed
// at a low-contrast token would sail past Text's file untouched.
//
// Every case renders level 6, the strictest level: contrast ratio doesn't vary
// with font size, but axe's *threshold* does (3:1 once text is large, 4.5:1
// below that). Level 6 (sm / medium) is the only level that stays under the
// large-text cutoff on both axes, so it subsumes levels 1–5. Every pair is
// also verified in both themes, since `light-dark()` resolves each token
// differently per `color-scheme`.

import "../../styles/styles.css";

import { describe, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { THEMES, ThemedCanvas } from "../../testing/theme";
import { Card } from "../Card/Card";
import { Heading, type HeadingVariant } from "./Heading";

const VARIANTS = [
  "body",
  "muted",
  "subtle",
  "primary",
  "accent",
  "danger",
] as const satisfies readonly HeadingVariant[];

const CASES = THEMES.flatMap((theme) => VARIANTS.map((variant) => ({ theme, variant })));

describe("Heading contrast", () => {
  describe("on --ps1ui-color-bg (page canvas)", () => {
    test.for(CASES)(
      "theme=$theme / variant=$variant passes WCAG contrast against bg",
      async ({ theme, variant }) => {
        const screen = await render(
          <ThemedCanvas theme={theme}>
            <Heading level={6} variant={variant}>
              The quick brown fox jumps over the lazy dog
            </Heading>
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
              <Heading level={6} variant={variant}>
                The quick brown fox jumps over the lazy dog
              </Heading>
            </Card>
          </ThemedCanvas>,
        );
        await expectNoAxeViolations(screen.container);
      },
    );
  });
});
