// Visual regression baseline for Th. Renders both header positions inside a
// real <Table>: column headers in the thead and a scope="row" header in the
// body — the th styling (surface background, weight, start alignment) must
// read the same in both. A visual drift here vs. the equivalent Table
// capture would mean `.ps1ui-th` had grown its own rules that diverge from
// the bare-<th> baseline.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Table } from "../Table/Table";
import { Tbody } from "../Tbody/Tbody";
import { Td } from "../Td/Td";
import { Thead } from "../Thead/Thead";
import { Tr } from "../Tr/Tr";
import { Th } from "./Th";

// Viewport-safe: 360 + VrtFrame's 40px padding stays under the 414 tester
// viewport, past which captures rasterise as void.
const FRAME_WIDTH = 360;

describe("Th VRT", () => {
  test("column and row headers inside a Table", async () => {
    const screen = await render(
      <VrtFrame width={FRAME_WIDTH}>
        <Table>
          <Thead>
            <Tr>
              <Th scope="col">Component</Th>
              <Th scope="col">Element</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Th scope="row">Button</Th>
              <Td>button</Td>
            </Tr>
            <Tr>
              <Th scope="row">Anchor</Th>
              <Td>a</Td>
            </Tr>
          </Tbody>
        </Table>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("inside-table");
  });
});
