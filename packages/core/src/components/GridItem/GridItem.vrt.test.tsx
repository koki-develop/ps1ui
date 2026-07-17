// Visual regression baselines for GridItem. Covers the colSpan axis per the
// Text-style per-axis strategy — since colSpan is the only axis, we just
// vary it. Captures are taken inside a fixed 6-column Grid so the span
// count is visually unambiguous (a 4-span cell inside a 6-column Grid
// clearly leaves 2 tracks of tail cells).

import "../../styles/styles.css";

import type { ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Card } from "../Card/Card";
import { Grid } from "../Grid/Grid";
import { PS1Root } from "../PS1Root/PS1Root";
import { GridItem } from "./GridItem";

const COL_SPANS = [1, 2, 3, 4, 6] as const;

// Frame width sized so 6 tracks stay visually distinguishable — 320 / 6 =
// ~53 px per track before gap, which reads clearly at the default gap.
const FRAME_WIDTH = 320;

// Compact Card padding so cells stay visually distinct even at
// colSpan=1 within a 6-column Grid.
const cell = (label: string): ReactNode => (
  <Card key={label} style={{ padding: 8, textAlign: "center" }}>
    {label}
  </Card>
);

type Case = { name: string; stageWidth: number; node: () => ReactNode };

// Responsive colSpan object used for the per-band VRT cases. Distinct
// span per breakpoint so the captured baseline reflects an unambiguous
// effective count.
const RESPONSIVE_COL_SPAN = {
  base: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 6,
} as const satisfies Record<"base" | "sm" | "md" | "lg" | "xl", number>;

const CASES: readonly Case[] = [
  ...COL_SPANS.map(
    (n): Case => ({
      name: `col-span-${n}`,
      stageWidth: FRAME_WIDTH,
      // Wrap in a fixed 6-column Grid so the effective span reads
      // unambiguously (a 4-span cell leaves 2 tracks of trailing cells).
      // A single trailing cell then makes the boundary visible.
      node: () => (
        <Grid columns={6}>
          <GridItem colSpan={n}>{cell(`span ${n}`)}</GridItem>
          {Array.from({ length: Math.max(0, 6 - n) }, (_, i) => (
            <GridItem key={i}>{cell(String(i + 1))}</GridItem>
          ))}
        </Grid>
      ),
    }),
  ),
  // Responsive colSpan cascade — one baseline per breakpoint band.
  // PS1Root supplies the containment ancestor for @container queries in
  // GridItem.css (via the parent Grid it renders around). A 6-column Grid
  // frames the span so the effective value shows against 6 tracks in every
  // band.
  // 320 CSS px width doubles as the WCAG 2.2 SC 1.4.10 (Reflow) baseline —
  // proves the hero cell collapses back to a single track at the narrowest
  // supported viewport without horizontal overflow.
  {
    name: "responsive-col-span-below-sm-wcag-320",
    stageWidth: 320,
    node: () => (
      <PS1Root>
        <Grid columns={6}>
          <GridItem colSpan={RESPONSIVE_COL_SPAN}>{cell("hero")}</GridItem>
          {Array.from({ length: 5 }, (_, i) => (
            <GridItem key={i}>{cell(String(i + 1))}</GridItem>
          ))}
        </Grid>
      </PS1Root>
    ),
  },
  {
    name: "responsive-col-span-sm-band",
    stageWidth: 700,
    node: () => (
      <PS1Root>
        <Grid columns={6}>
          <GridItem colSpan={RESPONSIVE_COL_SPAN}>{cell("hero")}</GridItem>
          {Array.from({ length: 5 }, (_, i) => (
            <GridItem key={i}>{cell(String(i + 1))}</GridItem>
          ))}
        </Grid>
      </PS1Root>
    ),
  },
  {
    name: "responsive-col-span-md-band",
    stageWidth: 900,
    node: () => (
      <PS1Root>
        <Grid columns={6}>
          <GridItem colSpan={RESPONSIVE_COL_SPAN}>{cell("hero")}</GridItem>
          {Array.from({ length: 5 }, (_, i) => (
            <GridItem key={i}>{cell(String(i + 1))}</GridItem>
          ))}
        </Grid>
      </PS1Root>
    ),
  },
  {
    name: "responsive-col-span-lg-band",
    stageWidth: 1200,
    node: () => (
      <PS1Root>
        <Grid columns={6}>
          <GridItem colSpan={RESPONSIVE_COL_SPAN}>{cell("hero")}</GridItem>
          {Array.from({ length: 5 }, (_, i) => (
            <GridItem key={i}>{cell(String(i + 1))}</GridItem>
          ))}
        </Grid>
      </PS1Root>
    ),
  },
  {
    name: "responsive-col-span-xl-band",
    stageWidth: 1400,
    node: () => (
      <PS1Root>
        <Grid columns={6}>
          <GridItem colSpan={RESPONSIVE_COL_SPAN}>{cell("hero")}</GridItem>
          {Array.from({ length: 5 }, (_, i) => (
            <GridItem key={i}>{cell(String(i + 1))}</GridItem>
          ))}
        </Grid>
      </PS1Root>
    ),
  },
];

describe("GridItem VRT", () => {
  test.for(CASES)("$name", async ({ name, stageWidth, node }) => {
    const screen = await render(<VrtFrame width={stageWidth}>{node()}</VrtFrame>);
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(name);
  });
});
