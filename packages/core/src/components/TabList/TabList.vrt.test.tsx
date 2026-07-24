// Visual regression baseline for TabList. Isolates the tablist's own
// baseline stroke + orientation styling from Tabs' end-to-end layout.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Tab } from "../Tab/Tab";
import { Tabs } from "../Tabs/Tabs";
import { TabList } from "./TabList";

type Orientation = "horizontal" | "vertical";

const ORIENTATIONS = ["horizontal", "vertical"] as const satisfies readonly Orientation[];

describe("TabList VRT", () => {
  test.for(ORIENTATIONS)("orientation=%s", async (orientation) => {
    const screen = await render(
      <VrtFrame width={340}>
        <Tabs defaultValue="a" orientation={orientation}>
          <TabList aria-label="fruit" data-testid="vrt-target">
            <Tab value="a">Apple</Tab>
            <Tab value="b">Banana</Tab>
            <Tab value="c">Cherry</Tab>
          </TabList>
        </Tabs>
      </VrtFrame>,
    );

    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(orientation);
  });
});
