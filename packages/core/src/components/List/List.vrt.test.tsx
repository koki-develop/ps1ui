// Visual regression baseline for List. Four cases pin the visually-distinct
// axes: the unordered marker (`-`), the ordered numeric counter with
// tabular-num alignment, the wrapped-item hanging indent (marker column
// stays fixed while content wraps), and a nested ordered list (independent
// counter + stacked indent). List has no interactive states, so no
// pseudo-state matrix.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { ListItem } from "../ListItem/ListItem";
import { List } from "./List";

const FRAME_WIDTH = 320;

describe("List VRT", () => {
  test("unordered", async () => {
    const screen = await render(
      <VrtFrame width={FRAME_WIDTH}>
        <List>
          <ListItem>install the package</ListItem>
          <ListItem>import the styles entry</ListItem>
          <ListItem>wrap your tree in PS1Root</ListItem>
        </List>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("unordered");
  });

  test("ordered", async () => {
    // Ten items on purpose — single-digit vs double-digit numbering shows the
    // tabular-nums + right-align + 2ch marker column staying flush across the
    // digit-count boundary.
    const screen = await render(
      <VrtFrame width={FRAME_WIDTH}>
        <List ordered>
          <ListItem>parse the argv</ListItem>
          <ListItem>resolve the config</ListItem>
          <ListItem>dispatch the command</ListItem>
          <ListItem>load the plugins</ListItem>
          <ListItem>read the input</ListItem>
          <ListItem>transform the data</ListItem>
          <ListItem>render the output</ListItem>
          <ListItem>flush the streams</ListItem>
          <ListItem>write the exit code</ListItem>
          <ListItem>close the process</ListItem>
        </List>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("ordered");
  });

  test("wrapping items keep the hanging indent", async () => {
    const screen = await render(
      <VrtFrame width={FRAME_WIDTH}>
        <List>
          <ListItem>
            a first item whose content is deliberately long enough to wrap onto a second line so the
            hanging indent is visible
          </ListItem>
          <ListItem>a shorter second item for contrast</ListItem>
        </List>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("wrapping");
  });

  test("nested ordered list", async () => {
    const screen = await render(
      <VrtFrame width={FRAME_WIDTH}>
        <List ordered>
          <ListItem>build the package</ListItem>
          <ListItem>
            run the checks
            <List ordered>
              <ListItem>typecheck</ListItem>
              <ListItem>unit tests</ListItem>
              <ListItem>visual regression</ListItem>
            </List>
          </ListItem>
          <ListItem>publish</ListItem>
        </List>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("nested-ordered");
  });
});
