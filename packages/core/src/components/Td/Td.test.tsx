import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { PROPS_TABLE_CHILDREN } from "../../testing/table";
import { Table } from "../Table/Table";
import { Tbody } from "../Tbody/Tbody";
import { Tr } from "../Tr/Tr";
import { Td } from "./Td";

describe("Td", () => {
  describe("rendering", () => {
    test("renders a <td> with the given children", async () => {
      const screen = await render(
        <table>
          <tbody>
            <tr>
              <Td data-testid="c">ordered</Td>
            </tr>
          </tbody>
        </table>,
      );
      const el = screen.getByTestId("c").element();
      expect(el.tagName.toLowerCase()).toBe("td");
      expect(el.textContent).toBe("ordered");
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-td base class", async () => {
      const screen = await render(
        <table>
          <tbody>
            <tr>
              <Td data-testid="c">a</Td>
            </tr>
          </tbody>
        </table>,
      );
      await expect.element(screen.getByTestId("c")).toHaveClass("ps1ui-td");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <table>
          <tbody>
            <tr>
              <Td data-testid="c" className="extra">
                a
              </Td>
            </tr>
          </tbody>
        </table>,
      );
      const el = screen.getByTestId("c");
      await expect.element(el).toHaveClass("ps1ui-td");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native <td> attributes (colSpan, rowSpan, headers, data-*)", async () => {
      const screen = await render(
        <table>
          <tbody>
            <tr>
              <Td colSpan={2} rowSpan={2} headers="prop" data-testid="c" data-custom="v">
                a
              </Td>
            </tr>
          </tbody>
        </table>,
      );
      const el = screen.getByTestId("c").element() as HTMLTableCellElement;
      expect(el.colSpan).toBe(2);
      expect(el.rowSpan).toBe(2);
      expect(el.headers).toBe("prop");
      expect(el.getAttribute("data-custom")).toBe("v");
    });

    test("forwards a ref to the underlying <td>", async () => {
      let captured: HTMLTableCellElement | null = null;
      await render(
        <table>
          <tbody>
            <tr>
              <Td
                ref={(node: HTMLTableCellElement | null) => {
                  captured = node;
                }}
                data-testid="c"
              >
                a
              </Td>
            </tr>
          </tbody>
        </table>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLTableCellElement).tagName.toLowerCase()).toBe("td");
    });
  });

  // Data-cell styling is a Table concern, not a Td concern — a bare <td> and
  // a <Td> must render identically inside a <Table>. Locking that in so a
  // future edit that migrates cell rules onto `.ps1ui-td` (breaking bare
  // <td> callers) trips the test.
  describe("interop with Table", () => {
    test("renders identically to a bare <td> in the same row", async () => {
      const screen = await render(
        <Table>
          <Tbody>
            <Tr>
              <Td data-testid="c-wrapped">ordered</Td>
              <td data-testid="c-bare">boolean</td>
            </Tr>
          </Tbody>
        </Table>,
      );
      const wrapped = getComputedStyle(screen.getByTestId("c-wrapped").element());
      const bare = getComputedStyle(screen.getByTestId("c-bare").element());
      expect(wrapped.borderTopWidth).toBe(bare.borderTopWidth);
      expect(wrapped.borderTopColor).toBe(bare.borderTopColor);
      expect(wrapped.textAlign).toBe(bare.textAlign);
      expect(wrapped.verticalAlign).toBe(bare.verticalAlign);
      expect(wrapped.padding).toBe(bare.padding);
    });
  });

  describe("a11y", () => {
    test("inside a full Table → no axe violations", async () => {
      const screen = await render(
        <Table aria-label="component props">{PROPS_TABLE_CHILDREN}</Table>,
      );
      await expectNoAxeViolations(screen.container);
    });
  });
});
