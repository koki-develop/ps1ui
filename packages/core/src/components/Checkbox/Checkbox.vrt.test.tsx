// Visual regression baseline for Checkbox. The rotated-L checkmark and the
// indeterminate bar are both CSS pseudo-element geometry that survives ONLY
// as long as base.css keeps its `box-sizing: border-box` reset off pseudo
// elements (see Checkbox.css and reset.test.tsx). VRT pins that geometry
// end-to-end so a future reset change collapses the mark into a diff instead
// of silently squashing the border trick.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { server } from "vitest/browser";
import { type PseudoClass, withPseudoStateFor } from "../../testing/pseudo-state";
import { VrtFrame } from "../../testing/vrt";
import { Checkbox } from "./Checkbox";

type CheckedState = "unchecked" | "checked" | "indeterminate";
type Interaction = "default" | "hover" | "focus-visible" | "disabled";

const CHECKED_STATES = [
  "unchecked",
  "checked",
  "indeterminate",
] as const satisfies readonly CheckedState[];
const INTERACTIONS = [
  "default",
  "hover",
  "focus-visible",
  "disabled",
] as const satisfies readonly Interaction[];
const PSEUDO_STATES = ["hover", "focus-visible"] as const satisfies readonly PseudoClass[];

const CASES = CHECKED_STATES.flatMap((checked) =>
  INTERACTIONS.map((interaction) => ({ checked, interaction })),
);

describe("Checkbox VRT", () => {
  test.for(CASES)(
    "checked=$checked / interaction=$interaction",
    async ({ checked, interaction }, ctx) => {
      // Same WebKit skip as Button/Anchor: macOS Safari's default "Full
      // Keyboard Access" excludes non-text form controls (checkbox included)
      // from the Tab sequence, so :focus-visible can't be authentically
      // reached on the WebKit provider.
      ctx.skip(
        interaction === "focus-visible" && server.browser === "webkit",
        "macOS Safari Full Keyboard Access excludes <input type=checkbox> from Tab",
      );

      const screen = await render(
        <VrtFrame>
          <Checkbox
            aria-label="agree"
            data-testid="vrt-target"
            defaultChecked={checked === "checked"}
            indeterminate={checked === "indeterminate"}
            disabled={interaction === "disabled"}
          />
        </VrtFrame>,
      );

      await withPseudoStateFor(
        '[data-testid="vrt-target"]',
        interaction,
        PSEUDO_STATES,
        async () => {
          await expect
            .element(screen.getByTestId("vrt-frame"))
            .toMatchScreenshot(`${checked}-${interaction}`);
        },
      );
    },
  );
});
