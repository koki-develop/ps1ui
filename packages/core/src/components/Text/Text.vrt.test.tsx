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
import { Text, type TextSize, type TextVariant, type TextWeight } from "./Text";

const VARIANTS = [
  "body",
  "muted",
  "subtle",
  "primary",
  "accent",
] as const satisfies readonly TextVariant[];
const SIZES = ["xs", "sm", "md", "lg", "xl"] as const satisfies readonly TextSize[];
const WEIGHTS = ["regular", "medium", "semibold", "bold"] as const satisfies readonly TextWeight[];

// Fixed 320px width so truncated / long-form cases render at a consistent
// wrapping width across every variant/size/weight capture.
const FRAME_WIDTH = 320;

const LABEL = "the quick brown fox jumps over the lazy dog";
const LONG_LABEL =
  "this is a long line of text that will be truncated with an ellipsis when the container narrows";

type Case = { name: string; node: () => ReactNode };

const CASES: readonly Case[] = [
  ...VARIANTS.map((variant) => ({
    name: `variant-${variant}`,
    node: () => <Text variant={variant}>{LABEL}</Text>,
  })),
  ...SIZES.map((size) => ({
    name: `size-${size}`,
    node: () => <Text size={size}>{LABEL}</Text>,
  })),
  ...WEIGHTS.map((weight) => ({
    name: `weight-${weight}`,
    node: () => <Text weight={weight}>{LABEL}</Text>,
  })),
  { name: "truncate", node: () => <Text truncate>{LONG_LABEL}</Text> },
];

describe("Text VRT", () => {
  test.for(CASES)("$name", async ({ name, node }) => {
    const screen = await render(<VrtFrame width={FRAME_WIDTH}>{node()}</VrtFrame>);
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(name);
  });
});
