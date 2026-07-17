import "../../styles/styles.css";

import type { ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Anchor } from "../Anchor/Anchor";
import { Text } from "../Text/Text";
import { List } from "./List";

describe("List", () => {
  describe("rendering", () => {
    test("ordered=false (default) renders a <ul>", async () => {
      const screen = await render(
        <List data-testid="l">
          <li>a</li>
        </List>,
      );
      const el = screen.getByTestId("l").element();
      expect(el.tagName.toLowerCase()).toBe("ul");
    });

    test("ordered renders an <ol>", async () => {
      const screen = await render(
        <List ordered data-testid="l">
          <li>a</li>
        </List>,
      );
      const el = screen.getByTestId("l").element();
      expect(el.tagName.toLowerCase()).toBe("ol");
    });

    test("renders children as-is (does not auto-wrap in <li>)", async () => {
      const screen = await render(
        <List data-testid="l">
          <li data-testid="i1">one</li>
          <li data-testid="i2">two</li>
        </List>,
      );
      const el = screen.getByTestId("l").element();
      expect(el.querySelectorAll("li")).toHaveLength(2);
      expect(el.querySelector('[data-testid="i1"]')?.tagName.toLowerCase()).toBe("li");
    });

    // Safari's a11y tree drops list semantics when the computed
    // `list-style-type` is `none` — the global reset applies that. Ensuring
    // `role="list"` is set on the element restores VoiceOver's "list, N
    // items" announcement. Guarding it in a test so a future edit doesn't
    // silently drop the role attribute and regress the a11y contract.
    test("sets role=list by default so Safari still announces the list semantic", async () => {
      const screen = await render(
        <List data-testid="l">
          <li>a</li>
        </List>,
      );
      const el = screen.getByTestId("l").element();
      expect(el.getAttribute("role")).toBe("list");
    });

    test("caller-supplied role overrides the default", async () => {
      const screen = await render(
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- exercises List's role-override passthrough.
        <List role="menu" data-testid="l">
          <li>a</li>
        </List>,
      );
      const el = screen.getByTestId("l").element();
      expect(el.getAttribute("role")).toBe("menu");
    });

    test("unordered items get a dash marker via ::before", async () => {
      const screen = await render(
        <List data-testid="l">
          <li data-testid="i">alpha</li>
        </List>,
      );
      const s = getComputedStyle(screen.getByTestId("i").element(), "::before");
      expect(s.content).toBe('"-"');
    });

    // The ordered marker uses `counter(list-item)` — the browser-maintained
    // list-item counter that already honours `<ol start>`, `<ol reversed>`,
    // and per-item `<li value>`. Asserting the CSS content declaration pins
    // that we're reading the native counter and not a hand-rolled scope that
    // would silently ignore those attributes.
    test("ordered items marker reads counter(list-item) so start/reversed/value are honoured", async () => {
      const screen = await render(
        <List ordered data-testid="l">
          <li data-testid="i">one</li>
        </List>,
      );
      const s = getComputedStyle(screen.getByTestId("i").element(), "::before");
      expect(s.content).toContain("counter(list-item");
      expect(s.content).toContain('"."');
    });

    // Hanging-indent contract: <li> reserves marker space via padding-left
    // and the ::before sits inside that reservation via a negative margin-left.
    // Wrapped text on line 2+ starts at the padding-left position, flush with
    // the first line's content column instead of slipping back under the marker.
    test("li reserves marker space via padding-left so wrapped text hangs to the content column", async () => {
      const screen = await render(
        <List data-testid="l">
          <li data-testid="i">wrapping</li>
        </List>,
      );
      const paddingLeftPx = Number.parseFloat(
        getComputedStyle(screen.getByTestId("i").element()).paddingLeft,
      );
      expect(paddingLeftPx).toBeGreaterThan(0);
    });

    // Regression: an earlier implementation used `display: grid` on the <li>,
    // which recomputed `grid-template-columns: max-content 1fr` around a
    // nested <List> and shoved the outer item's text far to the right. Assert
    // `grid-template-columns: none` positively — that catches `display: grid`
    // / `inline-grid` / `subgrid` reintroductions in one line.
    test("li has no grid-template-columns so nested lists don't distort the parent item's layout", async () => {
      const screen = await render(
        <List ordered>
          <li data-testid="outer">
            run the checks
            <List ordered>
              <li>typecheck</li>
              <li>unit tests</li>
            </List>
          </li>
        </List>,
      );
      const s = getComputedStyle(screen.getByTestId("outer").element());
      expect(s.gridTemplateColumns).toBe("none");
      expect(s.display).not.toBe("grid");
      expect(s.display).not.toBe("inline-grid");
    });

    // Breathing room between an outer <li>'s text and a nested <List>. Uses
    // a descendant combinator so it still fires when the nested list is
    // wrapped in a layout primitive (Stack, Card, plain <div>).
    test("nested <List> inside an <li> gets a margin-top even when wrapped in an intermediate element", async () => {
      const screen = await render(
        <List ordered>
          <li>
            outer
            <div>
              <List ordered data-testid="inner">
                <li>inner</li>
              </List>
            </div>
          </li>
        </List>,
      );
      const s = getComputedStyle(screen.getByTestId("inner").element());
      expect(Number.parseFloat(s.marginTop)).toBeGreaterThan(0);
    });
  });

  describe("class composition", () => {
    test("applies ps1ui-list + ps1ui-list--unordered by default", async () => {
      const screen = await render(
        <List data-testid="l">
          <li>a</li>
        </List>,
      );
      const el = screen.getByTestId("l");
      await expect.element(el).toHaveClass("ps1ui-list");
      await expect.element(el).toHaveClass("ps1ui-list--unordered");
    });

    test("applies ps1ui-list + ps1ui-list--ordered when ordered", async () => {
      const screen = await render(
        <List ordered data-testid="l">
          <li>a</li>
        </List>,
      );
      const el = screen.getByTestId("l");
      await expect.element(el).toHaveClass("ps1ui-list");
      await expect.element(el).toHaveClass("ps1ui-list--ordered");
    });

    test("variant modifier flips exactly one class (never both)", async () => {
      const screen = await render(
        <List data-testid="l">
          <li>a</li>
        </List>,
      );
      const el = screen.getByTestId("l").element();
      expect(el.classList.contains("ps1ui-list--unordered")).toBe(true);
      expect(el.classList.contains("ps1ui-list--ordered")).toBe(false);
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <List className="extra other" data-testid="l">
          <li>a</li>
        </List>,
      );
      const el = screen.getByTestId("l");
      await expect.element(el).toHaveClass("ps1ui-list");
      await expect.element(el).toHaveClass("extra");
      await expect.element(el).toHaveClass("other");
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes (id, aria-*, data-*)", async () => {
      const screen = await render(
        <List id="steps" aria-label="deploy steps" data-testid="l" data-custom="v">
          <li>a</li>
        </List>,
      );
      const el = screen.getByTestId("l");
      await expect.element(el).toHaveAttribute("id", "steps");
      await expect.element(el).toHaveAttribute("aria-label", "deploy steps");
      await expect.element(el).toHaveAttribute("data-custom", "v");
    });

    test("forwards <ol>-specific attributes when ordered (start, reversed)", async () => {
      const screen = await render(
        <List ordered start={5} reversed data-testid="l">
          <li>a</li>
        </List>,
      );
      const el = screen.getByTestId("l").element() as HTMLOListElement;
      // `start` / `reversed` set the DOM's `list-item` counter, which is
      // exactly what our ::before reads via `counter(list-item)` — so both
      // attributes round-trip on the element AND drive the visible marker.
      expect(el.start).toBe(5);
      expect(el.reversed).toBe(true);
    });

    test("forwards the style attribute", async () => {
      const screen = await render(
        <List data-testid="l" style={{ maxWidth: 240 }}>
          <li>a</li>
        </List>,
      );
      const el = screen.getByTestId("l").element() as HTMLUListElement;
      expect(el.style.maxWidth).toBe("240px");
    });

    test("forwards a ref to the underlying <ul>", async () => {
      let captured: HTMLUListElement | null = null;
      await render(
        <List
          ref={(node: HTMLUListElement | null) => {
            captured = node;
          }}
          data-testid="l"
        >
          <li>a</li>
        </List>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLUListElement).tagName.toLowerCase()).toBe("ul");
    });

    test("forwards a ref to the underlying <ol> when ordered", async () => {
      let captured: HTMLOListElement | null = null;
      await render(
        <List
          ordered
          ref={(node: HTMLOListElement | null) => {
            captured = node;
          }}
          data-testid="l"
        >
          <li>a</li>
        </List>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLOListElement).tagName.toLowerCase()).toBe("ol");
    });
  });

  describe("a11y", () => {
    type A11yCase = { name: string; node: () => ReactElement };

    const cases: A11yCase[] = [
      {
        name: "unordered plain-text items",
        node: () => (
          <List>
            <li>first</li>
            <li>second</li>
            <li>third</li>
          </List>
        ),
      },
      {
        name: "ordered plain-text items",
        node: () => (
          <List ordered>
            <li>first</li>
            <li>second</li>
          </List>
        ),
      },
      {
        name: "items wrapping ps1ui Text and Anchor",
        node: () => (
          <List>
            <li>
              <Text as="span">install</Text>
            </li>
            <li>
              <Anchor href="#docs">read the docs</Anchor>
            </li>
          </List>
        ),
      },
      {
        name: "nested ordered list",
        node: () => (
          <List ordered>
            <li>outer one</li>
            <li>
              outer two
              <List ordered>
                <li>inner one</li>
                <li>inner two</li>
              </List>
            </li>
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
