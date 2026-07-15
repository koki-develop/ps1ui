// Visual regression baseline for Heading. Independent per-axis coverage —
// the full level×size×weight product would be 6×6×4 = 144 combinations
// with mostly-redundant colour output. Each per-axis case pins one axis
// and lets the other two ride on the level-default mapping.
//
// The level cases carry double duty: they verify (a) the h1..h6 tag choice
// and (b) that Heading's LEVEL_DEFAULTS table still maps each level to its
// intended default size + weight. A drift in the defaults table would show
// as a per-level diff without affecting the explicit-override axes.

import "../../styles/styles.css";

import type { ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Heading, type HeadingLevel, type HeadingSize, type HeadingWeight } from "./Heading";

const LEVELS = [1, 2, 3, 4, 5, 6] as const satisfies readonly HeadingLevel[];
const SIZES = ["sm", "md", "lg", "xl", "2xl", "3xl"] as const satisfies readonly HeadingSize[];
const WEIGHTS = [
  "regular",
  "medium",
  "semibold",
  "bold",
] as const satisfies readonly HeadingWeight[];

// 3xl at max font-size needs headroom; 480px gives enough width for the
// widest cases without forcing wrapping mid-word.
const FRAME_WIDTH = 480;

const LABEL = "the quick brown fox";

type Case = { name: string; node: () => ReactNode };

const CASES: readonly Case[] = [
  // Level cases test both the h1..h6 tag choice AND the LEVEL_DEFAULTS
  // size/weight mapping in one shot — a drift in either surfaces here.
  ...LEVELS.map((level) => ({
    name: `level-${level}`,
    node: () => <Heading level={level}>{LABEL}</Heading>,
  })),
  // Size / weight cases pin level=1 (default 3xl bold) and override one
  // axis, so a size or weight class regression isolates cleanly.
  ...SIZES.map((size) => ({
    name: `size-${size}`,
    node: () => (
      <Heading level={1} size={size}>
        {LABEL}
      </Heading>
    ),
  })),
  ...WEIGHTS.map((weight) => ({
    name: `weight-${weight}`,
    node: () => (
      <Heading level={1} weight={weight}>
        {LABEL}
      </Heading>
    ),
  })),
];

describe("Heading VRT", () => {
  test.for(CASES)("$name", async ({ name, node }) => {
    const screen = await render(<VrtFrame width={FRAME_WIDTH}>{node()}</VrtFrame>);
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(name);
  });
});
