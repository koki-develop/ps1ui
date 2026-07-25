import "../../styles/styles.css";

import type { CSSProperties, ReactElement, ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import type { Breakpoint } from "../../utils/responsive";
import { Anchor } from "../Anchor/Anchor";
import { Button } from "../Button/Button";
import { CodeBlock } from "../CodeBlock/CodeBlock";
import { Text } from "../Text/Text";
import {
  Stack,
  type StackAlign,
  type StackDirection,
  type StackGap,
  type StackJustify,
  type StackProps,
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

const BREAKPOINTS_NON_BASE = ["sm", "md", "lg", "xl"] as const satisfies readonly Exclude<
  Breakpoint,
  "base"
>[];

// Expected computed-style values per prop input, mirroring the transform
// functions in Stack.tsx. Kept as exhaustive Record<> so adding a new value
// fails the `satisfies` check below until this table is updated too.
const GAP_PX = {
  none: "0px",
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
} as const satisfies Record<StackGap, string>;

const GAP_VAR = {
  none: "0",
  xs: "var(--ps1ui-space-xs)",
  sm: "var(--ps1ui-space-sm)",
  md: "var(--ps1ui-space-md)",
  lg: "var(--ps1ui-space-lg)",
  xl: "var(--ps1ui-space-xl)",
  "2xl": "var(--ps1ui-space-2xl)",
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

// Renders a UI tree inside a fixed-width `container-type: inline-size` wrapper
// so Stack's own `@container` queries match against the wrapper. Without this
// wrapper, Stack has no containment ancestor and only the `base` value is
// applied (documented silent no-op fallback).
function renderInContainerAtWidth(width: number, ui: ReactElement) {
  return render(
    <div
      data-testid="query-context"
      style={
        {
          containerType: "inline-size",
          width,
          background: "transparent",
        } as CSSProperties
      }
    >
      {ui}
    </div>,
  );
}

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

    test("has no default role (leaves semantics to the caller)", async () => {
      const screen = await render(<Stack data-testid="s">x</Stack>);
      const el = screen.getByTestId("s").element();
      expect(el.getAttribute("role")).toBeNull();
    });

    // `as` — a layout box is very often the semantic element too (a <nav> of
    // links, the page <main>). Nothing Stack does is div-specific: the class
    // and the inline `--_stack-*` variables carry the whole layout, so each
    // case asserts BOTH that the tag changed and that the flex layout still
    // resolves on it — a tag swap that quietly dropped the styling would
    // otherwise read as a pass.
    test.for([{ tag: "nav" }, { tag: "main" }, { tag: "section" }, { tag: "header" }] as const)(
      "as=$tag renders that tag with the flex layout intact",
      async ({ tag }) => {
        const screen = await render(
          <Stack as={tag} direction="row" gap="xl" data-testid="s">
            <span>a</span>
          </Stack>,
        );
        const el = screen.getByTestId("s").element() as HTMLElement;
        expect(el.tagName.toLowerCase()).toBe(tag);
        expect(el.classList.contains("ps1ui-stack")).toBe(true);
        expect(el.style.getPropertyValue("--_stack-gap-base")).toBe(GAP_VAR.xl);
        const cs = getComputedStyle(el);
        expect(cs.display).toBe("flex");
        expect(cs.flexDirection).toBe("row");
        expect(cs.columnGap).toBe(GAP_PX.xl);
      },
    );

    test("as={Component} renders the component and hands it the merged class and style", async () => {
      type SectionProps = { className?: string; style?: CSSProperties; children?: ReactNode };
      const Panel = ({ className, style, children }: SectionProps) => (
        <section className={className} data-panel="1" data-testid="s" style={style}>
          {children}
        </section>
      );
      const screen = await render(
        <Stack as={Panel} gap="xl" className="extra">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLElement;
      expect(el.tagName.toLowerCase()).toBe("section");
      expect(el.getAttribute("data-panel")).toBe("1");
      expect(el.classList.contains("ps1ui-stack")).toBe(true);
      expect(el.classList.contains("extra")).toBe(true);
      expect(el.style.getPropertyValue("--_stack-gap-base")).toBe(GAP_VAR.xl);
    });

    // The motivating case from the issue that added `as`: a <nav> that is also
    // a Stack, which previously forced callers to hand-roll flex CSS to keep
    // the landmark. `queryContainer` rides along to prove the modifier class
    // (and therefore containment) is not tied to the div either.
    test("as=nav keeps its landmark role and can still establish containment", async () => {
      const screen = await render(
        <Stack as="nav" aria-label="primary" queryContainer data-testid="s">
          <span>a</span>
        </Stack>,
      );
      const el = screen.getByRole("navigation", { name: "primary" }).element() as HTMLElement;
      expect(el.tagName.toLowerCase()).toBe("nav");
      expect(el.classList.contains("ps1ui-stack--query-container")).toBe(true);
      expect(getComputedStyle(el).containerType).toBe("inline-size");
    });

    // base.css's reset computes `list-style-type: none` on <ul>/<ol>/<menu>,
    // which drops the list semantic from Safari's a11y tree. `List` already
    // stamps `role="list"` to restore it; `as="ul"` reaches the same element,
    // so Stack does too — see utils/listSemantics.ts.
    test.for([{ tag: "ul" }, { tag: "ol" }, { tag: "menu" }] as const)(
      "as=$tag stamps role=list so Safari still announces the list semantic",
      async ({ tag }) => {
        const screen = await render(
          <Stack as={tag} data-testid="s">
            <li>a</li>
          </Stack>,
        );
        expect(screen.getByTestId("s").element().getAttribute("role")).toBe("list");
      },
    );

    test("as=ul with a caller-supplied role keeps the caller's role", async () => {
      const screen = await render(
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- exercises the role override on top of the `as="ul"` list default.
        <Stack as="ul" role="menu" data-testid="s">
          <li role="menuitem">a</li>
        </Stack>,
      );
      expect(screen.getByTestId("s").element().getAttribute("role")).toBe("menu");
    });

    test("as=nav stamps no role (the list default is scoped to <ul>/<ol>/<menu>)", async () => {
      const screen = await render(
        <Stack as="nav" data-testid="s">
          a
        </Stack>,
      );
      expect(screen.getByTestId("s").element().getAttribute("role")).toBeNull();
    });
  });

  describe("class composition", () => {
    test("applies the base ps1ui-stack class", async () => {
      const screen = await render(<Stack data-testid="s">x</Stack>);
      const el = screen.getByTestId("s").element();
      expect(el.classList.contains("ps1ui-stack")).toBe(true);
    });

    test("does not emit legacy BEM modifier classes (all axes handled via CSS variables now)", async () => {
      // The old modifier classes (`ps1ui-stack--direction-*`,
      // `ps1ui-stack--gap-*`, `ps1ui-stack--align-*`, `ps1ui-stack--justify-*`,
      // `ps1ui-stack--wrap`) were replaced by inline CSS variables that cascade
      // through @container queries. Locking in that BEM classes are gone —
      // catches an accidental partial revert.
      const screen = await render(
        <Stack direction="row" gap="xl" align="center" justify="between" wrap data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element();
      for (const cls of Array.from(el.classList)) {
        expect(cls).not.toMatch(/^ps1ui-stack--(direction|gap|align|justify|wrap)/);
      }
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <Stack className="extra other" data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s");
      await expect.element(el).toHaveClass("ps1ui-stack");
      await expect.element(el).toHaveClass("extra");
      await expect.element(el).toHaveClass("other");
    });
  });

  describe("containment context", () => {
    // Three fixed-width blocks with gap="none" so the Stack's max-content
    // inline size is exactly 30px — a number a collapsed (contained) Stack
    // can never produce.
    const CONTENT_WIDTH = 30;
    const contentCells = [0, 1, 2].map((i) => (
      <span key={i} style={{ display: "block", width: 10, height: 10 }} />
    ));

    test("is not a query container by default", async () => {
      const screen = await render(<Stack data-testid="s">x</Stack>);
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(el.classList.contains("ps1ui-stack--query-container")).toBe(false);
      expect(getComputedStyle(el).containerType).toBe("normal");
    });

    test("queryContainer establishes an inline-size context named `ps1ui-stack`", async () => {
      const screen = await render(
        <Stack queryContainer data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(el.classList.contains("ps1ui-stack--query-container")).toBe(true);
      expect(getComputedStyle(el).containerType).toBe("inline-size");
      expect(getComputedStyle(el).containerName).toBe("ps1ui-stack");
    });

    // The regression the opt-in default exists for. `container-type:
    // inline-size` implies `contain: inline-size`, which resolves the
    // element's intrinsic inline size as 0 — so a row-flex child with
    // `flex-basis: auto` gets a hypothetical main size of 0 and collapses,
    // spilling its children outside its box. No CSS can undo that (the
    // cross-axis `align-self: stretch` defense does not reach the main axis),
    // which is exactly why a bare Stack must not be a query container.
    test("keeps its content width as a row-flex child", async () => {
      const screen = await render(
        <div style={{ display: "flex", flexDirection: "row", width: 500 }}>
          <Stack direction="row" gap="none" data-testid="s">
            {contentCells}
          </Stack>
        </div>,
      );
      const stack = screen.getByTestId("s").element() as HTMLDivElement;
      expect(stack.getBoundingClientRect().width).toBe(CONTENT_WIDTH);
    });

    // The documented cost of opting in, pinned so it stays a conscious trade
    // rather than a surprise: same tree, `queryContainer` added, width 0.
    test("queryContainer forfeits intrinsic width as a row-flex child", async () => {
      const screen = await render(
        <div style={{ display: "flex", flexDirection: "row", width: 500 }}>
          <Stack queryContainer direction="row" gap="none" data-testid="s">
            {contentCells}
          </Stack>
        </div>,
      );
      const stack = screen.getByTestId("s").element() as HTMLDivElement;
      expect(stack.getBoundingClientRect().width).toBe(0);
    });

    // The cross-axis defense in components.css is scoped to the modifier, so
    // a default Stack sizes like any other flex item: shrink-wrapped by a
    // `align-items: flex-start` parent instead of silently stretched.
    test("shrink-wraps in a shrink-wrap flex parent by default", async () => {
      const screen = await render(
        <div
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: 500 }}
        >
          <Stack direction="row" gap="none" data-testid="s">
            {contentCells}
          </Stack>
        </div>,
      );
      const stack = screen.getByTestId("s").element() as HTMLDivElement;
      expect(getComputedStyle(stack).alignSelf).toBe("auto");
      expect(stack.getBoundingClientRect().width).toBe(CONTENT_WIDTH);
    });

    // …and once opted in, the shared `.ps1ui-*--query-container` rule in
    // components.css must keep it filling the parent's cross axis, which is
    // the one axis containment loss CAN be defended on.
    test("queryContainer resists cross-axis collapse via align-self: stretch", async () => {
      const screen = await render(
        <div
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: 500 }}
        >
          <Stack queryContainer data-testid="s">
            <span>x</span>
          </Stack>
        </div>,
      );
      const stack = screen.getByTestId("s").element() as HTMLDivElement;
      expect(getComputedStyle(stack).alignSelf).toBe("stretch");
      expect(stack.getBoundingClientRect().width).toBe(500);
    });

    // Behavioral proof that the prop actually redirects the query surface:
    // the same 400px-wide outer Stack sits inside a 1200px query context, so
    // the inner Stack's `md` breakpoint fires only when the OUTER Stack is
    // the container it resolves against (400 < 768 → `base`).
    describe("redirects descendants' @container queries when opted in", () => {
      const tree = (queryContainer: boolean) => (
        <div style={{ containerType: "inline-size", width: 1200 } as CSSProperties}>
          <Stack queryContainer={queryContainer} style={{ width: 400 }} data-testid="outer">
            <Stack direction={{ base: "column", md: "row" }} data-testid="inner">
              x
            </Stack>
          </Stack>
        </div>
      );

      test("default → inner resolves against the outer 1200px context", async () => {
        const screen = await render(tree(false));
        const inner = screen.getByTestId("inner").element() as HTMLDivElement;
        expect(getComputedStyle(inner).flexDirection).toBe("row");
      });

      test("queryContainer → inner resolves against the 400px Stack", async () => {
        const screen = await render(tree(true));
        const inner = screen.getByTestId("inner").element() as HTMLDivElement;
        expect(getComputedStyle(inner).flexDirection).toBe("column");
      });
    });
  });

  describe("inline style CSS variables", () => {
    test("no props → no --_stack-* variables are emitted", async () => {
      const screen = await render(<Stack data-testid="s">x</Stack>);
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      const styleAttr = el.getAttribute("style") ?? "";
      expect(styleAttr).not.toMatch(/--_stack-(direction|gap|align|justify|wrap)-/);
    });

    test.for(DIRECTIONS.map((direction) => ({ direction })))(
      "direction=$direction scalar → --_stack-direction-base = $direction",
      async ({ direction }) => {
        const screen = await render(
          <Stack direction={direction} data-testid="s">
            x
          </Stack>,
        );
        const el = screen.getByTestId("s").element() as HTMLDivElement;
        expect(el.style.getPropertyValue("--_stack-direction-base")).toBe(direction);
        for (const bp of BREAKPOINTS_NON_BASE) {
          expect(el.style.getPropertyValue(`--_stack-direction-${bp}`)).toBe("");
        }
      },
    );

    test.for(GAPS.map((gap) => ({ gap })))(
      "gap=$gap scalar → --_stack-gap-base is emitted",
      async ({ gap }) => {
        const screen = await render(
          <Stack gap={gap} data-testid="s">
            x
          </Stack>,
        );
        const el = screen.getByTestId("s").element() as HTMLDivElement;
        expect(el.style.getPropertyValue("--_stack-gap-base")).toBe(GAP_VAR[gap]);
        for (const bp of BREAKPOINTS_NON_BASE) {
          expect(el.style.getPropertyValue(`--_stack-gap-${bp}`)).toBe("");
        }
      },
    );

    test.for(ALIGNS.map((align) => ({ align })))(
      "align=$align scalar → --_stack-align-base = $expected",
      async ({ align }) => {
        const screen = await render(
          <Stack align={align} data-testid="s">
            x
          </Stack>,
        );
        const el = screen.getByTestId("s").element() as HTMLDivElement;
        expect(el.style.getPropertyValue("--_stack-align-base")).toBe(ALIGN_ITEMS[align]);
        for (const bp of BREAKPOINTS_NON_BASE) {
          expect(el.style.getPropertyValue(`--_stack-align-${bp}`)).toBe("");
        }
      },
    );

    test.for(JUSTIFIES.map((justify) => ({ justify })))(
      "justify=$justify scalar → --_stack-justify-base = $expected",
      async ({ justify }) => {
        const screen = await render(
          <Stack justify={justify} data-testid="s">
            x
          </Stack>,
        );
        const el = screen.getByTestId("s").element() as HTMLDivElement;
        expect(el.style.getPropertyValue("--_stack-justify-base")).toBe(JUSTIFY_CONTENT[justify]);
        for (const bp of BREAKPOINTS_NON_BASE) {
          expect(el.style.getPropertyValue(`--_stack-justify-${bp}`)).toBe("");
        }
      },
    );

    test.for([{ wrap: true }, { wrap: false }])(
      "wrap=$wrap scalar → --_stack-wrap-base is emitted",
      async ({ wrap }) => {
        const screen = await render(
          <Stack wrap={wrap} data-testid="s">
            x
          </Stack>,
        );
        const el = screen.getByTestId("s").element() as HTMLDivElement;
        expect(el.style.getPropertyValue("--_stack-wrap-base")).toBe(wrap ? "wrap" : "nowrap");
        for (const bp of BREAKPOINTS_NON_BASE) {
          expect(el.style.getPropertyValue(`--_stack-wrap-${bp}`)).toBe("");
        }
      },
    );

    test("direction responsive object emits one variable per specified breakpoint", async () => {
      const screen = await render(
        <Stack direction={{ base: "column", md: "row" }} data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_stack-direction-base")).toBe("column");
      expect(el.style.getPropertyValue("--_stack-direction-md")).toBe("row");
      expect(el.style.getPropertyValue("--_stack-direction-sm")).toBe("");
      expect(el.style.getPropertyValue("--_stack-direction-lg")).toBe("");
      expect(el.style.getPropertyValue("--_stack-direction-xl")).toBe("");
    });

    test("gap responsive object emits one variable per specified breakpoint", async () => {
      const screen = await render(
        <Stack gap={{ base: "sm", md: "xl" }} data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_stack-gap-base")).toBe(GAP_VAR.sm);
      expect(el.style.getPropertyValue("--_stack-gap-md")).toBe(GAP_VAR.xl);
    });

    test("align responsive object emits mapped values per specified breakpoint", async () => {
      const screen = await render(
        <Stack align={{ base: "start", md: "center" }} data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_stack-align-base")).toBe("flex-start");
      expect(el.style.getPropertyValue("--_stack-align-md")).toBe("center");
    });

    test("justify responsive object emits mapped values per specified breakpoint", async () => {
      const screen = await render(
        <Stack justify={{ base: "start", md: "between" }} data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_stack-justify-base")).toBe("flex-start");
      expect(el.style.getPropertyValue("--_stack-justify-md")).toBe("space-between");
    });

    test("wrap responsive object emits mapped values per specified breakpoint", async () => {
      const screen = await render(
        <Stack wrap={{ base: false, md: true }} data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_stack-wrap-base")).toBe("nowrap");
      expect(el.style.getPropertyValue("--_stack-wrap-md")).toBe("wrap");
    });

    test("full 5-breakpoint direction object emits all five variables", async () => {
      const screen = await render(
        <Stack
          direction={{ base: "column", sm: "row", md: "column", lg: "row", xl: "column" }}
          data-testid="s"
        >
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_stack-direction-base")).toBe("column");
      expect(el.style.getPropertyValue("--_stack-direction-sm")).toBe("row");
      expect(el.style.getPropertyValue("--_stack-direction-md")).toBe("column");
      expect(el.style.getPropertyValue("--_stack-direction-lg")).toBe("row");
      expect(el.style.getPropertyValue("--_stack-direction-xl")).toBe("column");
    });

    test("object without base entry emits only the specified breakpoints", async () => {
      const screen = await render(
        <Stack direction={{ md: "row" }} data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_stack-direction-base")).toBe("");
      expect(el.style.getPropertyValue("--_stack-direction-md")).toBe("row");
    });

    test("combines all five responsive axes into one merged style", async () => {
      const screen = await render(
        <Stack
          direction={{ base: "column", md: "row" }}
          gap={{ base: "sm", md: "xl" }}
          align={{ base: "start", md: "center" }}
          justify={{ base: "start", md: "between" }}
          wrap={{ base: false, md: true }}
          data-testid="s"
        >
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_stack-direction-base")).toBe("column");
      expect(el.style.getPropertyValue("--_stack-direction-md")).toBe("row");
      expect(el.style.getPropertyValue("--_stack-gap-base")).toBe(GAP_VAR.sm);
      expect(el.style.getPropertyValue("--_stack-gap-md")).toBe(GAP_VAR.xl);
      expect(el.style.getPropertyValue("--_stack-align-base")).toBe("flex-start");
      expect(el.style.getPropertyValue("--_stack-align-md")).toBe("center");
      expect(el.style.getPropertyValue("--_stack-justify-base")).toBe("flex-start");
      expect(el.style.getPropertyValue("--_stack-justify-md")).toBe("space-between");
      expect(el.style.getPropertyValue("--_stack-wrap-base")).toBe("nowrap");
      expect(el.style.getPropertyValue("--_stack-wrap-md")).toBe("wrap");
    });

    test("caller-supplied style is preserved alongside responsive vars", async () => {
      const screen = await render(
        <Stack direction="row" gap="lg" style={{ padding: 10 }} data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(el.style.padding).toContain("10px");
      expect(el.style.getPropertyValue("--_stack-direction-base")).toBe("row");
      expect(el.style.getPropertyValue("--_stack-gap-base")).toBe(GAP_VAR.lg);
    });
  });

  describe("computed styles: scalar (no responsive)", () => {
    test("base sets display: flex", async () => {
      const screen = await render(<Stack data-testid="s">x</Stack>);
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(getComputedStyle(el).display).toBe("flex");
    });

    test("no props → CSS defaults: direction=column, gap=12px, flex-wrap=nowrap", async () => {
      const screen = await render(<Stack data-testid="s">x</Stack>);
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      const cs = getComputedStyle(el);
      expect(cs.flexDirection).toBe("column");
      expect(cs.rowGap).toBe("12px");
      expect(cs.columnGap).toBe("12px");
      expect(cs.flexWrap).toBe("nowrap");
    });

    test.for(DIRECTIONS.map((direction) => ({ direction })))(
      "direction=$direction scalar → flex-direction: $direction",
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
      "gap=$gap scalar → row-gap and column-gap resolve to $expected",
      async ({ gap, expected }) => {
        const screen = await render(
          <Stack gap={gap} data-testid="s">
            x
          </Stack>,
        );
        const el = screen.getByTestId("s").element() as HTMLDivElement;
        const cs = getComputedStyle(el);
        expect(cs.rowGap).toBe(expected);
        expect(cs.columnGap).toBe(expected);
      },
    );

    test.for(ALIGNS.map((align) => ({ align, expected: ALIGN_ITEMS[align] })))(
      "align=$align scalar → align-items: $expected",
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
      "justify=$justify scalar → justify-content: $expected",
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

    test.for([
      { wrap: true, expected: "wrap" },
      { wrap: false, expected: "nowrap" },
    ])("wrap=$wrap → flex-wrap: $expected", async ({ wrap, expected }) => {
      const screen = await render(
        <Stack wrap={wrap} data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(getComputedStyle(el).flexWrap).toBe(expected);
    });
  });

  describe("computed styles: responsive (via @container queries)", () => {
    type Band = { name: string; width: number; effectiveBreakpoint: Breakpoint };
    const BANDS: readonly Band[] = [
      { name: "below sm (base only)", width: 400, effectiveBreakpoint: "base" },
      { name: "sm band", width: 700, effectiveBreakpoint: "sm" },
      { name: "md band", width: 900, effectiveBreakpoint: "md" },
      { name: "lg band", width: 1200, effectiveBreakpoint: "lg" },
      { name: "xl band", width: 1400, effectiveBreakpoint: "xl" },
    ];

    // Full 5-breakpoint objects for each axis; entries are distinct per
    // breakpoint so the captured effective value is unambiguously the
    // breakpoint's.
    const FULL_DIRECTION = {
      base: "column",
      sm: "row",
      md: "column",
      lg: "row",
      xl: "column",
    } as const satisfies Record<Breakpoint, StackDirection>;

    const FULL_GAP = {
      base: "none",
      sm: "xs",
      md: "sm",
      lg: "lg",
      xl: "2xl",
    } as const satisfies Record<Breakpoint, StackGap>;

    const FULL_ALIGN = {
      base: "start",
      sm: "center",
      md: "end",
      lg: "stretch",
      xl: "baseline",
    } as const satisfies Record<Breakpoint, StackAlign>;

    const FULL_JUSTIFY = {
      base: "start",
      sm: "center",
      md: "end",
      lg: "between",
      xl: "evenly",
    } as const satisfies Record<Breakpoint, StackJustify>;

    const FULL_WRAP = {
      base: false,
      sm: true,
      md: false,
      lg: true,
      xl: false,
    } as const satisfies Record<Breakpoint, boolean>;

    test.for(BANDS)(
      "direction={full object} in $name ($width px) → flex-direction: $effectiveBreakpoint's value",
      async ({ width, effectiveBreakpoint }) => {
        const screen = await renderInContainerAtWidth(
          width,
          <Stack direction={FULL_DIRECTION} data-testid="s">
            x
          </Stack>,
        );
        const el = screen.getByTestId("s").element() as HTMLDivElement;
        expect(getComputedStyle(el).flexDirection).toBe(FULL_DIRECTION[effectiveBreakpoint]);
      },
    );

    test.for(BANDS)(
      "gap={full object} in $name ($width px) → gap resolves to $effectiveBreakpoint's px value",
      async ({ width, effectiveBreakpoint }) => {
        const screen = await renderInContainerAtWidth(
          width,
          <Stack gap={FULL_GAP} data-testid="s">
            x
          </Stack>,
        );
        const el = screen.getByTestId("s").element() as HTMLDivElement;
        const expectedGap = GAP_PX[FULL_GAP[effectiveBreakpoint]];
        const cs = getComputedStyle(el);
        expect(cs.rowGap).toBe(expectedGap);
        expect(cs.columnGap).toBe(expectedGap);
      },
    );

    test.for(BANDS)(
      "align={full object} in $name ($width px) → align-items: $effectiveBreakpoint's mapped value",
      async ({ width, effectiveBreakpoint }) => {
        const screen = await renderInContainerAtWidth(
          width,
          <Stack align={FULL_ALIGN} data-testid="s">
            x
          </Stack>,
        );
        const el = screen.getByTestId("s").element() as HTMLDivElement;
        expect(getComputedStyle(el).alignItems).toBe(ALIGN_ITEMS[FULL_ALIGN[effectiveBreakpoint]]);
      },
    );

    test.for(BANDS)(
      "justify={full object} in $name ($width px) → justify-content: $effectiveBreakpoint's mapped value",
      async ({ width, effectiveBreakpoint }) => {
        const screen = await renderInContainerAtWidth(
          width,
          <Stack justify={FULL_JUSTIFY} data-testid="s">
            x
          </Stack>,
        );
        const el = screen.getByTestId("s").element() as HTMLDivElement;
        expect(getComputedStyle(el).justifyContent).toBe(
          JUSTIFY_CONTENT[FULL_JUSTIFY[effectiveBreakpoint]],
        );
      },
    );

    test.for(BANDS)(
      "wrap={full object} in $name ($width px) → flex-wrap: $effectiveBreakpoint's mapped value",
      async ({ width, effectiveBreakpoint }) => {
        const screen = await renderInContainerAtWidth(
          width,
          <Stack wrap={FULL_WRAP} data-testid="s">
            x
          </Stack>,
        );
        const el = screen.getByTestId("s").element() as HTMLDivElement;
        expect(getComputedStyle(el).flexWrap).toBe(
          FULL_WRAP[effectiveBreakpoint] ? "wrap" : "nowrap",
        );
      },
    );

    test("cascade fallback: direction={base:'column', md:'row'} in sm band → base (column) survives", async () => {
      const screen = await renderInContainerAtWidth(
        700,
        <Stack direction={{ base: "column", md: "row" }} data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(getComputedStyle(el).flexDirection).toBe("column");
    });

    test("cascade fallback: direction={base:'column', md:'row'} above md → md (row) wins for all wider breakpoints", async () => {
      const screen = await renderInContainerAtWidth(
        1400,
        <Stack direction={{ base: "column", md: "row" }} data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(getComputedStyle(el).flexDirection).toBe("row");
    });

    test("cascade fallback: object without base → CSS default (column) at base breakpoint", async () => {
      // Split into two tests to sidestep vitest-browser-react's shared-page
      // isolation model — a second `render()` in the same test doesn't
      // unmount the first, and both `data-testid="s"` elements coexist,
      // tripping Playwright's strict-mode locator check.
      const screen = await renderInContainerAtWidth(
        400,
        <Stack direction={{ md: "row" }} data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(getComputedStyle(el).flexDirection).toBe("column");
    });

    test("cascade fallback: object without base → md override kicks in at md band", async () => {
      const screen = await renderInContainerAtWidth(
        900,
        <Stack direction={{ md: "row" }} data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(getComputedStyle(el).flexDirection).toBe("row");
    });

    test("no responsive props inside a wide container → CSS defaults still apply", async () => {
      const screen = await renderInContainerAtWidth(1400, <Stack data-testid="s">x</Stack>);
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      const cs = getComputedStyle(el);
      expect(cs.flexDirection).toBe("column");
      expect(cs.rowGap).toBe("12px");
      expect(cs.flexWrap).toBe("nowrap");
    });
  });

  describe("nested Stack responds to an opted-in outer Stack's width", () => {
    test("inner Stack inside a 900px-wide `queryContainer` outer → responds to outer's inline-size", async () => {
      const screen = await render(
        <div style={{ width: 900 }}>
          <Stack queryContainer data-testid="outer">
            <Stack direction={{ base: "column", md: "row" }} data-testid="inner">
              x
            </Stack>
          </Stack>
        </div>,
      );
      const inner = screen.getByTestId("inner").element() as HTMLDivElement;
      // Outer Stack is 900px inline-size → matches sm and md breakpoints.
      // Highest match = md → inner picks its `md` entry = 'row'.
      expect(getComputedStyle(inner).flexDirection).toBe("row");
    });
  });

  // Regression net for the responsive-prop cascade leak: CSS custom properties
  // inherit by default (css-variables §2), so a parent Stack's inline
  // `--_stack-<axis>-<bp>` would otherwise cascade into every nested Stack and
  // corrupt the child's own `var(--_stack-<axis>-<bp>, fallback)` chain when
  // the matching container query fires. Stack.css declares each
  // `--_stack-<axis>-<bp>` as `@property { inherits: false }` to block that
  // leak. If ANY of those 25 @property blocks is removed, at least one test
  // in this matrix trips.
  //
  // Shape: for each responsive axis × each non-base breakpoint, outer sets
  // ONLY that breakpoint's value (distinct from every fallback the child
  // would compute); inner sets ONLY `base` scalar (or omits the prop
  // entirely — CSS default takes over). Rendered inside a
  // `container-type: inline-size` wrapper at a width where the target
  // breakpoint is the highest match (see BREAKPOINT_WIDTHS), so the outer's
  // OWN @container query fires — that guarantees the outer's inline-size
  // exceeds the target and inner's @container query fires too. The child
  // must resolve to its own base, NOT the inherited breakpoint value.
  //
  // Axis table declared with `satisfies` over a Record keyed by every
  // responsive prop Stack currently exposes — adding a new responsive prop
  // to StackProps fails compilation here until the table is updated. The
  // build check `check-responsive-property-coverage.mjs` catches the CSS
  // side (missing @property for a new axis) as a separate structural gate.
  describe("nested Stack does not inherit outer's per-breakpoint input vars", () => {
    // Wrapper width picked so the named breakpoint is the HIGHEST @container
    // query match — outer's OWN queries then fire at that breakpoint too, so
    // outer's inline-size clears the threshold and inner's query also fires.
    // sm=40rem/640, md=48rem/768, lg=64rem/1024, xl=80rem/1280.
    const BREAKPOINT_WIDTHS = { sm: 700, md: 900, lg: 1200, xl: 1400 } as const;

    type StackLeakAxis = keyof typeof STACK_LEAK_TABLE;
    type StackLeakCase = {
      outerFor: (
        bp: Exclude<Breakpoint, "base">,
      ) => Partial<Omit<StackProps, "children" | "ref" | "as">>;
      inner: Partial<Omit<StackProps, "children" | "ref" | "as">>;
      computed: (cs: CSSStyleDeclaration) => string;
      expected: string;
    };

    // Record keyed by every responsive axis Stack currently exposes.
    // TypeScript ensures every key here is a valid StackProps responsive
    // axis and forbids typos; the accompanying `satisfies` clause below
    // pins the value shape. Adding `newAxis` to StackProps means updating
    // the union below AND adding an entry here — either half missing is a
    // compile error.
    const STACK_LEAK_TABLE = {
      direction: {
        outerFor: (bp) => ({ direction: { base: "column", [bp]: "row" } }),
        inner: { direction: "column" },
        computed: (cs) => cs.flexDirection,
        expected: "column",
      },
      gap: {
        outerFor: (bp) => ({ gap: { base: "sm", [bp]: "2xl" } }),
        inner: { gap: "sm" },
        computed: (cs) => cs.rowGap,
        expected: "8px",
      },
      align: {
        // Inner omits the prop entirely — its computed value must be the
        // CSS default (`normal`), not the ancestor's `-<bp>` value.
        outerFor: (bp) => ({ align: { base: "start", [bp]: "center" } }),
        inner: {},
        computed: (cs) => cs.alignItems,
        expected: "normal",
      },
      justify: {
        // `normal` is Stack.css's declared fallback for `--_justify-base`;
        // in a flex-row context `normal` renders as `flex-start`, but the
        // computed keyword IS `normal` — assert what getComputedStyle returns.
        outerFor: (bp) => ({ justify: { base: "start", [bp]: "between" } }),
        inner: {},
        computed: (cs) => cs.justifyContent,
        expected: "normal",
      },
      wrap: {
        outerFor: (bp) => ({ wrap: { base: false, [bp]: true } }),
        inner: {},
        computed: (cs) => cs.flexWrap,
        expected: "nowrap",
      },
    } as const satisfies Record<"direction" | "gap" | "align" | "justify" | "wrap", StackLeakCase>;

    const CASES = (Object.keys(STACK_LEAK_TABLE) as StackLeakAxis[]).flatMap((axis) =>
      BREAKPOINTS_NON_BASE.map((bp) => ({
        axis,
        bp,
        width: BREAKPOINT_WIDTHS[bp],
        ...STACK_LEAK_TABLE[axis],
      })),
    );

    test.for(CASES)(
      "outer $axis leak at $bp does not reach inner",
      async ({ outerFor, inner, computed, expected, bp, width }) => {
        const screen = await render(
          <div style={{ containerType: "inline-size", width } as CSSProperties}>
            <Stack {...outerFor(bp)} data-testid="outer">
              <Stack {...inner} data-testid="inner">
                x
              </Stack>
            </Stack>
          </div>,
        );
        const innerEl = screen.getByTestId("inner").element() as HTMLDivElement;
        expect(computed(getComputedStyle(innerEl))).toBe(expected);
      },
    );
  });

  // Independent of containment, and load-bearing on its own: a flex item's
  // automatic minimum size is its content's min-content width, and CodeBlock is
  // `white-space: pre` — so its min-content width is the longest unwrapped
  // source line. Without the shared `min-width: 0` base rule in components.css
  // the Stack refuses to shrink and bursts the row open (measured at 3498px
  // inside a 300px parent), sending the whole document into horizontal scroll
  // instead of letting CodeBlock's own `overflow-x: auto` take over.
  describe("nested overflow-scroll surfaces", () => {
    test("lets a nested CodeBlock shrink inside a narrow row-flex parent", async () => {
      const screen = await render(
        <div style={{ display: "flex", flexDirection: "row", width: 300 }}>
          <Stack data-testid="s">
            <CodeBlock language="tsx" code={`const x = ${"a".repeat(400)};`} />
          </Stack>
        </div>,
      );
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(el.getBoundingClientRect().width).toBeLessThanOrEqual(300);
    });
  });

  describe("passthrough", () => {
    test("forwards native <div> attributes (id, role, aria-label, data-*)", async () => {
      const screen = await render(
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- exercises Stack's role passthrough; `role="toolbar"` has no native tag equivalent.
        <Stack id="toolbar" role="toolbar" aria-label="actions" data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s");
      await expect.element(el).toHaveAttribute("id", "toolbar");
      await expect.element(el).toHaveAttribute("role", "toolbar");
      await expect.element(el).toHaveAttribute("aria-label", "actions");
    });

    test("forwards a ref to the underlying <div>", async () => {
      let captured: HTMLDivElement | null = null;
      const setRef = (node: HTMLDivElement | null) => {
        captured = node;
      };
      await render(
        <Stack ref={setRef} data-testid="s">
          x
        </Stack>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLDivElement).tagName.toLowerCase()).toBe("div");
    });

    // `as` moves the ref target along with the tag — `createElement` receives
    // `ref` as an ordinary prop under React 19's ref-as-prop, so there is no
    // forwardRef hop to lose it. The type side of this (a ref typed for the
    // wrong element is rejected) lives in src/polymorphic.test-d.tsx.
    test("forwards a ref to the element `as` resolved to", async () => {
      let captured: HTMLElement | null = null;
      const setRef = (node: HTMLElement | null) => {
        captured = node;
      };
      await render(
        <Stack as="nav" ref={setRef} data-testid="s">
          x
        </Stack>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLElement).tagName.toLowerCase()).toBe("nav");
    });

    test("forwards native attributes onto the element `as` resolved to", async () => {
      const screen = await render(
        <Stack as="a" href="/routed" data-testid="s">
          x
        </Stack>,
      );
      const el = screen.getByTestId("s");
      await expect.element(el).toHaveAttribute("href", "/routed");
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
        name: "responsive direction and gap",
        node: () => (
          <Stack direction={{ base: "column", md: "row" }} gap={{ base: "sm", md: "lg" }}>
            <Text>label</Text>
            <Text>value</Text>
          </Stack>
        ),
      },
      {
        name: "responsive align and justify",
        node: () => (
          <Stack
            direction="row"
            align={{ base: "start", md: "center" }}
            justify={{ base: "start", md: "between" }}
          >
            <Text>label</Text>
            <Text>value</Text>
          </Stack>
        ),
      },
      {
        name: "as a labelled toolbar",
        node: () => (
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- documents the labelled-toolbar pattern; `role="toolbar"` has no native tag equivalent.
          <Stack direction="row" role="toolbar" aria-label="actions" gap="sm">
            <Button variant="secondary">a</Button>
            <Button variant="secondary">b</Button>
          </Stack>
        ),
      },
      {
        name: "as a labelled navigation landmark",
        node: () => (
          <Stack as="nav" aria-label="primary" direction="row" gap="sm">
            <Anchor href="/a">a</Anchor>
            <Anchor href="/b">b</Anchor>
          </Stack>
        ),
      },
      {
        name: "as a list of items",
        node: () => (
          <Stack as="ul" gap="sm">
            <li>
              <Text>first</Text>
            </li>
            <li>
              <Text>second</Text>
            </li>
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
