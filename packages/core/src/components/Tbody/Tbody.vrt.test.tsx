// Visual regression baseline for Tbody. Renders inside a real <Table> so the
// capture pins the shared-with-<tbody> rendering (the collapsed cell grid)
// that Table.vrt.test.tsx already covers. A visual drift here vs. the
// equivalent Table capture would mean `.ps1ui-tbody` had grown its own rules
// that diverge from the bare-<tbody> baseline.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Table } from "../Table/Table";
import { Td } from "../Td/Td";
import { Th } from "../Th/Th";
import { Thead } from "../Thead/Thead";
import { Tr } from "../Tr/Tr";
import { Tbody } from "./Tbody";

// Viewport-safe: 360 + VrtFrame's 40px padding stays under the 414 tester
// viewport, past which captures rasterise as void.
const FRAME_WIDTH = 360;

describe("Tbody VRT", () => {
  test("renders identically to a bare <tbody> inside a Table", async () => {
    const screen = await render(
      <VrtFrame width={FRAME_WIDTH}>
        <Table>
          <Thead>
            <Tr>
              <Th scope="col">Prop</Th>
              <Th scope="col">Type</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Td>ordered</Td>
              <Td>boolean</Td>
            </Tr>
            <Tr>
              <Td>className</Td>
              <Td>string</Td>
            </Tr>
          </Tbody>
        </Table>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("inside-table");
  });
});
