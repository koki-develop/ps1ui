import "../../styles/styles.css";

import { createRef, type ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Text } from "../Text/Text";
import { Code } from "./Code";

// Resolve a --ps1ui-* color token to its computed rgb() string via a throwaway
// probe. Both `color` and `background-color` computed values normalize to the
// same rgb() form, so a single probe on the `color` property is enough to
// compare against either — callers pass the token name and the returned string
// is directly comparable to `getComputedStyle(el).color` or `.backgroundColor`
// on the element under test.
function resolveColorToken(name: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  try {
    return getComputedStyle(probe).color;
  } finally {
    probe.remove();
  }
}

describe("Code", () => {
  describe("rendering", () => {
    test("renders a native <code> element", async () => {
      const screen = await render(<Code data-testid="c">x</Code>);
      const el = screen.getByTestId("c").element();
      expect(el.tagName.toLowerCase()).toBe("code");
    });

    test("renders its children", async () => {
      const screen = await render(<Code>useState()</Code>);
      await expect.element(screen.getByText("useState()")).toBeVisible();
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-code base class", async () => {
      const screen = await render(<Code data-testid="c">x</Code>);
      await expect.element(screen.getByTestId("c")).toHaveClass("ps1ui-code");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <Code data-testid="c" className="extra other">
          x
        </Code>,
      );
      const el = screen.getByTestId("c");
      await expect.element(el).toHaveClass("ps1ui-code");
      await expect.element(el).toHaveClass("extra");
      await expect.element(el).toHaveClass("other");
    });
  });

  describe("computed styles", () => {
    test("paints --ps1ui-color-fg as text color", async () => {
      const screen = await render(<Code data-testid="c">x</Code>);
      const el = screen.getByTestId("c").element() as HTMLElement;
      expect(getComputedStyle(el).color).toBe(resolveColorToken("--ps1ui-color-fg"));
    });

    test("uses --ps1ui-color-surface for the chip background", async () => {
      const screen = await render(<Code data-testid="c">x</Code>);
      const el = screen.getByTestId("c").element() as HTMLElement;
      expect(getComputedStyle(el).backgroundColor).toBe(resolveColorToken("--ps1ui-color-surface"));
    });

    test("font-family resolves to the ps1ui mono stack (JetBrains Mono first)", async () => {
      // fontFamily is the full font-family string with fallbacks —
      // JetBrains Mono Variable is the first entry per tokens.css. Matching
      // on the leading token also survives a fallback list re-order.
      const screen = await render(<Code data-testid="c">x</Code>);
      const el = screen.getByTestId("c").element() as HTMLElement;
      expect(getComputedStyle(el).fontFamily).toMatch(/JetBrains Mono/);
    });

    // Split into two tests instead of a same-test double render — per
    // packages/core/CLAUDE.md § "Gotcha: same-test double render()", and
    // matching Stack.test.tsx's split-out cascade-fallback pair. Two anchor
    // points pin both the ratio (0.9) and its em-relativeness (the value
    // changes when the parent changes), catching both a hardcoded rem swap
    // and a ratio drift.
    test("font-size is 0.9em: 20 px parent → 18 px chip", async () => {
      const screen = await render(
        <div style={{ fontSize: 20 }}>
          <Code data-testid="c">x</Code>
        </div>,
      );
      const el = screen.getByTestId("c").element() as HTMLElement;
      expect(getComputedStyle(el).fontSize).toBe("18px");
    });

    test("font-size is 0.9em: 10 px parent → 9 px chip", async () => {
      const screen = await render(
        <div style={{ fontSize: 10 }}>
          <Code data-testid="c">x</Code>
        </div>,
      );
      const el = screen.getByTestId("c").element() as HTMLElement;
      expect(getComputedStyle(el).fontSize).toBe("9px");
    });

    test("wraps long identifiers instead of overflowing (overflow-wrap: anywhere)", async () => {
      // A ~120-char unbroken identifier inside a 120 px container must NOT
      // extend the parent's scrollWidth past its clientWidth — that would
      // mean the wrap failed and the parent gained horizontal overflow.
      const long = "a".repeat(120);
      const screen = await render(
        <div data-testid="wrap" style={{ width: 120 }}>
          <Code>{long}</Code>
        </div>,
      );
      const wrap = screen.getByTestId("wrap").element() as HTMLElement;
      expect(wrap.scrollWidth).toBeLessThanOrEqual(wrap.clientWidth);
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes (id, data-*, aria-*)", async () => {
      const screen = await render(
        <Code id="snippet" aria-label="example" data-testid="c" data-custom="v">
          x
        </Code>,
      );
      const el = screen.getByTestId("c");
      await expect.element(el).toHaveAttribute("id", "snippet");
      await expect.element(el).toHaveAttribute("aria-label", "example");
      await expect.element(el).toHaveAttribute("data-custom", "v");
    });

    test("forwards the style attribute alongside the component's own classes", async () => {
      const screen = await render(
        <Code data-testid="c" style={{ letterSpacing: "0.05em" }}>
          x
        </Code>,
      );
      const el = screen.getByTestId("c").element() as HTMLElement;
      expect(el.style.letterSpacing).toBe("0.05em");
      expect(el.classList.contains("ps1ui-code")).toBe(true);
    });

    test("forwards the native HTML lang attribute (BCP47 tag) untouched", async () => {
      // Parallel to CodeBlock's `lang` passthrough: the native content-language
      // attribute must reach the DOM so assistive tech can pronounce the
      // surrounding text correctly.
      const screen = await render(
        <Code data-testid="c" lang="en">
          hello
        </Code>,
      );
      await expect.element(screen.getByTestId("c")).toHaveAttribute("lang", "en");
    });

    test("forwards ref (RefObject) to the underlying <code>", async () => {
      const ref = createRef<HTMLElement>();
      await render(<Code ref={ref}>x</Code>);
      expect(ref.current).toBeInstanceOf(HTMLElement);
      expect(ref.current?.tagName.toLowerCase()).toBe("code");
    });
  });

  describe("a11y", () => {
    type A11yCase = { name: string; node: () => ReactElement };

    const cases: A11yCase[] = [
      {
        name: "standalone",
        node: () => <Code>useState()</Code>,
      },
      {
        name: "inline inside a paragraph via <Text>",
        node: () => (
          <Text>
            call <Code>useState()</Code> to add local state.
          </Text>
        ),
      },
      {
        name: "long identifier wrapped in a narrow container",
        node: () => (
          <div style={{ maxWidth: 160 }}>
            <Text>
              path: <Code>src/components/CodeBlock/CodeBlock.tsx</Code>
            </Text>
          </div>
        ),
      },
    ];

    test.for(cases)("$name → no axe violations", async ({ node }) => {
      const screen = await render(node());
      await expectNoAxeViolations(screen.container);
    });
  });
});
