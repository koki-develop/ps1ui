// Visual regression baseline for Table. Not a variant matrix — each case
// pins a distinct rendering path:
//   - `basic`: the collapsed single-stroke grid, the thead surface
//     background + border-strong bottom rule, start-aligned cells.
//   - `row-headers`: th styling applying to scope="row" cells in the body,
//     not just the thead.
//   - `scrollable`: a narrow frame + unbreakable content exercises the
//     measurement that keeps tabIndex=0 on the scroller — captures the
//     clipped grid with the scroll overflow.
//   - `scroller-focus-visible`: same layout, focused — pins the shared
//     box-shadow ring on the scroll wrapper, which only appears once the
//     wrapper is keyboard-reachable.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { server } from "vitest/browser";
import { withPseudoState } from "../../testing/pseudo-state";
import { VrtFrame } from "../../testing/vrt";
import { Tbody } from "../Tbody/Tbody";
import { Td } from "../Td/Td";
import { Th } from "../Th/Th";
import { Thead } from "../Thead/Thead";
import { Tr } from "../Tr/Tr";
import { Table } from "./Table";

// The tester viewport is 414 wide and content past it rasterises as void in
// captures — WIDE + VrtFrame's 40px padding must stay under 414.
const WIDE = 360;
// Narrow enough that the unbreakable identifier below forces the table past
// the frame and into the scrollable path.
const NARROW = 240;

const BASIC = (
  <Table>
    <Thead>
      <Tr>
        <Th scope="col">Prop</Th>
        <Th scope="col">Type</Th>
        <Th scope="col">Default</Th>
      </Tr>
    </Thead>
    <Tbody>
      <Tr>
        <Td>ordered</Td>
        <Td>boolean</Td>
        <Td>false</Td>
      </Tr>
      <Tr>
        <Td>className</Td>
        <Td>string</Td>
        <Td>—</Td>
      </Tr>
    </Tbody>
  </Table>
);

const SCROLLABLE = (
  <Table>
    <Thead>
      <Tr>
        <Th scope="col">Prop</Th>
        <Th scope="col">Type</Th>
      </Tr>
    </Thead>
    <Tbody>
      <Tr>
        <Td>language</Td>
        <Td>{"CodeBlockLanguageOrAnyOtherVeryLongTypeName"}</Td>
      </Tr>
    </Tbody>
  </Table>
);

describe("Table VRT", () => {
  test("basic", async () => {
    const screen = await render(<VrtFrame width={WIDE}>{BASIC}</VrtFrame>);
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("basic");
  });

  test("row headers", async () => {
    const screen = await render(
      <VrtFrame width={WIDE}>
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
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("row-headers");
  });

  test("scrollable", async () => {
    const screen = await render(<VrtFrame width={NARROW}>{SCROLLABLE}</VrtFrame>);
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("scrollable");
  });

  test("scroller focus-visible", async (ctx) => {
    // The scroller is a div with tabindex=0 — macOS Safari's default Full
    // Keyboard Access excludes it from Tab, same as <pre tabindex=0>.
    ctx.skip(
      server.browser === "webkit",
      "macOS Safari Full Keyboard Access excludes tabindex=0 divs from Tab",
    );
    const screen = await render(<VrtFrame width={NARROW}>{SCROLLABLE}</VrtFrame>);
    // The pseudo-state target is the internal scroll wrapper, which caller
    // props (data-testid) can't reach — target its stable class instead.
    await withPseudoState(".ps1ui-table__scroller", ["focus-visible"], async () => {
      await expect
        .element(screen.getByTestId("vrt-frame"))
        .toMatchScreenshot("scroller-focus-visible");
    });
  });
});
