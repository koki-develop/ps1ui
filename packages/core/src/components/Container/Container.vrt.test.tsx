// Visual regression baselines for Container. Container's ink is purely
// structural (width capping + centering + horizontal padding), so each
// baseline pins a Card marker inside the container to make padding and
// outer bounds visible. A regression on the container-size tokens, on the
// --ps1ui-space-* padding scale, or on the responsive cascade in
// Container.css would surface as a diff.
//
// Responsive cases wrap the Container in a PS1Root sized to a specific
// pixel width; that width becomes the inline-size for `@container` queries
// in Container.css. Each width lands in one breakpoint band so the
// captured baseline reflects a single, deterministic effective size.

import "../../styles/styles.css";

import type { ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Card } from "../Card/Card";
import { PS1Root } from "../PS1Root/PS1Root";
import { Container, type ContainerSize } from "./Container";

const SIZES = ["sm", "md", "lg", "xl", "full"] as const satisfies readonly ContainerSize[];

// Fixed stage width chosen so the frame is wider than `sm` (640) but
// narrower than `md`/`lg`/`xl` (768/1024/1280). Effect:
//   size=sm   → capped at 640, centered in 700 → visible left/right gutters
//   size=md/lg/xl → parent (700) narrower than max-width → fills stage
//   size=full → fills stage (max-width: none)
// This isolates the sm-vs-larger difference in a single baseline width
// without inflating every PNG to 1400px+ to differentiate xl.
const STAGE_WIDTH = 700;

const marker = (label: string): ReactNode => <Card style={{ padding: 12 }}>{label}</Card>;

type Case = { name: string; stageWidth: number; node: () => ReactNode };

const RESPONSIVE_SIZE = {
  base: "sm",
  sm: "md",
  md: "lg",
  lg: "xl",
  xl: "full",
} as const satisfies Record<"base" | "sm" | "md" | "lg" | "xl", ContainerSize>;

const CASES: readonly Case[] = [
  ...SIZES.map(
    (size): Case => ({
      name: `size-${size}`,
      stageWidth: STAGE_WIDTH,
      node: () => <Container size={size}>{marker(`size=${size}`)}</Container>,
    }),
  ),
  {
    name: "px-none",
    stageWidth: STAGE_WIDTH,
    node: () => (
      <Container size="full" px="none">
        {marker("px=none")}
      </Container>
    ),
  },
  // Responsive size cascade — one baseline per breakpoint band. PS1Root
  // supplies the containment ancestor for @container queries in
  // Container.css. RESPONSIVE_SIZE maps each breakpoint to a distinct
  // ContainerSize so the captured effective size is unambiguously the
  // one for that band.
  // 320 CSS px width doubles as the WCAG 2.2 SC 1.4.10 (Reflow) baseline —
  // proves the container primitive fits and centers without horizontal
  // overflow at the narrowest supported viewport. The same effective size
  // (base entry) would apply at any width below sm (< 40rem).
  {
    name: "responsive-size-below-sm-wcag-320",
    stageWidth: 320,
    node: () => (
      <PS1Root>
        <Container size={RESPONSIVE_SIZE}>{marker("base (sm)")}</Container>
      </PS1Root>
    ),
  },
  {
    name: "responsive-size-sm-band",
    stageWidth: 700,
    node: () => (
      <PS1Root>
        <Container size={RESPONSIVE_SIZE}>{marker("sm (md)")}</Container>
      </PS1Root>
    ),
  },
  {
    name: "responsive-size-md-band",
    stageWidth: 900,
    node: () => (
      <PS1Root>
        <Container size={RESPONSIVE_SIZE}>{marker("md (lg)")}</Container>
      </PS1Root>
    ),
  },
  {
    name: "responsive-size-lg-band",
    stageWidth: 1200,
    node: () => (
      <PS1Root>
        <Container size={RESPONSIVE_SIZE}>{marker("lg (xl)")}</Container>
      </PS1Root>
    ),
  },
  {
    name: "responsive-size-xl-band",
    stageWidth: 1400,
    node: () => (
      <PS1Root>
        <Container size={RESPONSIVE_SIZE}>{marker("xl (full)")}</Container>
      </PS1Root>
    ),
  },
];

describe("Container VRT", () => {
  test.for(CASES)("$name", async ({ name, stageWidth, node }) => {
    const screen = await render(<VrtFrame width={stageWidth}>{node()}</VrtFrame>);
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(name);
  });
});
