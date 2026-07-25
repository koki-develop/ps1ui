import "../../styles/styles.css";

import type { CSSProperties, ReactElement, ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import type { Breakpoint } from "../../utils/responsive";
import { CodeBlock } from "../CodeBlock/CodeBlock";
import { GridItem } from "../GridItem/GridItem";
import { Text } from "../Text/Text";
import { Grid, type GridGap, type GridProps } from "./Grid";

const GAPS = ["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const satisfies readonly GridGap[];

// Column counts exercised in unit/behavioural tests. Chosen to cover the
// realistic range (1..12) plus 1-column (default) — a change to the
// grid-template-columns rule breaks these.
const COLUMN_COUNTS = [1, 2, 3, 4, 6, 12] as const;

const BREAKPOINTS_NON_BASE = ["sm", "md", "lg", "xl"] as const satisfies readonly Exclude<
  Breakpoint,
  "base"
>[];

const GAP_PX = {
  none: "0px",
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
} as const satisfies Record<GridGap, string>;

// Mirrors Grid.tsx's spaceToVar() — the CSS var value stamped into inline
// style for each SpaceScale entry.
const GAP_VAR = {
  none: "0",
  xs: "var(--ps1ui-space-xs)",
  sm: "var(--ps1ui-space-sm)",
  md: "var(--ps1ui-space-md)",
  lg: "var(--ps1ui-space-lg)",
  xl: "var(--ps1ui-space-xl)",
  "2xl": "var(--ps1ui-space-2xl)",
} as const satisfies Record<GridGap, string>;

// Renders a UI tree inside a fixed-width `container-type: inline-size` wrapper
// so Grid's own `@container` queries match against the wrapper. Without this
// wrapper, Grid has no containment ancestor and only the `base` value is
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

describe("Grid", () => {
  describe("rendering", () => {
    test("renders a <div> with the given children", async () => {
      const screen = await render(
        <Grid data-testid="g">
          <span>a</span>
          <span>b</span>
        </Grid>,
      );
      const el = screen.getByTestId("g").element();
      expect(el.tagName.toLowerCase()).toBe("div");
      expect(el.textContent).toContain("a");
      expect(el.textContent).toContain("b");
    });

    test("has no default role (leaves semantics to the caller)", async () => {
      const screen = await render(<Grid data-testid="g">x</Grid>);
      const el = screen.getByTestId("g").element();
      expect(el.getAttribute("role")).toBeNull();
    });

    // `as` — a card grid is usually a list, and `role="list"` on a <div> is
    // only ever a stand-in for the real <ul>. Nothing Grid does is
    // div-specific: the class and the inline `--_grid-*` variables carry the
    // whole layout, so each case asserts BOTH that the tag changed and that
    // the grid still resolves on it — a tag swap that quietly dropped the
    // styling would otherwise read as a pass.
    test.for([{ tag: "nav" }, { tag: "section" }, { tag: "article" }, { tag: "aside" }] as const)(
      "as=$tag renders that tag with the grid layout intact",
      async ({ tag }) => {
        const screen = await render(
          <Grid as={tag} columns={3} gap="xl" data-testid="g">
            <span>a</span>
          </Grid>,
        );
        const el = screen.getByTestId("g").element() as HTMLElement;
        expect(el.tagName.toLowerCase()).toBe(tag);
        expect(el.classList.contains("ps1ui-grid")).toBe(true);
        expect(el.style.getPropertyValue("--_grid-gap-base")).toBe(GAP_VAR.xl);
        const cs = getComputedStyle(el);
        expect(cs.display).toBe("grid");
        expect(cs.gridTemplateColumns.split(" ")).toHaveLength(3);
        expect(cs.columnGap).toBe(GAP_PX.xl);
      },
    );

    test("as={Component} renders the component and hands it the merged class and style", async () => {
      type PanelProps = { className?: string; style?: CSSProperties; children?: ReactNode };
      const Panel = ({ className, style, children }: PanelProps) => (
        <section className={className} data-panel="1" data-testid="g" style={style}>
          {children}
        </section>
      );
      const screen = await render(
        <Grid as={Panel} gap="xl" className="extra">
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLElement;
      expect(el.tagName.toLowerCase()).toBe("section");
      expect(el.getAttribute("data-panel")).toBe("1");
      expect(el.classList.contains("ps1ui-grid")).toBe(true);
      expect(el.classList.contains("extra")).toBe(true);
      expect(el.style.getPropertyValue("--_grid-gap-base")).toBe(GAP_VAR.xl);
    });

    // The pairing `as` exists for: a real <ul>/<li> card grid, where the list
    // semantics come from the markup rather than from ARIA stand-ins. Also
    // pins that GridItem's colSpan still lands on a non-div grid item.
    test("as=ul with GridItem as=li keeps both the list semantics and the span", async () => {
      const screen = await render(
        <Grid as="ul" columns={3} aria-label="cards" data-testid="g">
          <GridItem as="li" colSpan={2} data-testid="i">
            a
          </GridItem>
        </Grid>,
      );
      const list = screen.getByRole("list", { name: "cards" }).element() as HTMLElement;
      expect(list.tagName.toLowerCase()).toBe("ul");
      // The item needs NO `role="listitem"` of its own: <li>'s implicit role is
      // listitem whenever its parent is a <ul>/<ol>/<menu>, which it literally
      // is here. (The `role="list"`-on-a-<div>` spelling this replaces DID have
      // to mark its children — a <div> has no implicit listitem role. That
      // asymmetry is why the two shapes look different in the stories.)
      // Querying by role rather than by tag is what makes this an assertion
      // about the accessibility tree instead of about the markup.
      const item = screen.getByRole("listitem").element() as HTMLElement;
      expect(item.tagName.toLowerCase()).toBe("li");
      expect(item.hasAttribute("role")).toBe(false);
      expect(item.getAttribute("data-testid")).toBe("i");
      // `grid-column: span N` computes to `grid-column-start: span N` — see
      // GridItem.test.tsx's readSpan() for the full note on the serialisation.
      expect(getComputedStyle(item).gridColumnStart.trim()).toBe("span 2");
    });

    // base.css's reset computes `list-style-type: none` on <ul>/<ol>/<menu>,
    // which drops the list semantic from Safari's a11y tree. `List` already
    // stamps `role="list"` to restore it; `as="ul"` reaches the same element,
    // so Grid does too — see utils/listSemantics.ts.
    test.for([{ tag: "ul" }, { tag: "ol" }, { tag: "menu" }] as const)(
      "as=$tag stamps role=list so Safari still announces the list semantic",
      async ({ tag }) => {
        const screen = await render(
          <Grid as={tag} data-testid="g">
            <li>a</li>
          </Grid>,
        );
        expect(screen.getByTestId("g").element().getAttribute("role")).toBe("list");
      },
    );

    test("as=ul with a caller-supplied role keeps the caller's role", async () => {
      const screen = await render(
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- exercises the role override on top of the `as="ul"` list default.
        <Grid as="ul" role="menu" data-testid="g">
          <li role="menuitem">a</li>
        </Grid>,
      );
      expect(screen.getByTestId("g").element().getAttribute("role")).toBe("menu");
    });

    test("as=section stamps no role (the list default is scoped to <ul>/<ol>/<menu>)", async () => {
      const screen = await render(
        <Grid as="section" data-testid="g">
          a
        </Grid>,
      );
      expect(screen.getByTestId("g").element().getAttribute("role")).toBeNull();
    });
  });

  describe("class composition", () => {
    test("applies the base ps1ui-grid class", async () => {
      const screen = await render(<Grid data-testid="g">x</Grid>);
      const el = screen.getByTestId("g").element();
      expect(el.classList.contains("ps1ui-grid")).toBe(true);
    });

    test("does not emit legacy BEM modifier classes (gap handled via CSS variables now)", async () => {
      // The old `ps1ui-grid--gap-*` modifier classes were replaced by inline
      // CSS variables that cascade through @container queries. Locking in
      // that BEM classes are gone — catches an accidental partial revert.
      const screen = await render(
        <Grid gap="xl" data-testid="g">
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element();
      for (const cls of Array.from(el.classList)) {
        expect(cls).not.toMatch(/^ps1ui-grid--gap-/);
      }
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <Grid className="extra other" data-testid="g">
          x
        </Grid>,
      );
      const el = screen.getByTestId("g");
      await expect.element(el).toHaveClass("ps1ui-grid");
      await expect.element(el).toHaveClass("extra");
      await expect.element(el).toHaveClass("other");
    });
  });

  describe("containment context", () => {
    // A single 30px cell in a single column with gap="none" pins the Grid's
    // max-content inline size at exactly 30px — a number a collapsed
    // (contained) Grid can never produce.
    const CONTENT_WIDTH = 30;
    const contentCell = <span style={{ display: "block", width: 30, height: 10 }} />;

    test("is not a query container by default", async () => {
      const screen = await render(<Grid data-testid="g">x</Grid>);
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.classList.contains("ps1ui-grid--query-container")).toBe(false);
      expect(getComputedStyle(el).containerType).toBe("normal");
    });

    test("queryContainer establishes an inline-size context named `ps1ui-grid`", async () => {
      const screen = await render(
        <Grid queryContainer data-testid="g">
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.classList.contains("ps1ui-grid--query-container")).toBe(true);
      expect(getComputedStyle(el).containerType).toBe("inline-size");
      expect(getComputedStyle(el).containerName).toBe("ps1ui-grid");
    });

    // The regression the opt-in default exists for: `container-type:
    // inline-size` implies `contain: inline-size`, which resolves intrinsic
    // inline size as 0, so a row-flex child with `flex-basis: auto` collapses.
    // The cross-axis `align-self: stretch` defense cannot reach the main axis
    // — hence a bare Grid must not be a query container.
    test("keeps its content width as a row-flex child", async () => {
      const screen = await render(
        <div style={{ display: "flex", flexDirection: "row", width: 500 }}>
          <Grid columns={1} gap="none" data-testid="g">
            {contentCell}
          </Grid>
        </div>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.getBoundingClientRect().width).toBe(CONTENT_WIDTH);
    });

    // The documented cost of opting in, pinned so it stays a conscious trade.
    test("queryContainer forfeits intrinsic width as a row-flex child", async () => {
      const screen = await render(
        <div style={{ display: "flex", flexDirection: "row", width: 500 }}>
          <Grid queryContainer columns={1} gap="none" data-testid="g">
            {contentCell}
          </Grid>
        </div>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.getBoundingClientRect().width).toBe(0);
    });

    // The cross-axis defense in components.css is scoped to the modifier, so
    // a default Grid sizes like any other flex item.
    test("shrink-wraps in a shrink-wrap flex parent by default", async () => {
      const screen = await render(
        <div
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: 500 }}
        >
          <Grid columns={1} gap="none" data-testid="g">
            {contentCell}
          </Grid>
        </div>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(getComputedStyle(el).alignSelf).toBe("auto");
      expect(el.getBoundingClientRect().width).toBe(CONTENT_WIDTH);
    });

    // …and once opted in, the shared `.ps1ui-*--query-container` rule in
    // components.css keeps it filling the parent's cross axis.
    test("queryContainer resists cross-axis collapse via align-self: stretch", async () => {
      const screen = await render(
        <div
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: 500 }}
        >
          <Grid queryContainer data-testid="g">
            <span>x</span>
          </Grid>
        </div>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(getComputedStyle(el).alignSelf).toBe("stretch");
      expect(el.getBoundingClientRect().width).toBe(500);
    });

    // Behavioral proof that the prop redirects the query surface: a 400px
    // Grid inside a 1200px query context. `columns={{ base: 1, md: 3 }}` on
    // the INNER Grid resolves to 3 columns against the 1200px ancestor and to
    // 1 column against the opted-in 400px Grid.
    describe("redirects descendants' @container queries when opted in", () => {
      const tree = (queryContainer: boolean) => (
        <div style={{ containerType: "inline-size", width: 1200 } as CSSProperties}>
          <Grid queryContainer={queryContainer} style={{ width: 400 }} data-testid="outer">
            <Grid columns={{ base: 1, md: 3 }} data-testid="inner">
              x
            </Grid>
          </Grid>
        </div>
      );

      test("default → inner resolves against the outer 1200px context", async () => {
        const screen = await render(tree(false));
        const inner = screen.getByTestId("inner").element() as HTMLDivElement;
        const tracks = getComputedStyle(inner)
          .gridTemplateColumns.trim()
          .split(/\s+/)
          .filter(Boolean);
        expect(tracks).toHaveLength(3);
      });

      test("queryContainer → inner resolves against the 400px Grid", async () => {
        const screen = await render(tree(true));
        const inner = screen.getByTestId("inner").element() as HTMLDivElement;
        const tracks = getComputedStyle(inner)
          .gridTemplateColumns.trim()
          .split(/\s+/)
          .filter(Boolean);
        expect(tracks).toHaveLength(1);
      });
    });
  });

  describe("inline style CSS variables", () => {
    test("no columns/gap props → no --_grid-* variables are emitted", async () => {
      const screen = await render(<Grid data-testid="g">x</Grid>);
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      const styleAttr = el.getAttribute("style") ?? "";
      expect(styleAttr).not.toMatch(/--_grid-columns-/);
      expect(styleAttr).not.toMatch(/--_grid-gap-/);
    });

    test.for(COLUMN_COUNTS.map((columns) => ({ columns })))(
      "columns=$columns scalar → --_grid-columns-base = $columns",
      async ({ columns }) => {
        const screen = await render(
          <Grid columns={columns} data-testid="g">
            x
          </Grid>,
        );
        const el = screen.getByTestId("g").element() as HTMLDivElement;
        expect(el.style.getPropertyValue("--_grid-columns-base")).toBe(String(columns));
        for (const bp of BREAKPOINTS_NON_BASE) {
          expect(el.style.getPropertyValue(`--_grid-columns-${bp}`)).toBe("");
        }
      },
    );

    test.for(GAPS.map((gap) => ({ gap })))(
      "gap=$gap scalar → --_grid-gap-base is emitted",
      async ({ gap }) => {
        const screen = await render(
          <Grid gap={gap} data-testid="g">
            x
          </Grid>,
        );
        const el = screen.getByTestId("g").element() as HTMLDivElement;
        expect(el.style.getPropertyValue("--_grid-gap-base")).toBe(GAP_VAR[gap]);
        for (const bp of BREAKPOINTS_NON_BASE) {
          expect(el.style.getPropertyValue(`--_grid-gap-${bp}`)).toBe("");
        }
      },
    );

    test("columns responsive object emits one variable per specified breakpoint", async () => {
      const screen = await render(
        <Grid columns={{ base: 1, md: 3 }} data-testid="g">
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_grid-columns-base")).toBe("1");
      expect(el.style.getPropertyValue("--_grid-columns-md")).toBe("3");
      expect(el.style.getPropertyValue("--_grid-columns-sm")).toBe("");
      expect(el.style.getPropertyValue("--_grid-columns-lg")).toBe("");
      expect(el.style.getPropertyValue("--_grid-columns-xl")).toBe("");
    });

    test("gap responsive object emits one variable per specified breakpoint", async () => {
      const screen = await render(
        <Grid gap={{ base: "sm", md: "2xl" }} data-testid="g">
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_grid-gap-base")).toBe(GAP_VAR.sm);
      expect(el.style.getPropertyValue("--_grid-gap-md")).toBe(GAP_VAR["2xl"]);
      expect(el.style.getPropertyValue("--_grid-gap-sm")).toBe("");
      expect(el.style.getPropertyValue("--_grid-gap-lg")).toBe("");
      expect(el.style.getPropertyValue("--_grid-gap-xl")).toBe("");
    });

    test("full 5-breakpoint columns object emits all five variables", async () => {
      const screen = await render(
        <Grid columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 6 }} data-testid="g">
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_grid-columns-base")).toBe("1");
      expect(el.style.getPropertyValue("--_grid-columns-sm")).toBe("2");
      expect(el.style.getPropertyValue("--_grid-columns-md")).toBe("3");
      expect(el.style.getPropertyValue("--_grid-columns-lg")).toBe("4");
      expect(el.style.getPropertyValue("--_grid-columns-xl")).toBe("6");
    });

    test("object without base entry emits only the specified breakpoints", async () => {
      // The CSS's base fallback (1 column, --ps1ui-space-md gap) then
      // supplies the effective value at the `base` breakpoint. Verified
      // via computed-style tests below.
      const screen = await render(
        <Grid columns={{ md: 3 }} data-testid="g">
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_grid-columns-base")).toBe("");
      expect(el.style.getPropertyValue("--_grid-columns-md")).toBe("3");
    });

    test("clamp is applied to every breakpoint entry, not just the base", async () => {
      // Invalid values in any position of the responsive object must be
      // clamped to 1. Without a per-breakpoint clamp, a caller writing
      // `columns={{ md: Number(bad) }}` would silently produce
      // `repeat(NaN, ...)` at the md breakpoint and drop the whole
      // declaration.
      const screen = await render(
        <Grid
          columns={{
            base: 0,
            sm: Number.NaN,
            md: Number.POSITIVE_INFINITY,
            lg: -3,
            xl: 3.9,
          }}
          data-testid="g"
        >
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_grid-columns-base")).toBe("1");
      expect(el.style.getPropertyValue("--_grid-columns-sm")).toBe("1");
      expect(el.style.getPropertyValue("--_grid-columns-md")).toBe("1");
      expect(el.style.getPropertyValue("--_grid-columns-lg")).toBe("1");
      // 3.9 → floor → 3 (positive integer clamp, not the ≥ 1 clamp)
      expect(el.style.getPropertyValue("--_grid-columns-xl")).toBe("3");
    });

    test("combines columns and gap responsive objects into one merged style", async () => {
      const screen = await render(
        <Grid columns={{ base: 1, md: 3 }} gap={{ base: "sm", md: "xl" }} data-testid="g">
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_grid-columns-base")).toBe("1");
      expect(el.style.getPropertyValue("--_grid-columns-md")).toBe("3");
      expect(el.style.getPropertyValue("--_grid-gap-base")).toBe(GAP_VAR.sm);
      expect(el.style.getPropertyValue("--_grid-gap-md")).toBe(GAP_VAR.xl);
    });

    test("caller-supplied style is preserved alongside responsive vars", async () => {
      const screen = await render(
        <Grid columns={3} gap="lg" style={{ background: "red" }} data-testid="g">
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.style.background).toContain("red");
      expect(el.style.getPropertyValue("--_grid-columns-base")).toBe("3");
      expect(el.style.getPropertyValue("--_grid-gap-base")).toBe(GAP_VAR.lg);
    });

    test("caller-supplied --_grid-columns-base in style is overridden by the columns prop", async () => {
      // The intent: `columns` prop is the source of truth. A caller who
      // stamps the var themselves via `style` should not win over an
      // explicit `columns={n}`. Object-spread order in Grid.tsx makes the
      // internal stamp last, so it wins — this test locks that in.
      const screen = await render(
        <Grid columns={4} data-testid="g" style={{ "--_grid-columns-base": 99 } as CSSProperties}>
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_grid-columns-base")).toBe("4");
    });
  });

  describe("computed styles: scalar (no responsive)", () => {
    test("base sets display: grid", async () => {
      const screen = await render(<Grid data-testid="g">x</Grid>);
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(getComputedStyle(el).display).toBe("grid");
    });

    test("no props → default 1 column and md (12px) gap", async () => {
      const screen = await render(
        <Grid data-testid="g" style={{ width: 300 }}>
          <div>x</div>
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      const cs = getComputedStyle(el);
      const tracks = cs.gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
      expect(tracks).toHaveLength(1);
      expect(cs.rowGap).toBe("12px");
      expect(cs.columnGap).toBe("12px");
    });

    test.for(COLUMN_COUNTS.map((columns) => ({ columns })))(
      "columns=$columns resolves grid-template-columns to $columns tracks",
      async ({ columns }) => {
        const screen = await render(
          <Grid columns={columns} data-testid="g" style={{ width: 600 }}>
            {Array.from({ length: columns }, (_, i) => (
              <div key={i} data-testid={`cell-${i}`}>
                {i}
              </div>
            ))}
          </Grid>,
        );
        const el = screen.getByTestId("g").element() as HTMLDivElement;
        // Behavioural: the resolved grid-template-columns must expand to
        // exactly `columns` tracks. getComputedStyle returns a space-
        // separated list of resolved track sizes.
        const gtc = getComputedStyle(el).gridTemplateColumns;
        const tracks = gtc.trim().split(/\s+/).filter(Boolean);
        expect(tracks).toHaveLength(columns);
      },
    );

    // Invalid scalar inputs must clamp to 1, not stamp through and produce
    // an invalid CSS `repeat(0, ...)` / `repeat(-1, ...)` / `repeat(1.5, ...)`
    // that browsers drop entirely (silently collapsing the grid to
    // auto-flow). Covers dynamic callers like `columns={items.length}`
    // on an empty list.
    test.for([
      { input: 0, expected: 1 },
      { input: -3, expected: 1 },
      { input: 1.5, expected: 1 },
      { input: 3.9, expected: 3 },
      { input: Number.NaN, expected: 1 },
      { input: Number.POSITIVE_INFINITY, expected: 1 },
      { input: Number.NEGATIVE_INFINITY, expected: 1 },
    ])(
      "columns=$input scalar is clamped to a positive integer ($expected)",
      async ({ input, expected }) => {
        const screen = await render(
          <Grid columns={input} data-testid="g" style={{ width: 300 }}>
            <div>x</div>
          </Grid>,
        );
        const el = screen.getByTestId("g").element() as HTMLDivElement;
        expect(el.style.getPropertyValue("--_grid-columns-base")).toBe(String(expected));
        const tracks = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
        expect(tracks).toHaveLength(expected);
      },
    );

    test.for(GAPS.map((gap) => ({ gap, expected: GAP_PX[gap] })))(
      "gap=$gap scalar → row-gap and column-gap resolve to $expected",
      async ({ gap, expected }) => {
        const screen = await render(
          <Grid gap={gap} data-testid="g">
            x
          </Grid>,
        );
        const el = screen.getByTestId("g").element() as HTMLDivElement;
        const cs = getComputedStyle(el);
        expect(cs.rowGap).toBe(expected);
        expect(cs.columnGap).toBe(expected);
      },
    );
  });

  describe("computed styles: responsive (via @container queries)", () => {
    // Widths chosen to land ONE per breakpoint band; see Container.test for
    // the reasoning. Values are just-inside their band so intent is clear.
    type Band = { name: string; width: number; effectiveBreakpoint: Breakpoint };
    const BANDS: readonly Band[] = [
      { name: "below sm (base only)", width: 400, effectiveBreakpoint: "base" },
      { name: "sm band", width: 700, effectiveBreakpoint: "sm" },
      { name: "md band", width: 900, effectiveBreakpoint: "md" },
      { name: "lg band", width: 1200, effectiveBreakpoint: "lg" },
      { name: "xl band", width: 1400, effectiveBreakpoint: "xl" },
    ];

    // Full 5-breakpoint columns object; every band has a distinct column
    // count so we can unambiguously verify which breakpoint's value won.
    const FULL_COLUMNS = {
      base: 1,
      sm: 2,
      md: 3,
      lg: 4,
      xl: 6,
    } as const satisfies Record<Breakpoint, number>;

    // Full 5-breakpoint gap object; each entry distinct.
    const FULL_GAP = {
      base: "none",
      sm: "xs",
      md: "sm",
      lg: "lg",
      xl: "2xl",
    } as const satisfies Record<Breakpoint, GridGap>;

    test.for(BANDS)(
      "columns={full object} in $name ($width px) → grid-template-columns has $effectiveBreakpoint's tracks",
      async ({ width, effectiveBreakpoint }) => {
        const screen = await renderInContainerAtWidth(
          width,
          <Grid columns={FULL_COLUMNS} data-testid="g">
            x
          </Grid>,
        );
        const el = screen.getByTestId("g").element() as HTMLDivElement;
        const expected = FULL_COLUMNS[effectiveBreakpoint];
        const tracks = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
        expect(tracks).toHaveLength(expected);
      },
    );

    test.for(BANDS)(
      "gap={full object} in $name ($width px) → gap resolves to $effectiveBreakpoint's px value",
      async ({ width, effectiveBreakpoint }) => {
        const screen = await renderInContainerAtWidth(
          width,
          <Grid gap={FULL_GAP} data-testid="g">
            x
          </Grid>,
        );
        const el = screen.getByTestId("g").element() as HTMLDivElement;
        const expectedGap = GAP_PX[FULL_GAP[effectiveBreakpoint]];
        const cs = getComputedStyle(el);
        expect(cs.rowGap).toBe(expectedGap);
        expect(cs.columnGap).toBe(expectedGap);
      },
    );

    test("cascade fallback: columns={base:1, md:3} in sm band → base (1) survives", async () => {
      // At 700px, only sm breakpoint has fired. Since --_grid-columns-sm
      // is unset, --_columns-sm falls back to --_columns-base = 1.
      const screen = await renderInContainerAtWidth(
        700,
        <Grid columns={{ base: 1, md: 3 }} data-testid="g">
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      const tracks = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
      expect(tracks).toHaveLength(1);
    });

    test("cascade fallback: columns={base:1, md:3} above md → md (3) wins for all wider breakpoints", async () => {
      const screen = await renderInContainerAtWidth(
        1400,
        <Grid columns={{ base: 1, md: 3 }} data-testid="g">
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      const tracks = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
      expect(tracks).toHaveLength(3);
    });

    test("cascade fallback: object without base → CSS default (1 column) at base breakpoint", async () => {
      const screen = await renderInContainerAtWidth(
        400,
        <Grid columns={{ md: 3 }} data-testid="g">
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      const tracks = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
      expect(tracks).toHaveLength(1);
    });

    test("cascade fallback: object without base → md override kicks in at md band", async () => {
      const screen = await renderInContainerAtWidth(
        900,
        <Grid columns={{ md: 3 }} data-testid="g">
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      const tracks = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
      expect(tracks).toHaveLength(3);
    });

    test("no responsive props inside a wide container → CSS defaults still apply", async () => {
      const screen = await renderInContainerAtWidth(1400, <Grid data-testid="g">x</Grid>);
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      const cs = getComputedStyle(el);
      const tracks = cs.gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
      expect(tracks).toHaveLength(1);
      expect(cs.rowGap).toBe("12px");
    });
  });

  // Regression net for the responsive-prop cascade leak — see Stack.test.tsx's
  // "nested Stack does not inherit outer's per-breakpoint input vars" describe
  // for the fullest account and Grid.css's @property block for the fix.
  describe("nested Grid does not inherit outer's per-breakpoint input vars", () => {
    const BREAKPOINT_WIDTHS = { sm: 700, md: 900, lg: 1200, xl: 1400 } as const;

    type GridLeakAxis = keyof typeof GRID_LEAK_TABLE;
    type GridLeakCase = {
      outerFor: (
        bp: Exclude<Breakpoint, "base">,
      ) => Partial<Omit<GridProps, "children" | "ref" | "as">>;
      inner: Partial<Omit<GridProps, "children" | "ref" | "as">>;
      computed: (cs: CSSStyleDeclaration) => string;
      expected: string;
    };

    const GRID_LEAK_TABLE = {
      columns: {
        outerFor: (bp) => ({ columns: { base: 2, [bp]: 8 } }),
        inner: { columns: 2 },
        computed: (cs) => String(cs.gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length),
        expected: "2",
      },
      gap: {
        outerFor: (bp) => ({ gap: { base: "sm", [bp]: "2xl" } }),
        inner: { gap: "sm" },
        computed: (cs) => cs.rowGap,
        expected: "8px",
      },
    } as const satisfies Record<"columns" | "gap", GridLeakCase>;

    const CASES = (Object.keys(GRID_LEAK_TABLE) as GridLeakAxis[]).flatMap((axis) =>
      BREAKPOINTS_NON_BASE.map((bp) => ({
        axis,
        bp,
        width: BREAKPOINT_WIDTHS[bp],
        ...GRID_LEAK_TABLE[axis],
      })),
    );

    test.for(CASES)(
      "outer $axis leak at $bp does not reach inner",
      async ({ outerFor, inner, computed, expected, bp, width }) => {
        const screen = await render(
          <div style={{ containerType: "inline-size", width } as CSSProperties}>
            <Grid {...outerFor(bp)} data-testid="outer">
              <Grid {...inner} data-testid="inner">
                x
              </Grid>
            </Grid>
          </div>,
        );
        const innerEl = screen.getByTestId("inner").element() as HTMLDivElement;
        expect(computed(getComputedStyle(innerEl))).toBe(expected);
      },
    );
  });

  describe("nested Grid responds to an opted-in outer Grid's width", () => {
    test("inner Grid inside a 900px-wide `queryContainer` outer Grid → responds to outer's inline-size", async () => {
      const screen = await render(
        <div style={{ width: 900 }}>
          <Grid queryContainer data-testid="outer">
            <Grid columns={{ base: 1, sm: 2, md: 4 }} data-testid="inner">
              x
            </Grid>
          </Grid>
        </div>,
      );
      const inner = screen.getByTestId("inner").element() as HTMLDivElement;
      // Outer Grid is 900px inline-size → matches sm (>= 40rem = 640px)
      // AND md (>= 48rem = 768px). Highest match is md → 4 columns.
      const tracks = getComputedStyle(inner)
        .gridTemplateColumns.trim()
        .split(/\s+/)
        .filter(Boolean);
      expect(tracks).toHaveLength(4);
    });
  });

  // Independent of containment, and load-bearing on its own: a flex item's
  // automatic minimum size is its content's min-content width, and CodeBlock is
  // `white-space: pre` — so its min-content width is the longest unwrapped
  // source line. Without the shared `min-width: 0` base rule in components.css
  // the Grid refuses to shrink and bursts the row open (measured at 3498px
  // inside a 300px parent), sending the whole document into horizontal scroll
  // instead of letting CodeBlock's own `overflow-x: auto` take over.
  describe("nested overflow-scroll surfaces", () => {
    test("lets a nested CodeBlock shrink inside a narrow row-flex parent", async () => {
      const screen = await render(
        <div style={{ display: "flex", flexDirection: "row", width: 300 }}>
          <Grid data-testid="g">
            <CodeBlock language="tsx" code={`const x = ${"a".repeat(400)};`} />
          </Grid>
        </div>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.getBoundingClientRect().width).toBeLessThanOrEqual(300);
    });
  });

  describe("passthrough", () => {
    test("forwards native <div> attributes (id, role, aria-label, data-*)", async () => {
      const screen = await render(
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- exercises Grid's role passthrough; `as="ul"` is the preferred spelling for a real list.
        <Grid id="cards" role="list" aria-label="cards" data-testid="g">
          {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- children must be listitems to satisfy WAI-ARIA's list → listitem parent rule; only relevant here because Grid's role passthrough is being exercised. */}
          <div role="listitem">a</div>
          {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- see comment above. */}
          <div role="listitem">b</div>
        </Grid>,
      );
      const el = screen.getByTestId("g");
      await expect.element(el).toHaveAttribute("id", "cards");
      await expect.element(el).toHaveAttribute("role", "list");
      await expect.element(el).toHaveAttribute("aria-label", "cards");
    });

    test("forwards a ref to the underlying <div>", async () => {
      let captured: HTMLDivElement | null = null;
      const setRef = (node: HTMLDivElement | null) => {
        captured = node;
      };
      await render(
        <Grid ref={setRef} data-testid="g">
          x
        </Grid>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLDivElement).tagName.toLowerCase()).toBe("div");
    });

    // `as` moves the ref target along with the tag — `createElement` receives
    // `ref` as an ordinary prop under React 19's ref-as-prop, so there is no
    // forwardRef hop to lose it. The type side of this (a ref typed for the
    // wrong element is rejected) lives in src/polymorphic.test-d.tsx.
    test("forwards a ref to the element `as` resolved to", async () => {
      let captured: HTMLUListElement | null = null;
      const setRef = (node: HTMLUListElement | null) => {
        captured = node;
      };
      await render(
        <Grid as="ul" ref={setRef} data-testid="g">
          <li>x</li>
        </Grid>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLUListElement).tagName.toLowerCase()).toBe("ul");
    });

    test("forwards native attributes onto the element `as` resolved to", async () => {
      const screen = await render(
        <Grid as="ol" start={3} data-testid="g">
          <li>x</li>
        </Grid>,
      );
      const el = screen.getByTestId("g");
      await expect.element(el).toHaveAttribute("start", "3");
    });
  });

  describe("a11y", () => {
    type A11yCase = { name: string; node: () => ReactElement };

    const cases: A11yCase[] = [
      {
        name: "2-column grid of body text",
        node: () => (
          <Grid columns={2}>
            <Text>left</Text>
            <Text>right</Text>
          </Grid>
        ),
      },
      {
        name: "3-column grid of body text with lg gap",
        node: () => (
          <Grid columns={3} gap="lg">
            <Text>a</Text>
            <Text>b</Text>
            <Text>c</Text>
          </Grid>
        ),
      },
      {
        name: "responsive columns and gap",
        node: () => (
          <Grid columns={{ base: 1, md: 3 }} gap={{ base: "sm", md: "lg" }}>
            <Text>a</Text>
            <Text>b</Text>
            <Text>c</Text>
          </Grid>
        ),
      },
      {
        name: "as a native labelled <ul> of <li> cards",
        node: () => (
          <Grid as="ul" columns={3} aria-label="cards">
            <GridItem as="li">
              <Text>one</Text>
            </GridItem>
            <GridItem as="li">
              <Text>two</Text>
            </GridItem>
            <GridItem as="li" colSpan={2}>
              <Text>three</Text>
            </GridItem>
          </Grid>
        ),
      },
      {
        name: "as a labelled list of items via role passthrough",
        node: () => (
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- keeps the ARIA stand-in path covered; `as="ul"` (the case above) is the preferred spelling since Grid became polymorphic.
          <Grid columns={3} role="list" aria-label="cards">
            {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- child role must be listitem to keep the WAI-ARIA list→listitem parent-child requirement axe checks. */}
            <div role="listitem">
              <Text>one</Text>
            </div>
            {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- see comment above. */}
            <div role="listitem">
              <Text>two</Text>
            </div>
            {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- see comment above. */}
            <div role="listitem">
              <Text>three</Text>
            </div>
          </Grid>
        ),
      },
    ];

    test.for(cases)("$name → no axe violations", async ({ node }) => {
      const screen = await render(node());
      await expectNoAxeViolations(screen.container);
    });
  });
});
