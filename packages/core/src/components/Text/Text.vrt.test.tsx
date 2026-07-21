// Visual regression baseline for Text. The three enumerable axes (variant,
// size, weight) are covered independently rather than as a full cartesian
// product — 5×5×4 = 100 combinations would flood the baseline set with
// near-duplicate colour swatches. Each per-axis case fixes the other axes
// at their defaults, so a change to (say) the accent variant token only
// diffs the accent baseline, not 20 unrelated ones.

import "../../styles/styles.css";

import type { ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { PS1Root } from "../PS1Root/PS1Root";
import { Text, type TextSize, type TextVariant, type TextWeight } from "./Text";

const VARIANTS = [
  "body",
  "muted",
  "subtle",
  "primary",
  "accent",
  "danger",
] as const satisfies readonly TextVariant[];
const SIZES = ["xs", "sm", "md", "lg", "xl"] as const satisfies readonly TextSize[];
const WEIGHTS = ["regular", "medium", "semibold", "bold"] as const satisfies readonly TextWeight[];

// Fixed 320px width so truncated / long-form cases render at a consistent
// wrapping width across every variant/size/weight capture.
const FRAME_WIDTH = 320;

const LABEL = "the quick brown fox jumps over the lazy dog";
const LONG_LABEL =
  "this is a long line of text that will be truncated with an ellipsis when the container narrows";

type Case = { name: string; stageWidth: number; node: () => ReactNode };

// Responsive size cascade — one baseline per breakpoint band. Each entry
// picks a distinct size so the captured baseline reflects an unambiguous
// effective size.
const RESPONSIVE_SIZE = {
  base: "xs",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
} as const satisfies Record<"base" | "sm" | "md" | "lg" | "xl", TextSize>;

const CASES: readonly Case[] = [
  ...VARIANTS.map((variant) => ({
    name: `variant-${variant}`,
    stageWidth: FRAME_WIDTH,
    node: () => <Text variant={variant}>{LABEL}</Text>,
  })),
  ...SIZES.map((size) => ({
    name: `size-${size}`,
    stageWidth: FRAME_WIDTH,
    node: () => <Text size={size}>{LABEL}</Text>,
  })),
  ...WEIGHTS.map((weight) => ({
    name: `weight-${weight}`,
    stageWidth: FRAME_WIDTH,
    node: () => <Text weight={weight}>{LABEL}</Text>,
  })),
  { name: "truncate", stageWidth: FRAME_WIDTH, node: () => <Text truncate>{LONG_LABEL}</Text> },
  // Responsive size — one capture per breakpoint band. PS1Root supplies
  // the containment ancestor for the @container queries in Text.css.
  // 320 CSS px width doubles as the WCAG 2.2 SC 1.4.10 (Reflow) baseline —
  // proves body text at the mobile-first base size wraps within the
  // narrowest supported viewport without horizontal overflow.
  {
    name: "responsive-size-below-sm-wcag-320",
    stageWidth: 320,
    node: () => (
      <PS1Root>
        <Text size={RESPONSIVE_SIZE}>{LABEL}</Text>
      </PS1Root>
    ),
  },
  {
    name: "responsive-size-sm-band",
    stageWidth: 700,
    node: () => (
      <PS1Root>
        <Text size={RESPONSIVE_SIZE}>{LABEL}</Text>
      </PS1Root>
    ),
  },
  {
    name: "responsive-size-md-band",
    stageWidth: 900,
    node: () => (
      <PS1Root>
        <Text size={RESPONSIVE_SIZE}>{LABEL}</Text>
      </PS1Root>
    ),
  },
  {
    name: "responsive-size-lg-band",
    stageWidth: 1200,
    node: () => (
      <PS1Root>
        <Text size={RESPONSIVE_SIZE}>{LABEL}</Text>
      </PS1Root>
    ),
  },
  {
    name: "responsive-size-xl-band",
    stageWidth: 1400,
    node: () => (
      <PS1Root>
        <Text size={RESPONSIVE_SIZE}>{LABEL}</Text>
      </PS1Root>
    ),
  },
];

describe("Text VRT", () => {
  test.for(CASES)("$name", async ({ name, stageWidth, node }) => {
    const screen = await render(<VrtFrame width={stageWidth}>{node()}</VrtFrame>);
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(name);
  });
});
