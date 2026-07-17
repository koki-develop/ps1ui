import "../../styles/styles.css";

import type { ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { List } from "../List/List";
import { ListItem } from "./ListItem";

describe("ListItem", () => {
  describe("rendering", () => {
    test("renders an <li> with the given children", async () => {
      const screen = await render(<ListItem data-testid="i">alpha</ListItem>);
      const el = screen.getByTestId("i").element();
      expect(el.tagName.toLowerCase()).toBe("li");
      expect(el.textContent).toBe("alpha");
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-listitem base class", async () => {
      const screen = await render(<ListItem data-testid="i">a</ListItem>);
      await expect.element(screen.getByTestId("i")).toHaveClass("ps1ui-listitem");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <ListItem data-testid="i" className="extra">
          a
        </ListItem>,
      );
      const el = screen.getByTestId("i");
      await expect.element(el).toHaveClass("ps1ui-listitem");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native <li> attributes (id, value, aria-*, data-*)", async () => {
      const screen = await render(
        <ListItem id="row" value={7} aria-label="seventh" data-testid="i" data-custom="v">
          a
        </ListItem>,
      );
      const el = screen.getByTestId("i").element() as HTMLLIElement;
      expect(el.id).toBe("row");
      // `value` overrides the DOM's `list-item` counter for this item and
      // subsequent items — and List's ordered ::before reads `counter(list-item)`,
      // so it drives the visible number too.
      expect(el.value).toBe(7);
      expect(el.getAttribute("aria-label")).toBe("seventh");
      expect(el.getAttribute("data-custom")).toBe("v");
    });

    test("forwards a ref to the underlying <li>", async () => {
      let captured: HTMLLIElement | null = null;
      await render(
        <ListItem
          ref={(node: HTMLLIElement | null) => {
            captured = node;
          }}
          data-testid="i"
        >
          a
        </ListItem>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLLIElement).tagName.toLowerCase()).toBe("li");
    });
  });

  // Marker styling is a List concern, not a ListItem concern — a bare <li>
  // and a <ListItem> must render identically inside a <List>. Locking that
  // in so a future edit that migrates marker rules onto `.ps1ui-listitem`
  // (breaking bare <li> callers) trips the test.
  describe("interop with List", () => {
    test("marker ::before renders on ListItem the same as on a bare <li>", async () => {
      const screen = await render(
        <List data-testid="l">
          <ListItem data-testid="item-a">a</ListItem>
          <li data-testid="item-b">b</li>
        </List>,
      );
      const a = getComputedStyle(screen.getByTestId("item-a").element(), "::before");
      const b = getComputedStyle(screen.getByTestId("item-b").element(), "::before");
      expect(a.content).toBe('"-"');
      expect(b.content).toBe('"-"');
    });
  });

  describe("a11y", () => {
    type A11yCase = { name: string; node: () => ReactElement };

    const cases: A11yCase[] = [
      {
        name: "inside an unordered List",
        node: () => (
          <List>
            <ListItem>first</ListItem>
            <ListItem>second</ListItem>
          </List>
        ),
      },
      {
        name: "inside an ordered List",
        node: () => (
          <List ordered>
            <ListItem>first</ListItem>
            <ListItem>second</ListItem>
          </List>
        ),
      },
    ];

    test.for(cases)("$name → no axe violations", async ({ node }) => {
      const screen = await render(node());
      await expectNoAxeViolations(screen.container);
    });
  });
});
