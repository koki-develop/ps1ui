import "../../styles/styles.css";

import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { resolveColorToken } from "../../testing/color";
import { PROPS_TABLE_CHILDREN } from "../../testing/table";
import { Tbody } from "../Tbody/Tbody";
import { Td } from "../Td/Td";
import { Tr } from "../Tr/Tr";
import { Table } from "./Table";

// Unbreakable run — no whitespace, so the cell's min-content width exceeds any
// narrow wrapper and forces horizontal overflow (tables refuse to shrink below
// min-content no matter the width: 100%).
const LONG = "abcdefghij".repeat(30);

const FIXTURE = PROPS_TABLE_CHILDREN;

describe("Table", () => {
  describe("rendering", () => {
    test("renders a <table> with the given children", async () => {
      const screen = await render(<Table data-testid="t">{FIXTURE}</Table>);
      const el = screen.getByTestId("t").element();
      expect(el.tagName.toLowerCase()).toBe("table");
      expect(el.querySelectorAll("th").length).toBe(2);
      expect(el.querySelectorAll("td").length).toBe(4);
    });

    test("wraps the table in a scroll container div", async () => {
      const screen = await render(<Table data-testid="t">{FIXTURE}</Table>);
      const scroller = screen.getByTestId("t").element().parentElement!;
      expect(scroller.tagName.toLowerCase()).toBe("div");
      expect(scroller.classList.contains("ps1ui-table__scroller")).toBe(true);
      expect(getComputedStyle(scroller).overflowX).toBe("auto");
    });

    test("collapses borders into a single-stroke terminal grid", async () => {
      const screen = await render(<Table data-testid="t">{FIXTURE}</Table>);
      const table = screen.getByTestId("t").element();
      expect(getComputedStyle(table).borderCollapse).toBe("collapse");
      const td = table.querySelector("td")!;
      const s = getComputedStyle(td);
      expect(s.borderTopWidth).toBe("1px");
      expect(s.borderTopStyle).toBe("solid");
      expect(s.textAlign).toBe("start");
      expect(s.verticalAlign).toBe("top");
    });

    test("header cells get the surface background and a strong bottom rule", async () => {
      const screen = await render(<Table data-testid="t">{FIXTURE}</Table>);
      const th = screen.getByTestId("t").element().querySelector("thead th")!;
      const s = getComputedStyle(th);
      expect(s.backgroundColor).toBe(resolveColorToken("--ps1ui-color-surface"));
      expect(s.borderBottomColor).toBe(resolveColorToken("--ps1ui-color-border-strong"));
      expect(s.fontWeight).toBe("600");
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-table base class", async () => {
      const screen = await render(<Table data-testid="t">{FIXTURE}</Table>);
      await expect.element(screen.getByTestId("t")).toHaveClass("ps1ui-table");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <Table data-testid="t" className="extra">
          {FIXTURE}
        </Table>,
      );
      const el = screen.getByTestId("t");
      await expect.element(el).toHaveClass("ps1ui-table");
      await expect.element(el).toHaveClass("extra");
    });

    test("caller className lands on the <table>, never on the scroller", async () => {
      const screen = await render(
        <Table data-testid="t" className="extra">
          {FIXTURE}
        </Table>,
      );
      const scroller = screen.getByTestId("t").element().parentElement!;
      expect(scroller.className).toBe("ps1ui-table__scroller");
    });
  });

  describe("passthrough", () => {
    test("forwards native <table> attributes (id, aria-*, data-*) to the <table>", async () => {
      const screen = await render(
        <Table id="props" aria-label="component props" data-testid="t" data-custom="v">
          {FIXTURE}
        </Table>,
      );
      const el = screen.getByTestId("t").element();
      expect(el.id).toBe("props");
      expect(el.getAttribute("aria-label")).toBe("component props");
      expect(el.getAttribute("data-custom")).toBe("v");
    });

    test("a caller-supplied tabIndex lands on the <table>, not the scroller", async () => {
      // TableProps is ComponentProps<"table">, so tabIndex targets the table
      // element like every other native attribute. The scroller's tabindex is
      // internal state, driven only by the overflow measurement.
      const screen = await render(
        <Table data-testid="t" tabIndex={-1}>
          {FIXTURE}
        </Table>,
      );
      const el = screen.getByTestId("t").element() as HTMLTableElement;
      expect(el.tabIndex).toBe(-1);
    });

    test("forwards ref (RefObject) to the underlying <table>", async () => {
      const ref = createRef<HTMLTableElement>();
      await render(<Table ref={ref}>{FIXTURE}</Table>);
      expect(ref.current).toBeInstanceOf(HTMLTableElement);
    });

    test("forwards ref (callback) to the underlying <table>", async () => {
      const cb = vi.fn<(node: HTMLTableElement | null) => void>();
      await render(<Table ref={cb}>{FIXTURE}</Table>);
      expect(cb).toHaveBeenCalled();
      expect(cb.mock.calls[0]?.[0]).toBeInstanceOf(HTMLTableElement);
    });

    test("still records to the caller's ref even though we use an internal ref for ResizeObserver", async () => {
      // Regression guard: the mergedRef must call the caller's ref, not just
      // set the internal one used for the overflow observation.
      const ref = createRef<HTMLTableElement>();
      const screen = await render(
        <Table ref={ref} data-testid="t">
          {FIXTURE}
        </Table>,
      );
      expect(ref.current).toBe(screen.getByTestId("t").element());
    });

    test("honors a React 19 cleanup-returning callback ref (cleanup runs on unmount, never called with null)", async () => {
      // A cleanup-style ref's body is written to never receive null — React 19
      // drives detachment through the returned cleanup instead. The merged ref
      // must preserve that contract, not downgrade it to a null call.
      const calls: Array<HTMLTableElement | null> = [];
      const cleanup = vi.fn();
      const screen = await render(
        <Table
          ref={(node: HTMLTableElement) => {
            calls.push(node);
            return cleanup;
          }}
        >
          {FIXTURE}
        </Table>,
      );
      expect(calls.length).toBe(1);
      expect(calls[0]).toBeInstanceOf(HTMLTableElement);
      expect(cleanup).not.toHaveBeenCalled();
      screen.unmount();
      expect(cleanup).toHaveBeenCalledTimes(1);
      // The callback itself was never re-invoked with null.
      expect(calls.length).toBe(1);
    });
  });

  describe("scroller tabIndex (scrollable-region-focusable)", () => {
    test("removes tabindex once ResizeObserver measures non-overflowing content", async () => {
      const screen = await render(
        <div style={{ width: 800 }}>
          <Table data-testid="t">{FIXTURE}</Table>
        </div>,
      );
      const scroller = screen.getByTestId("t").element().parentElement!;
      await vi.waitFor(() => {
        expect(scroller.getAttribute("tabindex")).toBeNull();
      });
    });

    test("keeps tabindex=0 when the table overflows horizontally", async () => {
      const screen = await render(
        <div style={{ width: 160 }}>
          <Table data-testid="t">
            <Tbody>
              <Tr>
                <Td>{LONG}</Td>
              </Tr>
            </Tbody>
          </Table>
        </div>,
      );
      const scroller = screen.getByTestId("t").element().parentElement!;
      await vi.waitFor(() => {
        expect(scroller.getAttribute("tabindex")).toBe("0");
      });
    });

    test("updates tabindex when content flips between fitting and overflowing", async () => {
      // Start fitting, then swap in an unbreakable cell; the ResizeObserver on
      // the table box must re-measure and expose tabindex=0. Guards against a
      // naive one-shot measurement that would miss overflow appearing later.
      const screen = await render(
        <div style={{ width: 160 }}>
          <Table data-testid="t">
            <Tbody>
              <Tr>
                <Td>short</Td>
              </Tr>
            </Tbody>
          </Table>
        </div>,
      );
      const scroller = screen.getByTestId("t").element().parentElement!;
      await vi.waitFor(() => {
        expect(scroller.getAttribute("tabindex")).toBeNull();
      });
      screen.rerender(
        <div style={{ width: 160 }}>
          <Table data-testid="t">
            <Tbody>
              <Tr>
                <Td>{LONG}</Td>
              </Tr>
            </Tbody>
          </Table>
        </div>,
      );
      await vi.waitFor(() => {
        expect(scroller.getAttribute("tabindex")).toBe("0");
      });
    });

    test("keeps the focused scroller in the tab order when content shrinks to fit; drops it after blur", async () => {
      // Removing tabindex from the focused element would blur it to <body>,
      // teleporting a keyboard user's position — the hook keeps the tab stop
      // while focused and the scroller's onBlur re-measure drops it after.
      const screen = await render(
        <div style={{ width: 160 }}>
          <Table data-testid="t">
            <Tbody>
              <Tr>
                <Td>{LONG}</Td>
              </Tr>
            </Tbody>
          </Table>
        </div>,
      );
      const scroller = screen.getByTestId("t").element().parentElement! as HTMLElement;
      await vi.waitFor(() => {
        expect(scroller.getAttribute("tabindex")).toBe("0");
      });
      scroller.focus();
      expect(document.activeElement).toBe(scroller);
      screen.rerender(
        <div style={{ width: 160 }}>
          <Table data-testid="t">
            <Tbody>
              <Tr>
                <Td>short</Td>
              </Tr>
            </Tbody>
          </Table>
        </div>,
      );
      // Let the ResizeObserver-driven re-measure settle (RO callbacks run
      // before paint; two frames is ample), then confirm focus survived.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      expect(document.activeElement).toBe(scroller);
      expect(scroller.getAttribute("tabindex")).toBe("0");
      scroller.blur();
      await vi.waitFor(() => {
        expect(scroller.getAttribute("tabindex")).toBeNull();
      });
    });
  });

  describe("a11y", () => {
    test("full table markup → no axe violations", async () => {
      const screen = await render(<Table aria-label="component props">{FIXTURE}</Table>);
      await expectNoAxeViolations(screen.container);
    });
  });
});
