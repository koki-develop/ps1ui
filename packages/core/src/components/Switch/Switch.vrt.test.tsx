// Visual regression baseline for Switch. The thumb is a CSS pseudo element
// whose on-position is a `transform` against the track's padding box — a
// purely geometric relationship between three numbers in Switch.css that no
// unit assertion can see the RESULT of. Switch.thumb-geometry.test.tsx pins
// the numbers; VRT pins what they paint, so a track/thumb/travel edit that
// still satisfies the arithmetic but reads wrong lands as a diff.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { server } from "vitest/browser";
import { type PseudoClass, withPseudoStateFor } from "../../testing/pseudo-state";
import { VrtFrame } from "../../testing/vrt";
import { Switch } from "./Switch";

type CheckedState = "off" | "on";
type Interaction = "default" | "hover" | "focus-visible" | "disabled";

const CHECKED_STATES = ["off", "on"] as const satisfies readonly CheckedState[];
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

describe("Switch VRT", () => {
  test.for(CASES)(
    "checked=$checked / interaction=$interaction",
    async ({ checked, interaction }, ctx) => {
      // Same WebKit skip as Checkbox: macOS Safari's default "Full Keyboard
      // Access" excludes non-text form controls from the Tab sequence, so
      // :focus-visible can't be authentically reached on the WebKit provider.
      ctx.skip(
        interaction === "focus-visible" && server.browser === "webkit",
        "macOS Safari Full Keyboard Access excludes <input type=checkbox> from Tab",
      );

      const screen = await render(
        <VrtFrame>
          <Switch
            aria-label="enable notifications"
            data-testid="vrt-target"
            defaultChecked={checked === "on"}
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
