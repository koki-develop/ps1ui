// Visual regression baseline for TabPanel. Captures the panel's own padding
// + typography in isolation from the tab-list geometry (Tabs.vrt captures
// them together).

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { TabPanel } from "./TabPanel";

describe("TabPanel VRT", () => {
  test("default", async () => {
    const screen = await render(
      <VrtFrame width={340}>
        <TabPanel value="a" aria-label="apple" data-testid="vrt-target">
          Panel content sits on the same monospace grid as the rest of the toolkit.
        </TabPanel>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("default");
  });
});
