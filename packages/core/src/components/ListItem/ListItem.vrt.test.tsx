// Visual regression baseline for ListItem. Renders inside a real <List> so
// the capture pins the shared-with-<li> rendering of the marker + hanging
// indent that List.vrt.test.tsx already covers on bare <li>. A visual drift
// here vs. the equivalent List capture would mean `.ps1ui-list__item` had
// grown its own rules that diverge from the plain-<li> baseline.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { List } from "../List/List";
import { ListItem } from "./ListItem";

const FRAME_WIDTH = 320;

describe("ListItem VRT", () => {
  test("renders identically to a bare <li> inside a List", async () => {
    const screen = await render(
      <VrtFrame width={FRAME_WIDTH}>
        <List>
          <ListItem>install the package</ListItem>
          <ListItem>import the styles entry</ListItem>
          <ListItem>wrap your tree in PS1Root</ListItem>
        </List>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("inside-list");
  });
});
