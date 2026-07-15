import "../../styles/styles.css";

import type { ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Button } from "../Button/Button";
import { Text } from "../Text/Text";
import {
  Stack,
  type StackAlign,
  type StackDirection,
  type StackGap,
  type StackJustify,
} from "./Stack";

const DIRECTIONS = ["row", "column"] as const satisfies readonly StackDirection[];
const GAPS = ["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const satisfies readonly StackGap[];
const ALIGNS = [
  "start",
  "center",
  "end",
  "stretch",
  "baseline",
] as const satisfies readonly StackAlign[];
const JUSTIFIES = [
  "start",
  "center",
  "end",
  "between",
  "around",
  "evenly",
] as const satisfies readonly StackJustify[];

// Expected computed-style values per class, mirroring Stack.css. Kept as
// exhaustive Record<> so adding a new value fails the `satisfies` check
// below until this table is updated too. See Container.test.tsx for the
// same behavioural-coverage rationale.
const GAP_PX = {
  none: "0px",
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
} as const satisfies Record<StackGap, string>;

const ALIGN_ITEMS = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
} as const satisfies Record<StackAlign, string>;

const JUSTIFY_CONTENT = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
} as const satisfies Record<StackJustify, string>;

describe("Stack", () => {
  describe("rendering", () => {
    test("renders a <div> with the given children", async () => {
      const screen = await render(
        <Stack data-testid="s">
          <span>a</span>
          <span>b</span>
        </Stack>,
      );
      const el = screen.getByTestId("s").element();
      expect(el.tagName.toLowerCase()).toBe("div");
      expect(el.textContent).toContain("a");
      expect(el.textContent).toContain("b");
    });
  });

  describe("class composition", () => {
    test("applies default classes: base, direction=column, gap=md, no align/justify/wrap", async () => {
      const screen = await render(<Stack data-testid="s">x</Stack>);
      const el = screen.getByTestId("s").element();
      expect(el.classList.contains("ps1ui-stack")).toBe(true);
      expect(el.classList.contains("ps1ui-stack--direction-column")).toBe(true);
      expect(el.classList.contains("ps1ui-stack--gap-md")).toBe(true);
      expect(Array.from(el.classList).some((c) => c.startsWith("ps1ui-stack--align-"))).toBe(false);
      expect(Array.from(el.classList).some((c) => c.startsWith("ps1ui-stack--justify-"))).toBe(
        false,
      );
      expect(el.classList.contains("ps1ui-stack--wrap")).toBe(false);
    });

    test.for(DIRECTIONS.map((direction) => ({ direction })))(
      "direction=$direction → ps1ui-stack--direction-$direction",
      async ({ direction }) => {
        const screen = await render(
          <Stack direction={direction} data-testid="s">
            x
          </Stack>,
        );
        await expect
          .element(screen.getByTestId("s"))
          .toHaveClass(`ps1ui-stack--direction-${direction}`);
      },
    );

    test.for(GAPS.map((gap) => ({ gap })))(
      "gap=$gap → ps1ui-stack--gap-$gap (and no other gap-* class)",
      async ({ gap }) => {
        const screen = await render(
          <Stack gap={gap} data-testid="s">
            x
          </Stack>,
        );
        const el = screen.getByTestId("s").element();
        const gapClasses = Array.from(el.classList).filter((c) =>
          c.startsWith("ps1ui-stack--gap-"),
        );
        expect(gapClasses).toEqual([`ps1ui-stack--gap-${gap}`]);
      },
    );

    test.for(ALIGNS.map((align) => ({ align })))(
      "align=$align → ps1ui-stack--align-$align",
      async ({ align }) => {
        const screen = await render(
          <Stack align={align} data-testid="s">
            x
          </Stack>,
        );
        await expect.element(screen.getByTestId("s")).toHaveClass(`ps1ui-stack--align-${align}`);
      },
    );

    test.for(JUSTIFIES.map((justify) => ({ justify })))(
      "justify=$justify → ps1ui-stack--justify-$justify",
      async ({ justify }) => {
        const screen = await render(
          <Stack justify={justify} data-testid="s">
            x
          </Stack>,
        );
        await expect
          .element(screen.getByTestId("s"))
          .toHaveClass(`ps1ui-stack--justify-${justify}`);
      },
    );

    test("wrap=true → ps1ui-stack--wrap; wrap=false omits it", async () => {
      const on = await render(
        <Stack wrap data-testid="s">
          x
        </Stack>,
      );
      const off = await render(<Stack data-testid="s2">x</Stack>);
      expect(on.getByTestId("s").element().classList.contains("ps1ui-stack--wrap")).toBe(true);
      expect(off.getByTestId("s2").element().classList.contains("ps1ui-stack--wrap")).toBe(false);
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <Stack className="extra" data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s");
      await expect.element(el).toHaveClass("ps1ui-stack");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("computed styles", () => {
    test("base sets display: flex", async () => {
      const screen = await render(<Stack data-testid="s">x</Stack>);
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(getComputedStyle(el).display).toBe("flex");
    });

    test.for(DIRECTIONS.map((direction) => ({ direction })))(
      "direction=$direction → flex-direction: $direction",
      async ({ direction }) => {
        const screen = await render(
          <Stack direction={direction} data-testid="s">
            x
          </Stack>,
        );
        const el = screen.getByTestId("s").element() as HTMLDivElement;
        expect(getComputedStyle(el).flexDirection).toBe(direction);
      },
    );

    test.for(GAPS.map((gap) => ({ gap, expected: GAP_PX[gap] })))(
      "gap=$gap → row-gap and column-gap resolve to $expected",
      async ({ gap, expected }) => {
        const screen = await render(
          <Stack gap={gap} data-testid="s">
            x
          </Stack>,
        );
        const el = screen.getByTestId("s").element() as HTMLDivElement;
        const cs = getComputedStyle(el);
        // `gap` shorthand doesn't always populate on getComputedStyle across
        // engines; row-gap / column-gap always do.
        expect(cs.rowGap).toBe(expected);
        expect(cs.columnGap).toBe(expected);
      },
    );

    test.for(ALIGNS.map((align) => ({ align, expected: ALIGN_ITEMS[align] })))(
      "align=$align → align-items: $expected",
      async ({ align, expected }) => {
        const screen = await render(
          <Stack align={align} data-testid="s">
            x
          </Stack>,
        );
        const el = screen.getByTestId("s").element() as HTMLDivElement;
        expect(getComputedStyle(el).alignItems).toBe(expected);
      },
    );

    test.for(JUSTIFIES.map((justify) => ({ justify, expected: JUSTIFY_CONTENT[justify] })))(
      "justify=$justify → justify-content: $expected",
      async ({ justify, expected }) => {
        const screen = await render(
          <Stack justify={justify} data-testid="s">
            x
          </Stack>,
        );
        const el = screen.getByTestId("s").element() as HTMLDivElement;
        expect(getComputedStyle(el).justifyContent).toBe(expected);
      },
    );

    test("wrap=true → flex-wrap: wrap; wrap=false → flex-wrap: nowrap (initial)", async () => {
      const on = await render(
        <Stack wrap data-testid="s">
          x
        </Stack>,
      );
      const off = await render(<Stack data-testid="s2">x</Stack>);
      expect(getComputedStyle(on.getByTestId("s").element() as HTMLDivElement).flexWrap).toBe(
        "wrap",
      );
      expect(getComputedStyle(off.getByTestId("s2").element() as HTMLDivElement).flexWrap).toBe(
        "nowrap",
      );
    });
  });

  describe("passthrough", () => {
    test("forwards native <div> attributes (id, role, aria-label, data-*)", async () => {
      const screen = await render(
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- exercises Stack's role passthrough; Stack is intentionally a bare <div>.
        <Stack id="toolbar" role="toolbar" aria-label="actions" data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s");
      await expect.element(el).toHaveAttribute("id", "toolbar");
      await expect.element(el).toHaveAttribute("role", "toolbar");
      await expect.element(el).toHaveAttribute("aria-label", "actions");
    });

    test("forwards and preserves the style attribute", async () => {
      const screen = await render(
        <Stack data-testid="s" style={{ padding: 10 }}>
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(el.style.padding).toContain("10px");
    });
  });

  describe("a11y", () => {
    type A11yCase = { name: string; node: () => ReactElement };

    const cases: A11yCase[] = [
      {
        name: "column stack of paragraphs",
        node: () => (
          <Stack>
            <Text>first line</Text>
            <Text>second line</Text>
            <Text>third line</Text>
          </Stack>
        ),
      },
      {
        name: "row stack with center align",
        node: () => (
          <Stack direction="row" align="center" gap="sm">
            <Text>label</Text>
            <Text>value</Text>
          </Stack>
        ),
      },
      {
        name: "as a labelled toolbar",
        node: () => (
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- documents the labelled-toolbar pattern; Stack is intentionally a bare <div>.
          <Stack direction="row" role="toolbar" aria-label="actions" gap="sm">
            <Button variant="secondary">a</Button>
            <Button variant="secondary">b</Button>
          </Stack>
        ),
      },
    ];

    test.for(cases)("$name → no axe violations", async ({ node }) => {
      const screen = await render(node());
      await expectNoAxeViolations(screen.container);
    });
  });
});
