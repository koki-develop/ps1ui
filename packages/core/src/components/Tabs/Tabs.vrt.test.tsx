// Visual regression baseline for Tabs. Covers the two integration concerns
// that Tab / TabList / TabPanel baselines can't: (1) the selected-tab
// indicator sitting exactly on the tablist's own baseline (margin-bottom: -1px
// pull), and (2) horizontal vs. vertical layout end-to-end with a panel
// alongside.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Tab } from "../Tab/Tab";
import { TabList } from "../TabList/TabList";
import { TabPanel } from "../TabPanel/TabPanel";
import { Tabs } from "./Tabs";

type Orientation = "horizontal" | "vertical";
type Selection = "first" | "middle";

const ORIENTATIONS = ["horizontal", "vertical"] as const satisfies readonly Orientation[];
const SELECTIONS = ["first", "middle"] as const satisfies readonly Selection[];

const CASES = ORIENTATIONS.flatMap((orientation) =>
  SELECTIONS.map((selection) => ({ orientation, selection })),
);

describe("Tabs VRT", () => {
  test.for(CASES)(
    "orientation=$orientation / selection=$selection",
    async ({ orientation, selection }) => {
      const selected = selection === "first" ? "overview" : "install";
      const screen = await render(
        <VrtFrame width={340}>
          <Tabs defaultValue={selected} orientation={orientation} data-testid="vrt-target">
            <TabList aria-label="doc sections">
              <Tab value="overview">Overview</Tab>
              <Tab value="install">Install</Tab>
              <Tab value="api">API</Tab>
            </TabList>
            <TabPanel value="overview">Overview content.</TabPanel>
            <TabPanel value="install">Install content.</TabPanel>
            <TabPanel value="api">API content.</TabPanel>
          </Tabs>
        </VrtFrame>,
      );

      await expect
        .element(screen.getByTestId("vrt-frame"))
        .toMatchScreenshot(`${orientation}-${selection}`);
    },
  );
});
