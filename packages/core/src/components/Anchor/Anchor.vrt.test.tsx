// Visual regression baseline for Anchor. Covers every variant × interaction
// state — Anchor's CSS layers color + text-decoration-color shifts per state
// (subtle even decouples the two in its default), so a state matrix is the
// only reliable net against a token or precedence drift silently changing
// how links read against the page.
//
// The `size` axis is captured separately at the default variant rather than
// crossed with the matrix above: size and colour are independent, and the
// cartesian product would only add near-duplicate swatches.

import "../../styles/styles.css";

import type { ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { server } from "vitest/browser";
import { type PseudoClass, withPseudoStateFor } from "../../testing/pseudo-state";
import { VrtFrame } from "../../testing/vrt";
import { PS1Root } from "../PS1Root/PS1Root";
import { Text } from "../Text/Text";
import { Anchor, type AnchorSize, type AnchorVariant } from "./Anchor";

const VARIANTS = ["primary", "subtle"] as const satisfies readonly AnchorVariant[];
const STATES = ["default", "hover", "focus-visible", "active"] as const;
const PSEUDO_STATES = [
  "hover",
  "focus-visible",
  "active",
] as const satisfies readonly PseudoClass[];
const CASES = VARIANTS.flatMap((variant) => STATES.map((state) => ({ variant, state })));

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const satisfies readonly AnchorSize[];

// Fixed stage width for the size captures. 320 keeps every step inside the
// 414px tester viewport (see .claude/rules/vrt.md) and pins the wrapping
// width so a size change diffs the glyphs, not the line breaks.
const FRAME_WIDTH = 320;

const SIZE_LABEL = "getting started";

// Responsive size cascade — one baseline per breakpoint band, each band a
// distinct step so the capture reflects an unambiguous effective size.
const RESPONSIVE_SIZE = {
  base: "xs",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
} as const satisfies Record<"base" | "sm" | "md" | "lg" | "xl", AnchorSize>;

type SizeCase = { name: string; stageWidth: number; node: () => ReactNode };

const SIZE_CASES: readonly SizeCase[] = [
  ...SIZES.map((size) => ({
    name: `size-${size}`,
    stageWidth: FRAME_WIDTH,
    node: () => (
      <Anchor href="#" size={size}>
        {SIZE_LABEL}
      </Anchor>
    ),
  })),
  // Responsive size — one capture per breakpoint band. PS1Root supplies the
  // containment ancestor the @container queries in Anchor.css need. The
  // 320px capture doubles as the WCAG 2.2 SC 1.4.10 (Reflow) baseline.
  ...(
    [
      { name: "responsive-size-below-sm-wcag-320", stageWidth: 320 },
      { name: "responsive-size-sm-band", stageWidth: 700 },
      { name: "responsive-size-md-band", stageWidth: 900 },
      { name: "responsive-size-lg-band", stageWidth: 1200 },
      { name: "responsive-size-xl-band", stageWidth: 1400 },
    ] as const
  ).map(({ name, stageWidth }) => ({
    name,
    stageWidth,
    node: () => (
      <PS1Root>
        <Anchor href="#" size={RESPONSIVE_SIZE}>
          {SIZE_LABEL}
        </Anchor>
      </PS1Root>
    ),
  })),
];

// Adornment row. The pixel diff is doing real work here that no computed-style
// assertion can: the underline has to stop at the label, leaving the icon and
// the gap between them bare. A regression there paints one link as two
// disconnected dashes — geometrically valid CSS, obviously wrong to a reader.
// Hover is captured per variant because subtle's underline is decoupled from
// its text colour at rest and only converges on hover.
const ADORNED_STATE_CASES = VARIANTS.flatMap((variant) =>
  (["default", "hover"] as const).map((state) => ({ variant, state })),
);

type ShapeCase = { name: string; node: () => ReactNode };

const SHAPE_CASES: readonly ShapeCase[] = [
  {
    name: "adorned-leading",
    node: () => (
      <Anchor href="#" leading={<span aria-hidden="true">←</span>}>
        back to all posts
      </Anchor>
    ),
  },
  {
    name: "adorned-both",
    node: () => (
      <Anchor
        href="#"
        leading={<span aria-hidden="true">→</span>}
        trailing={<span aria-hidden="true">↗</span>}
      >
        live
      </Anchor>
    ),
  },
  {
    // An adorned link stays inline-level, so it must still flow inside a
    // sentence — while never breaking between the word and its icon.
    name: "adorned-in-running-text",
    node: () => (
      <div style={{ width: 280 }}>
        <Text>
          The demo is deployed at{" "}
          <Anchor href="#" trailing={<span aria-hidden="true">↗</span>}>
            example.com
          </Anchor>{" "}
          and the code is on GitHub.
        </Text>
      </div>
    ),
  },
];

describe("Anchor VRT", () => {
  test.for(CASES)("variant=$variant / state=$state", async ({ variant, state }, ctx) => {
    // Same WebKit skip as Button/Button.contrast: macOS Safari's default
    // "Full Keyboard Access" excludes <a href> from the Tab sequence too,
    // so :focus-visible can't be authentically reached on WebKit.
    ctx.skip(
      state === "focus-visible" && server.browser === "webkit",
      "macOS Safari Full Keyboard Access excludes <a href> from Tab",
    );
    // href="#" — no navigation is ever attempted: the `active` state's
    // synthesized mouse-down + release would fire a real click on an
    // <a href>, but pseudo-state.ts's `suppressClick` intercepts it. Any
    // href would work; "#" keeps the fixture minimal without pretending
    // to point at a real page.
    const screen = await render(
      <VrtFrame>
        <Anchor href="#" variant={variant} data-testid="vrt-target">
          read the getting-started guide
        </Anchor>
      </VrtFrame>,
    );

    await withPseudoStateFor('[data-testid="vrt-target"]', state, PSEUDO_STATES, async () => {
      await expect
        .element(screen.getByTestId("vrt-frame"))
        .toMatchScreenshot(`${variant}-${state}`);
    });
  });

  test.for(SIZE_CASES)("$name", async ({ name, stageWidth, node }) => {
    const screen = await render(<VrtFrame width={stageWidth}>{node()}</VrtFrame>);
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(name);
  });

  test.for(ADORNED_STATE_CASES)(
    "adorned-trailing / variant=$variant / state=$state",
    async ({ variant, state }) => {
      const screen = await render(
        <VrtFrame>
          <Anchor
            href="#"
            variant={variant}
            trailing={<span aria-hidden="true">↗</span>}
            data-testid="vrt-target"
          >
            live site
          </Anchor>
        </VrtFrame>,
      );
      await withPseudoStateFor('[data-testid="vrt-target"]', state, PSEUDO_STATES, async () => {
        await expect
          .element(screen.getByTestId("vrt-frame"))
          .toMatchScreenshot(`adorned-trailing-${variant}-${state}`);
      });
    },
  );

  test.for(SHAPE_CASES)("$name", async ({ name, node }) => {
    const screen = await render(<VrtFrame>{node()}</VrtFrame>);
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(name);
  });
});
