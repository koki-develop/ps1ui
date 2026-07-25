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
      // An unselected tab holding focus is not a state this widget can be in.
      // Tab.tsx's roving tabindex keeps every unselected tab out of the Tab
      // sequence (`tabIndex={selected ? 0 : -1}`), and TabList drives arrow
      // keys with AUTOMATIC activation — focus and selection move together, so
      // the moment focus lands on a tab it is selected. The `selected` row
      // below already captures the only reachable focus-visible appearance.
      //
      // This combination used to "pass" by capturing an unfocused tab under a
      // focus-visible name: withPseudoState only checked that Tab landed on the
      // element, which it did not, and nothing verified the pseudo-class ever
      // matched. It now fails loudly instead (see establishFocus in
      // src/testing/pseudo-state.ts), which is what surfaced this.
      ctx.skip(
        interaction === "focus-visible" && selected === "unselected",
        "roving tabindex + automatic activation: an unselected tab can never hold focus",
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
