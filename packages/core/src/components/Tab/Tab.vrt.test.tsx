// Visual regression baseline for Tab. Isolates the per-tab visual states
// (default / hover / focus-visible / disabled × selected / unselected) that
// Tabs' end-to-end capture can't drive individually.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { server } from "vitest/browser";
import { type PseudoClass, withPseudoStateFor } from "../../testing/pseudo-state";
import { VrtFrame } from "../../testing/vrt";
import { TabList } from "../TabList/TabList";
import { Tabs } from "../Tabs/Tabs";
import { Tab } from "./Tab";

type SelectedState = "unselected" | "selected";
type Interaction = "default" | "hover" | "focus-visible" | "disabled";

const SELECTED_STATES = ["unselected", "selected"] as const satisfies readonly SelectedState[];
const INTERACTIONS = [
  "default",
  "hover",
  "focus-visible",
  "disabled",
] as const satisfies readonly Interaction[];
const PSEUDO_STATES = ["hover", "focus-visible"] as const satisfies readonly PseudoClass[];

const CASES = SELECTED_STATES.flatMap((selected) =>
  INTERACTIONS.map((interaction) => ({ selected, interaction })),
);

describe("Tab VRT", () => {
  test.for(CASES)(
    "selected=$selected / interaction=$interaction",
    async ({ selected, interaction }, ctx) => {
      // Same WebKit skip as Button / Checkbox / Radio: macOS Safari's default
      // "Full Keyboard Access" excludes non-text form controls (including
      // <button>) from the Tab sequence, so :focus-visible can't be
      // authentically reached on the WebKit provider.
      ctx.skip(
        interaction === "focus-visible" && server.browser === "webkit",
        "macOS Safari Full Keyboard Access excludes <button> from Tab",
      );

      const screen = await render(
        <VrtFrame>
          <Tabs defaultValue={selected === "selected" ? "target" : "other"}>
            <TabList aria-label="x">
              <Tab value="target" data-testid="vrt-target" disabled={interaction === "disabled"}>
                Tab
              </Tab>
            </TabList>
          </Tabs>
        </VrtFrame>,
      );

      await withPseudoStateFor(
        '[data-testid="vrt-target"]',
        interaction,
        PSEUDO_STATES,
        async () => {
          await expect
            .element(screen.getByTestId("vrt-frame"))
            .toMatchScreenshot(`${selected}-${interaction}`);
        },
      );
    },
  );
});
