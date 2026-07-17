// Visual regression baseline for Details. Covers the four visually-distinct
// permutations: closed / open + summary interaction states (hover, focus).
// The `open` axis is a static render variant (the details attribute), not a
// pseudo-state, so it does not compose with hover/focus here.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { server } from "vitest/browser";
import { type PseudoClass, withPseudoStateFor } from "../../testing/pseudo-state";
import { VrtFrame } from "../../testing/vrt";
import { Details } from "./Details";

type State = "closed" | "open" | "hover" | "focus-visible";
const STATES: readonly State[] = ["closed", "open", "hover", "focus-visible"];
const PSEUDO_STATES = ["hover", "focus-visible"] as const satisfies readonly PseudoClass[];

// Fixed width so the closed / open captures share the same summary metrics —
// details itself has no intrinsic width and would otherwise collapse to the
// summary text.
const FRAME_WIDTH = 320;

describe("Details VRT", () => {
  test.for(STATES.map((state) => ({ state })))("state=$state", async ({ state }, ctx) => {
    // Same reasoning as Anchor / Button VRT: macOS Safari's default
    // "Full Keyboard Access" narrows Tab to text form controls, and the
    // Playwright WebKit build matches that default — :focus-visible on a
    // <summary> is not authentically reachable there.
    ctx.skip(
      state === "focus-visible" && server.browser === "webkit",
      "macOS Safari Full Keyboard Access excludes <summary> from Tab",
    );

    const screen = await render(
      <VrtFrame width={FRAME_WIDTH}>
        <Details summary="Components" open={state === "open"}>
          Button, Anchor, Card, Checkbox
        </Details>
      </VrtFrame>,
    );

    // Pseudo-state target is the summary — that's the interactive element
    // that owns :hover and :focus-visible in Details.css. The class hook
    // (rather than a data-testid) is used because the summary is created
    // internally by the component; the class is a stable ps1ui contract.
    await withPseudoStateFor(".ps1ui-details__summary", state, PSEUDO_STATES, async () => {
      await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(state);
    });
  });
});
