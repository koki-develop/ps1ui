import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { PROPS_TABLE_CHILDREN } from "../../testing/table";
import { Table } from "../Table/Table";
import { Tbody } from "../Tbody/Tbody";
import { Td } from "../Td/Td";
import { Tr } from "./Tr";

describe("Tr", () => {
  describe("rendering", () => {
    test("renders a <tr> with the given children", async () => {
      const screen = await render(
        <table>
          <tbody>
            <Tr data-testid="r">
              <td>ordered</td>
            </Tr>
          </tbody>
        </table>,
      );
      const el = screen.getByTestId("r").element();
      expect(el.tagName.toLowerCase()).toBe("tr");
      expect(el.querySelector("td")?.textContent).toBe("ordered");
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-tr base class", async () => {
      const screen = await render(
        <table>
          <tbody>
            <Tr data-testid="r" />
          </tbody>
        </table>,
      );
      await expect.element(screen.getByTestId("r")).toHaveClass("ps1ui-tr");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <table>
          <tbody>
            <Tr data-testid="r" className="extra" />
          </tbody>
        </table>,
      );
      const el = screen.getByTestId("r");
      await expect.element(el).toHaveClass("ps1ui-tr");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native <tr> attributes (id, aria-*, data-*)", async () => {
      const screen = await render(
        <table>
          <tbody>
            <Tr id="row" aria-hidden="false" data-testid="r" data-custom="v" />
          </tbody>
        </table>,
      );
      const el = screen.getByTestId("r").element();
      expect(el.id).toBe("row");
      expect(el.getAttribute("aria-hidden")).toBe("false");
      expect(el.getAttribute("data-custom")).toBe("v");
    });

    test("forwards a ref to the underlying <tr>", async () => {
      let captured: HTMLTableRowElement | null = null;
      await render(
        <table>
          <tbody>
            <Tr
              ref={(node: HTMLTableRowElement | null) => {
                captured = node;
              }}
              data-testid="r"
            />
          </tbody>
        </table>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLTableRowElement).tagName.toLowerCase()).toBe("tr");
    });
  });

  // Cell styling is a Table concern, not a Tr concern — a bare <tr> and a
  // <Tr> must render identically inside a <Table>. Locking that in so a
  // future edit that migrates cell rules onto `.ps1ui-tr` (breaking bare
  // <tr> callers) trips the test.
  describe("interop with Table", () => {
    test("data cells style the same under Tr as under a bare <tr>", async () => {
      const screen = await render(
        <Table>
          <Tbody>
            <Tr>
              <Td data-testid="td-wrapped">ordered</Td>
            </Tr>
            <tr>
              <Td data-testid="td-bare">reversed</Td>
            </tr>
          </Tbody>
        </Table>,
      );
      const wrapped = getComputedStyle(screen.getByTestId("td-wrapped").element());
      const bare = getComputedStyle(screen.getByTestId("td-bare").element());
      expect(wrapped.borderLeftWidth).toBe(bare.borderLeftWidth);
      expect(wrapped.borderLeftColor).toBe(bare.borderLeftColor);
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
