// Visual regression baseline for Td. Renders inside a real <Table> with a
// colSpan cell so the capture pins both the shared-with-<td> rendering (the
// collapsed cell grid) and a spanning cell's merged borders. A visual drift
// here vs. the equivalent Table capture would mean `.ps1ui-td` had grown its
// own rules that diverge from the bare-<td> baseline.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Table } from "../Table/Table";
import { Tbody } from "../Tbody/Tbody";
import { Th } from "../Th/Th";
import { Thead } from "../Thead/Thead";
import { Tr } from "../Tr/Tr";
import { Td } from "./Td";

// Viewport-safe: 360 + VrtFrame's 40px padding stays under the 414 tester
// viewport, past which captures rasterise as void.
const FRAME_WIDTH = 360;

describe("Td VRT", () => {
  test("inside a Table, including a colSpan cell", async () => {
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
              <Td colSpan={2}>Deprecated — use the responsive props instead</Td>
            </Tr>
          </Tbody>
        </Table>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("inside-table");
  });
});
