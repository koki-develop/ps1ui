import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Table } from "../Table/Table";
import { Tbody } from "../Tbody/Tbody";
import { Td } from "../Td/Td";
import { Thead } from "../Thead/Thead";
import { Tr } from "../Tr/Tr";
import { Th } from "./Th";

describe("Th", () => {
  describe("rendering", () => {
    test("renders a <th> with the given children", async () => {
      const screen = await render(
        <table>
          <thead>
            <tr>
              <Th data-testid="c">Prop</Th>
            </tr>
          </thead>
        </table>,
      );
      const el = screen.getByTestId("c").element();
      expect(el.tagName.toLowerCase()).toBe("th");
      expect(el.textContent).toBe("Prop");
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-th base class", async () => {
      const screen = await render(
        <table>
          <thead>
            <tr>
              <Th data-testid="c">Prop</Th>
            </tr>
          </thead>
        </table>,
      );
      await expect.element(screen.getByTestId("c")).toHaveClass("ps1ui-th");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <table>
          <thead>
            <tr>
              <Th data-testid="c" className="extra">
                Prop
              </Th>
            </tr>
          </thead>
        </table>,
      );
      const el = screen.getByTestId("c");
      await expect.element(el).toHaveClass("ps1ui-th");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native <th> attributes (scope, colSpan, abbr, data-*)", async () => {
      const screen = await render(
        <table>
          <thead>
            <tr>
              <Th scope="col" colSpan={2} abbr="property" data-testid="c" data-custom="v">
                Prop
              </Th>
            </tr>
          </thead>
        </table>,
      );
      const el = screen.getByTestId("c").element() as HTMLTableCellElement;
      expect(el.scope).toBe("col");
      expect(el.colSpan).toBe(2);
      expect(el.abbr).toBe("property");
      expect(el.getAttribute("data-custom")).toBe("v");
    });

    test("forwards a ref to the underlying <th>", async () => {
      let captured: HTMLTableCellElement | null = null;
      await render(
        <table>
          <thead>
            <tr>
              <Th
                ref={(node: HTMLTableCellElement | null) => {
                  captured = node;
                }}
                data-testid="c"
              >
                Prop
              </Th>
            </tr>
          </thead>
        </table>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLTableCellElement).tagName.toLowerCase()).toBe("th");
    });
  });

  // Header-cell styling is a Table concern, not a Th concern — a bare <th>
  // and a <Th> must render identically inside a <Table>. Locking that in so
  // a future edit that migrates cell rules onto `.ps1ui-th` (breaking bare
  // <th> callers) trips the test.
  describe("interop with Table", () => {
    test("renders identically to a bare <th> in the same header row", async () => {
      const screen = await render(
        <Table>
          <Thead>
            <Tr>
              <Th data-testid="c-wrapped">Prop</Th>
              <th data-testid="c-bare">Type</th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Td>ordered</Td>
              <Td>boolean</Td>
            </Tr>
          </Tbody>
        </Table>,
      );
      const wrapped = getComputedStyle(screen.getByTestId("c-wrapped").element());
      const bare = getComputedStyle(screen.getByTestId("c-bare").element());
      expect(wrapped.fontWeight).toBe(bare.fontWeight);
      expect(wrapped.backgroundColor).toBe(bare.backgroundColor);
      expect(wrapped.textAlign).toBe(bare.textAlign);
      expect(wrapped.borderBottomColor).toBe(bare.borderBottomColor);
      expect(wrapped.padding).toBe(bare.padding);
    });
  });

  describe("a11y", () => {
    test("column and row headers inside a full Table → no axe violations", async () => {
      const screen = await render(
        <Table aria-label="component sizes">
          <Thead>
            <Tr>
              <Th scope="col">Component</Th>
              <Th scope="col">Size</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Th scope="row">Button</Th>
              <Td>2 KB</Td>
            </Tr>
            <Tr>
              <Th scope="row">Input</Th>
              <Td>1 KB</Td>
            </Tr>
          </Tbody>
        </Table>,
      );
      await expectNoAxeViolations(screen.container);
    });
  });
});
