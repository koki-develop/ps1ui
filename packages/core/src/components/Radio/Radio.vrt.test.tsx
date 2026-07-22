// Visual regression baseline for Radio. The inner dot is CSS pseudo-element
// geometry (a `::after` circle absolutely positioned via translate) — pin it
// end-to-end so a future reset change or geometry regression fails as a diff
// instead of silently squashing the mark.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { server } from "vitest/browser";
import { type PseudoClass, withPseudoStateFor } from "../../testing/pseudo-state";
import { VrtFrame } from "../../testing/vrt";
import { Radio } from "./Radio";

type CheckedState = "unchecked" | "checked";
type Interaction = "default" | "hover" | "focus-visible" | "disabled";

const CHECKED_STATES = ["unchecked", "checked"] as const satisfies readonly CheckedState[];
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

describe("Radio VRT", () => {
  test.for(CASES)(
    "checked=$checked / interaction=$interaction",
    async ({ checked, interaction }, ctx) => {
      // Same WebKit skip as Checkbox/Button/Anchor: macOS Safari's default
      // "Full Keyboard Access" excludes non-text form controls (radio
      // included) from the Tab sequence, so :focus-visible can't be
      // authentically reached on the WebKit provider.
      ctx.skip(
        interaction === "focus-visible" && server.browser === "webkit",
        "macOS Safari Full Keyboard Access excludes <input type=radio> from Tab",
      );

      const screen = await render(
        <VrtFrame>
          <Radio
            aria-label="pick"
            data-testid="vrt-target"
            defaultChecked={checked === "checked"}
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
