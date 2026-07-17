// Visual regression baseline for Tr. Renders a <Tr> row and a bare <tr> row
// side by side inside a real <Table> — the pixel capture pins the same
// "renders identically to the bare element" contract the unit interop test
// asserts on computed styles. A visible difference between the two rows would
// mean `.ps1ui-tr` had grown its own rules that diverge from the bare-<tr>
// baseline. (The fixture is deliberately distinct from Tbody's capture so the
// two baselines don't duplicate pixel-for-pixel.)

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Table } from "../Table/Table";
import { Tbody } from "../Tbody/Tbody";
import { Td } from "../Td/Td";
import { Th } from "../Th/Th";
import { Thead } from "../Thead/Thead";
import { Tr } from "./Tr";

// Viewport-safe: 360 + VrtFrame's 40px padding stays under the 414 tester
// viewport, past which captures rasterise as void.
const FRAME_WIDTH = 360;

describe("Tr VRT", () => {
  test("Tr row and bare tr row render identically inside a Table", async () => {
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
            <tr>
              <Td>reversed</Td>
              <Td>boolean</Td>
            </tr>
          </Tbody>
        </Table>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("tr-vs-bare-tr");
  });
});
