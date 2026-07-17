import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { PROPS_TABLE_CHILDREN } from "../../testing/table";
import { Table } from "../Table/Table";
import { Td } from "../Td/Td";
import { Tr } from "../Tr/Tr";
import { Tbody } from "./Tbody";

describe("Tbody", () => {
  describe("rendering", () => {
    test("renders a <tbody> with the given children", async () => {
      const screen = await render(
        <table>
          <Tbody data-testid="b">
            <tr>
              <td>ordered</td>
            </tr>
          </Tbody>
        </table>,
      );
      const el = screen.getByTestId("b").element();
      expect(el.tagName.toLowerCase()).toBe("tbody");
      expect(el.querySelector("td")?.textContent).toBe("ordered");
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-tbody base class", async () => {
      const screen = await render(
        <table>
          <Tbody data-testid="b" />
        </table>,
      );
      await expect.element(screen.getByTestId("b")).toHaveClass("ps1ui-tbody");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <table>
          <Tbody data-testid="b" className="extra" />
        </table>,
      );
      const el = screen.getByTestId("b");
      await expect.element(el).toHaveClass("ps1ui-tbody");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native <tbody> attributes (id, aria-*, data-*)", async () => {
      const screen = await render(
        <table>
          <Tbody id="body" aria-hidden="false" data-testid="b" data-custom="v" />
        </table>,
      );
      const el = screen.getByTestId("b").element();
      expect(el.id).toBe("body");
      expect(el.getAttribute("aria-hidden")).toBe("false");
      expect(el.getAttribute("data-custom")).toBe("v");
    });

    test("forwards a ref to the underlying <tbody>", async () => {
      let captured: HTMLTableSectionElement | null = null;
      await render(
        <table>
          <Tbody
            ref={(node: HTMLTableSectionElement | null) => {
              captured = node;
            }}
            data-testid="b"
          />
        </table>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLTableSectionElement).tagName.toLowerCase()).toBe("tbody");
    });
  });

  // Cell styling is a Table concern, not a Tbody concern — a bare <tbody>
  // and a <Tbody> must render identically inside a <Table>. Locking that in
  // so a future edit that migrates cell rules onto `.ps1ui-tbody` (breaking
  // bare <tbody> callers) trips the test.
  describe("interop with Table", () => {
    test("data cells style the same under Tbody as under a bare <tbody>", async () => {
      const screen = await render(
        <div>
          <Table>
            <Tbody>
              <Tr>
                <Td data-testid="td-wrapped">ordered</Td>
              </Tr>
            </Tbody>
          </Table>
          <Table>
            <tbody>
              <Tr>
                <Td data-testid="td-bare">ordered</Td>
              </Tr>
            </tbody>
          </Table>
        </div>,
      );
      const wrapped = getComputedStyle(screen.getByTestId("td-wrapped").element());
      const bare = getComputedStyle(screen.getByTestId("td-bare").element());
      expect(wrapped.borderTopWidth).toBe(bare.borderTopWidth);
      expect(wrapped.borderTopColor).toBe(bare.borderTopColor);
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
