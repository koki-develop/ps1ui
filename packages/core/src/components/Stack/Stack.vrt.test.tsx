// Visual regression baselines for Stack. Each axis (direction, gap, align,
// justify, wrap) is covered independently — the other axes fixed at their
// defaults — mirroring the Text VRT strategy: full cartesian product would
// generate a lot of near-duplicate baselines and drown genuine per-axis
// drift in noise.

import "../../styles/styles.css";

import type { CSSProperties, ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Card } from "../Card/Card";
import { PS1Root } from "../PS1Root/PS1Root";
import {
  Stack,
  type StackAlign,
  type StackDirection,
  type StackGap,
  type StackJustify,
} from "./Stack";

const DIRECTIONS = ["row", "column"] as const satisfies readonly StackDirection[];
const GAPS = ["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const satisfies readonly StackGap[];
const ALIGNS = [
  "start",
  "center",
  "end",
  "stretch",
  "baseline",
] as const satisfies readonly StackAlign[];
const JUSTIFIES = [
  "start",
  "center",
  "end",
  "between",
  "around",
  "evenly",
] as const satisfies readonly StackJustify[];

// Consistent frame width across all cases so gap/align/justify captures
// share horizontal geometry — a change in one axis's baseline is then
// clearly attributable to that axis, not a stray frame-width shift.
const FRAME_WIDTH = 320;

// Compact Card padding so all three siblings fit in the 320 px frame with
// the widest tested gap ("2xl" = 32 px); Card's default --ps1ui-space-xl
// (24 px) padding at 40 px min-width would overflow at gap-2xl.
const cell = (label: string, extra?: CSSProperties): ReactNode => (
  <Card key={label} style={{ padding: 8, minWidth: 32, textAlign: "center", ...extra }}>
    {label}
  </Card>
);

// A dashed outline on the Stack itself so justify (which distributes space
// inside the flex container) reads correctly — otherwise `space-between` is
// visually identical to `flex-start` when the container is content-sized.
const outlineStyle: CSSProperties = {
  border: "1px dashed var(--ps1ui-color-border-strong)",
  padding: 4,
};

type Case = { name: string; stageWidth: number; node: () => ReactNode };

// Responsive direction + gap object for the per-band VRT cases. Each
// breakpoint picks a visibly-distinct combination so a captured baseline
// reflects an unambiguous effective set of values.
const RESPONSIVE_DIRECTION = {
  base: "column",
  sm: "row",
  md: "column",
  lg: "row",
  xl: "column",
} as const satisfies Record<"base" | "sm" | "md" | "lg" | "xl", StackDirection>;

const RESPONSIVE_GAP = {
  base: "xs",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
} as const satisfies Record<"base" | "sm" | "md" | "lg" | "xl", StackGap>;

const CASES: readonly Case[] = [
  ...DIRECTIONS.map(
    (direction): Case => ({
      name: `direction-${direction}`,
      stageWidth: FRAME_WIDTH,
      node: () => (
        <Stack direction={direction}>
          {cell("1")}
          {cell("2")}
          {cell("3")}
        </Stack>
      ),
    }),
  ),
  ...GAPS.map(
    (gap): Case => ({
      name: `gap-${gap}`,
      stageWidth: FRAME_WIDTH,
      node: () => (
        <Stack gap={gap}>
          {cell("1")}
          {cell("2")}
          {cell("3")}
        </Stack>
      ),
    }),
  ),
  ...ALIGNS.map(
    (align): Case => ({
      name: `align-${align}`,
      stageWidth: FRAME_WIDTH,
      node: () => (
        <Stack direction="row" align={align} gap="sm">
          {cell("a", { height: 20 })}
          {cell("b", { height: 40 })}
          {cell("c", { height: 28 })}
        </Stack>
      ),
    }),
  ),
  ...JUSTIFIES.map(
    (justify): Case => ({
      name: `justify-${justify}`,
      stageWidth: FRAME_WIDTH,
      node: () => (
        <Stack direction="row" justify={justify} gap="sm" style={outlineStyle}>
          {cell("1")}
          {cell("2")}
          {cell("3")}
        </Stack>
      ),
    }),
  ),
  {
    name: "wrap",
    stageWidth: FRAME_WIDTH,
    node: () => (
      <Stack direction="row" wrap gap="sm">
        {Array.from({ length: 8 }, (_, i) => cell(String(i + 1)))}
      </Stack>
    ),
  },
  // Responsive direction + gap cascade — one baseline per breakpoint band.
  // PS1Root supplies the containment ancestor for @container queries in
  // Stack.css.
  // 320 CSS px width doubles as the WCAG 2.2 SC 1.4.10 (Reflow) baseline —
  // proves the stack renders as a vertical column at the narrowest supported
  // viewport (the mobile-first `base` direction is `column`) without
  // horizontal overflow.
  {
    name: "responsive-below-sm-wcag-320",
    stageWidth: 320,
    node: () => (
      <PS1Root>
        <Stack direction={RESPONSIVE_DIRECTION} gap={RESPONSIVE_GAP}>
          {cell("1")}
          {cell("2")}
          {cell("3")}
        </Stack>
      </PS1Root>
    ),
  },
  {
    name: "responsive-sm-band",
    stageWidth: 700,
    node: () => (
      <PS1Root>
        <Stack direction={RESPONSIVE_DIRECTION} gap={RESPONSIVE_GAP}>
          {cell("1")}
          {cell("2")}
          {cell("3")}
        </Stack>
      </PS1Root>
    ),
  },
  {
    name: "responsive-md-band",
    stageWidth: 900,
    node: () => (
      <PS1Root>
        <Stack direction={RESPONSIVE_DIRECTION} gap={RESPONSIVE_GAP}>
          {cell("1")}
          {cell("2")}
          {cell("3")}
        </Stack>
      </PS1Root>
    ),
  },
  {
    name: "responsive-lg-band",
    stageWidth: 1200,
    node: () => (
      <PS1Root>
        <Stack direction={RESPONSIVE_DIRECTION} gap={RESPONSIVE_GAP}>
          {cell("1")}
          {cell("2")}
          {cell("3")}
        </Stack>
      </PS1Root>
    ),
  },
  {
    name: "responsive-xl-band",
    stageWidth: 1400,
    node: () => (
      <PS1Root>
        <Stack direction={RESPONSIVE_DIRECTION} gap={RESPONSIVE_GAP}>
          {cell("1")}
          {cell("2")}
          {cell("3")}
        </Stack>
      </PS1Root>
    ),
  },
];

describe("Stack VRT", () => {
  test.for(CASES)("$name", async ({ name, stageWidth, node }) => {
    const screen = await render(<VrtFrame width={stageWidth}>{node()}</VrtFrame>);
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(name);
  });
});
