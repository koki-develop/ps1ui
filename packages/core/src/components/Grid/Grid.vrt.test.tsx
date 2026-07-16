// Visual regression baselines for Grid. Covers columns and gap
// independently per the Text-style per-axis strategy — a full
// cross-product would be (6 columns) × (7 gaps) = 42 near-duplicate PNGs,
// all really just testing the same two CSS declarations.

import "../../styles/styles.css";

import type { ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Card } from "../Card/Card";
import { PS1Root } from "../PS1Root/PS1Root";
import { Grid, type GridGap } from "./Grid";

const COLUMN_COUNTS = [1, 2, 3, 4] as const;
const GAPS = ["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const satisfies readonly GridGap[];

// Frame width sized so 4 columns leave enough room per cell to be
// distinguishable — 320 / 4 = 80 px per track before gap, which reads
// clearly at the default gap.
const FRAME_WIDTH = 320;

// Compact Card padding so cells stay visually distinct at 4 columns;
// Card's default --ps1ui-space-xl (24px) plus track compression would
// leave no room for the label.
const cell = (label: string): ReactNode => (
  <Card key={label} style={{ padding: 8, textAlign: "center" }}>
    {label}
  </Card>
);

type Case = { name: string; stageWidth: number; node: () => ReactNode };

// Responsive columns object used for the per-band VRT cases. Distinct
// column count per breakpoint so the captured baseline reflects an
// unambiguous effective count.
const RESPONSIVE_COLUMNS = {
  base: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 6,
} as const satisfies Record<"base" | "sm" | "md" | "lg" | "xl", number>;

const CASES: readonly Case[] = [
  ...COLUMN_COUNTS.map(
    (n): Case => ({
      name: `columns-${n}`,
      stageWidth: FRAME_WIDTH,
      // Fill exactly one row of `n` cells so the columns count is
      // unambiguously visible (2 rows of cells would blur "3 columns" and
      // "6 cells wrapped").
      node: () => (
        <Grid columns={n}>{Array.from({ length: n }, (_, i) => cell(String(i + 1)))}</Grid>
      ),
    }),
  ),
  ...GAPS.map(
    (gap): Case => ({
      name: `gap-${gap}`,
      stageWidth: FRAME_WIDTH,
      // Fixed at 3 columns × 2 rows so both row-gap and column-gap show up.
      node: () => (
        <Grid columns={3} gap={gap}>
          {Array.from({ length: 6 }, (_, i) => cell(String(i + 1)))}
        </Grid>
      ),
    }),
  ),
  // Responsive columns cascade — one baseline per breakpoint band.
  // PS1Root supplies the containment ancestor for @container queries in
  // Grid.css. Enough cells (12) to fully populate the widest column count
  // in the FULL_COLUMNS map (6) with 2 rows.
  // 320 CSS px width doubles as the WCAG 2.2 SC 1.4.10 (Reflow) baseline —
  // proves the grid collapses to a single column at the narrowest supported
  // viewport without horizontal overflow.
  {
    name: "responsive-columns-below-sm-wcag-320",
    stageWidth: 320,
    node: () => (
      <PS1Root>
        <Grid columns={RESPONSIVE_COLUMNS}>
          {Array.from({ length: 6 }, (_, i) => cell(String(i + 1)))}
        </Grid>
      </PS1Root>
    ),
  },
  {
    name: "responsive-columns-sm-band",
    stageWidth: 700,
    node: () => (
      <PS1Root>
        <Grid columns={RESPONSIVE_COLUMNS}>
          {Array.from({ length: 6 }, (_, i) => cell(String(i + 1)))}
        </Grid>
      </PS1Root>
    ),
  },
  {
    name: "responsive-columns-md-band",
    stageWidth: 900,
    node: () => (
      <PS1Root>
        <Grid columns={RESPONSIVE_COLUMNS}>
          {Array.from({ length: 6 }, (_, i) => cell(String(i + 1)))}
        </Grid>
      </PS1Root>
    ),
  },
  {
    name: "responsive-columns-lg-band",
    stageWidth: 1200,
    node: () => (
      <PS1Root>
        <Grid columns={RESPONSIVE_COLUMNS}>
          {Array.from({ length: 8 }, (_, i) => cell(String(i + 1)))}
        </Grid>
      </PS1Root>
    ),
  },
  {
    name: "responsive-columns-xl-band",
    stageWidth: 1400,
    node: () => (
      <PS1Root>
        <Grid columns={RESPONSIVE_COLUMNS}>
          {Array.from({ length: 12 }, (_, i) => cell(String(i + 1)))}
        </Grid>
      </PS1Root>
    ),
  },
];

describe("Grid VRT", () => {
  test.for(CASES)("$name", async ({ name, stageWidth, node }) => {
    const screen = await render(<VrtFrame width={stageWidth}>{node()}</VrtFrame>);
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(name);
  });
});
