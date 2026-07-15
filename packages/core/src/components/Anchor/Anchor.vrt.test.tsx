// Visual regression baseline for Anchor. Covers every variant × interaction
// state — Anchor's CSS layers color + text-decoration-color shifts per state
// (subtle even decouples the two in its default), so a state matrix is the
// only reliable net against a token or precedence drift silently changing
// how links read against the page.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { server } from "vitest/browser";
import { type PseudoClass, withPseudoStateFor } from "../../testing/pseudo-state";
import { VrtFrame } from "../../testing/vrt";
import { Anchor, type AnchorVariant } from "./Anchor";

const VARIANTS = ["primary", "subtle"] as const satisfies readonly AnchorVariant[];
const STATES = ["default", "hover", "focus-visible", "active"] as const;
const PSEUDO_STATES = [
  "hover",
  "focus-visible",
  "active",
] as const satisfies readonly PseudoClass[];
const CASES = VARIANTS.flatMap((variant) => STATES.map((state) => ({ variant, state })));

describe("Anchor VRT", () => {
  test.for(CASES)("variant=$variant / state=$state", async ({ variant, state }, ctx) => {
    // Same WebKit skip as Button/Button.contrast: macOS Safari's default
    // "Full Keyboard Access" excludes <a href> from the Tab sequence too,
    // so :focus-visible can't be authentically reached on WebKit.
    ctx.skip(
      state === "focus-visible" && server.browser === "webkit",
      "macOS Safari Full Keyboard Access excludes <a href> from Tab",
    );
    // Known flake — same pattern as Button secondary focus-visible: the
    // subtle variant's `color: inherit` + focus-ring alpha blend renders
    // inconsistently across successive Firefox captures. See
    // packages/core/CLAUDE.md § "Known VRT flakes".
    ctx.skip(
      variant === "subtle" && state === "focus-visible" && server.browser === "firefox",
      "Firefox: subtle + focus-visible rasterises inconsistently across captures",
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
});
