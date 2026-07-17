import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { PROPS_TABLE_CHILDREN } from "../../testing/table";
import { Table } from "../Table/Table";
import { Tbody } from "../Tbody/Tbody";
import { Td } from "../Td/Td";
import { Th } from "../Th/Th";
import { Tr } from "../Tr/Tr";
import { Thead } from "./Thead";

describe("Thead", () => {
  describe("rendering", () => {
    test("renders a <thead> with the given children", async () => {
      const screen = await render(
        <table>
          <Thead data-testid="h">
            <tr>
              <th>Prop</th>
            </tr>
          </Thead>
        </table>,
      );
      const el = screen.getByTestId("h").element();
      expect(el.tagName.toLowerCase()).toBe("thead");
      expect(el.querySelector("th")?.textContent).toBe("Prop");
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-thead base class", async () => {
      const screen = await render(
        <table>
          <Thead data-testid="h" />
        </table>,
      );
      await expect.element(screen.getByTestId("h")).toHaveClass("ps1ui-thead");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <table>
          <Thead data-testid="h" className="extra" />
        </table>,
      );
      const el = screen.getByTestId("h");
      await expect.element(el).toHaveClass("ps1ui-thead");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native <thead> attributes (id, aria-*, data-*)", async () => {
      const screen = await render(
        <table>
          <Thead id="head" aria-hidden="false" data-testid="h" data-custom="v" />
        </table>,
      );
      const el = screen.getByTestId("h").element();
      expect(el.id).toBe("head");
      expect(el.getAttribute("aria-hidden")).toBe("false");
      expect(el.getAttribute("data-custom")).toBe("v");
    });

    test("forwards a ref to the underlying <thead>", async () => {
      let captured: HTMLTableSectionElement | null = null;
      await render(
        <table>
          <Thead
            ref={(node: HTMLTableSectionElement | null) => {
              captured = node;
            }}
            data-testid="h"
          />
        </table>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLTableSectionElement).tagName.toLowerCase()).toBe("thead");
    });
  });

  // Header styling is a Table concern, not a Thead concern — a bare <thead>
  // and a <Thead> must render identically inside a <Table>. Locking that in
  // so a future edit that migrates header rules onto `.ps1ui-thead`
  // (breaking bare <thead> callers) trips the test.
  describe("interop with Table", () => {
    test("header cells style the same under Thead as under a bare <thead>", async () => {
      const screen = await render(
        <div>
          <Table>
            <Thead>
              <Tr>
                <Th data-testid="th-wrapped">Prop</Th>
              </Tr>
            </Thead>
            <Tbody>
              <Tr>
                <Td>ordered</Td>
              </Tr>
            </Tbody>
          </Table>
          <Table>
            <thead>
              <Tr>
                <Th data-testid="th-bare">Prop</Th>
              </Tr>
            </thead>
            <Tbody>
              <Tr>
                <Td>ordered</Td>
              </Tr>
            </Tbody>
          </Table>
        </div>,
      );
      const wrapped = getComputedStyle(screen.getByTestId("th-wrapped").element());
      const bare = getComputedStyle(screen.getByTestId("th-bare").element());
      expect(wrapped.borderBottomColor).toBe(bare.borderBottomColor);
      expect(wrapped.backgroundColor).toBe(bare.backgroundColor);
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
