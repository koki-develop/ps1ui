import "../../styles/styles.css";

import type { CSSProperties, ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import type { Breakpoint } from "../../utils/responsive";
import { Grid } from "../Grid/Grid";
import { Text } from "../Text/Text";
import { GridItem } from "./GridItem";

// Column-span counts exercised in unit/behavioural tests. Chosen to cover the
// realistic range plus 1-span (default) — a change to the
// `grid-column: span var(--_col-span)` rule breaks these.
const COL_SPANS = [1, 2, 3, 4, 6, 12] as const;

const BREAKPOINTS_NON_BASE = ["sm", "md", "lg", "xl"] as const satisfies readonly Exclude<
  Breakpoint,
  "base"
>[];

// Renders a UI tree inside a fixed-width `container-type: inline-size` wrapper
// so GridItem's `@container` queries match against the wrapper. GridItem is a
// leaf (no container-type of its own), so it queries the nearest ancestor
// containment context — this wrapper stands in for a real Grid parent in
// isolation tests that only care about the resolved var / span value.
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

// Reads `grid-column-start` from computed style and returns just the span
// count as a string ("3"). `grid-column: span N` computes to
// `grid-column-start: span N` + `grid-column-end: auto`. Cross-engine the
// serialised form of gridColumnStart is stable at "span N".
function readSpan(el: HTMLElement): string {
  const start = getComputedStyle(el).gridColumnStart.trim();
  const m = start.match(/^span\s+(\d+)$/);
  if (!m) throw new Error(`unexpected grid-column-start: ${start}`);
  return m[1] as string;
}

describe("GridItem", () => {
  describe("rendering", () => {
    test("renders a <div> with the given children", async () => {
      const screen = await render(
        <GridItem data-testid="gi">
          <span>a</span>
          <span>b</span>
        </GridItem>,
      );
      const el = screen.getByTestId("gi").element();
      expect(el.tagName.toLowerCase()).toBe("div");
      expect(el.textContent).toContain("a");
      expect(el.textContent).toContain("b");
    });

    test("has no default role (leaves semantics to the caller)", async () => {
      const screen = await render(<GridItem data-testid="gi">x</GridItem>);
      const el = screen.getByTestId("gi").element();
      expect(el.getAttribute("role")).toBeNull();
    });
  });

  describe("class composition", () => {
    test("applies the base ps1ui-griditem class", async () => {
      const screen = await render(<GridItem data-testid="gi">x</GridItem>);
      const el = screen.getByTestId("gi").element();
      expect(el.classList.contains("ps1ui-griditem")).toBe(true);
    });

    test("does not emit legacy BEM modifier classes (colSpan handled via CSS variables)", async () => {
      // Locks in the invariant: colSpan is expressed only through the
      // inline `--_griditem-col-span-*` custom properties, never through
      // BEM modifier classes. A future refactor that reintroduces a class
      // like `ps1ui-griditem--col-span-2` would defeat the responsive
      // cascade — this test catches it.
      const screen = await render(
        <GridItem colSpan={4} data-testid="gi">
          x
        </GridItem>,
      );
      const el = screen.getByTestId("gi").element();
      for (const cls of Array.from(el.classList)) {
        expect(cls).not.toMatch(/^ps1ui-griditem--col-span-/);
      }
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <GridItem className="extra other" data-testid="gi">
          x
        </GridItem>,
      );
      const el = screen.getByTestId("gi");
      await expect.element(el).toHaveClass("ps1ui-griditem");
      await expect.element(el).toHaveClass("extra");
      await expect.element(el).toHaveClass("other");
    });
  });

  describe("GridItem does NOT establish its own containment context (leaf component)", () => {
    test("container-type is not `inline-size` — GridItem is not a container query ancestor", async () => {
      // Establishing containment on a grid child would be wasteful (extra
      // layout containment, extra query surface for descendants) and would
      // shift the effective @container query surface for anything nested
      // inside GridItem away from the outer Grid. Locked in so an
      // accidental copy from a layout primitive doesn't silently add
      // containment here.
      const screen = await render(<GridItem data-testid="gi">x</GridItem>);
      const el = screen.getByTestId("gi").element() as HTMLDivElement;
      expect(getComputedStyle(el).containerType).not.toBe("inline-size");
    });
  });

  describe("inline style CSS variables", () => {
    test("no colSpan prop → no --_grid-item-* variables are emitted", async () => {
      const screen = await render(<GridItem data-testid="gi">x</GridItem>);
      const el = screen.getByTestId("gi").element() as HTMLDivElement;
      const styleAttr = el.getAttribute("style") ?? "";
      expect(styleAttr).not.toMatch(/--_griditem-col-span-/);
    });

    test.for(COL_SPANS.map((colSpan) => ({ colSpan })))(
      "colSpan=$colSpan scalar → --_griditem-col-span-base = $colSpan",
      async ({ colSpan }) => {
        const screen = await render(
          <GridItem colSpan={colSpan} data-testid="gi">
            x
          </GridItem>,
        );
        const el = screen.getByTestId("gi").element() as HTMLDivElement;
        expect(el.style.getPropertyValue("--_griditem-col-span-base")).toBe(String(colSpan));
        for (const bp of BREAKPOINTS_NON_BASE) {
          expect(el.style.getPropertyValue(`--_griditem-col-span-${bp}`)).toBe("");
        }
      },
    );

    test("responsive object emits one variable per specified breakpoint", async () => {
      const screen = await render(
        <GridItem colSpan={{ base: 1, md: 3 }} data-testid="gi">
          x
        </GridItem>,
      );
      const el = screen.getByTestId("gi").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_griditem-col-span-base")).toBe("1");
      expect(el.style.getPropertyValue("--_griditem-col-span-md")).toBe("3");
      expect(el.style.getPropertyValue("--_griditem-col-span-sm")).toBe("");
      expect(el.style.getPropertyValue("--_griditem-col-span-lg")).toBe("");
      expect(el.style.getPropertyValue("--_griditem-col-span-xl")).toBe("");
    });

    test("full 5-breakpoint object emits all five variables", async () => {
      const screen = await render(
        <GridItem colSpan={{ base: 1, sm: 2, md: 3, lg: 4, xl: 6 }} data-testid="gi">
          x
        </GridItem>,
      );
      const el = screen.getByTestId("gi").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_griditem-col-span-base")).toBe("1");
      expect(el.style.getPropertyValue("--_griditem-col-span-sm")).toBe("2");
      expect(el.style.getPropertyValue("--_griditem-col-span-md")).toBe("3");
      expect(el.style.getPropertyValue("--_griditem-col-span-lg")).toBe("4");
      expect(el.style.getPropertyValue("--_griditem-col-span-xl")).toBe("6");
    });

    test("object without base entry emits only the specified breakpoints", async () => {
      // The CSS's base fallback (span 1) then supplies the effective value
      // at the `base` breakpoint. Verified via computed-style tests below.
      const screen = await render(
        <GridItem colSpan={{ md: 3 }} data-testid="gi">
          x
        </GridItem>,
      );
      const el = screen.getByTestId("gi").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_griditem-col-span-base")).toBe("");
      expect(el.style.getPropertyValue("--_griditem-col-span-md")).toBe("3");
    });

    test("clamp is applied to every breakpoint entry, not just the base", async () => {
      // Invalid values in any position of the responsive object must be
      // clamped to 1. Without a per-breakpoint clamp, a caller writing
      // `colSpan={{ md: Number(bad) }}` would silently produce
      // `grid-column: span NaN` at the md breakpoint and drop the whole
      // declaration.
      const screen = await render(
        <GridItem
          colSpan={{
            base: 0,
            sm: Number.NaN,
            md: Number.POSITIVE_INFINITY,
            lg: -3,
            xl: 3.9,
          }}
          data-testid="gi"
        >
          x
        </GridItem>,
      );
      const el = screen.getByTestId("gi").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_griditem-col-span-base")).toBe("1");
      expect(el.style.getPropertyValue("--_griditem-col-span-sm")).toBe("1");
      expect(el.style.getPropertyValue("--_griditem-col-span-md")).toBe("1");
      expect(el.style.getPropertyValue("--_griditem-col-span-lg")).toBe("1");
      // 3.9 → floor → 3 (positive integer clamp, not the ≥ 1 clamp)
      expect(el.style.getPropertyValue("--_griditem-col-span-xl")).toBe("3");
    });

    test("caller-supplied style is preserved alongside the responsive var", async () => {
      const screen = await render(
        <GridItem colSpan={3} style={{ background: "red" }} data-testid="gi">
          x
        </GridItem>,
      );
      const el = screen.getByTestId("gi").element() as HTMLDivElement;
      expect(el.style.background).toContain("red");
      expect(el.style.getPropertyValue("--_griditem-col-span-base")).toBe("3");
    });

    test("caller-supplied --_griditem-col-span-base in style is overridden by the colSpan prop", async () => {
      // The intent: `colSpan` prop is the source of truth. A caller who
      // stamps the var themselves via `style` should not win over an
      // explicit `colSpan={n}`. Object-spread order in GridItem.tsx makes
      // the internal stamp last, so it wins — this test locks that in.
      const screen = await render(
        <GridItem
          colSpan={4}
          data-testid="gi"
          style={{ "--_griditem-col-span-base": 99 } as CSSProperties}
        >
          x
        </GridItem>,
      );
      const el = screen.getByTestId("gi").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_griditem-col-span-base")).toBe("4");
    });
  });

  describe("computed styles: scalar (no responsive)", () => {
    test("no props → default grid-column: span 1", async () => {
      // A bare <GridItem> in a Grid must behave identically to a plain
      // grid child. Locking in the fallback (var(--_griditem-col-span-base, 1))
      // so removing it would break every consumer that wraps existing
      // children in GridItem expecting no layout change.
      const screen = await render(
        <Grid columns={4} data-testid="grid" style={{ width: 400 }}>
          <GridItem data-testid="gi">x</GridItem>
        </Grid>,
      );
      const el = screen.getByTestId("gi").element() as HTMLDivElement;
      expect(readSpan(el)).toBe("1");
    });

    test.for(COL_SPANS.map((colSpan) => ({ colSpan })))(
      "colSpan=$colSpan resolves grid-column to `span $colSpan`",
      async ({ colSpan }) => {
        // A wide enough Grid (12 columns) so every tested span fits inside
        // and the browser doesn't clamp against a smaller track count.
        const screen = await render(
          <Grid columns={12} data-testid="grid" style={{ width: 1200 }}>
            <GridItem colSpan={colSpan} data-testid="gi">
              x
            </GridItem>
          </Grid>,
        );
        const el = screen.getByTestId("gi").element() as HTMLDivElement;
        expect(readSpan(el)).toBe(String(colSpan));
      },
    );

    // Invalid scalar inputs must clamp to a positive integer, not stamp
    // through and produce an invalid `grid-column: span 0` /
    // `span -1` / `span 1.5` / `span NaN` that browsers drop entirely
    // (silently collapsing back to `auto` = 1 track). Covers dynamic
    // callers like `colSpan={items.length}` on an empty list.
    test.for([
      { input: 0, expected: 1 },
      { input: -3, expected: 1 },
      { input: 1.5, expected: 1 },
      { input: 3.9, expected: 3 },
      { input: Number.NaN, expected: 1 },
      { input: Number.POSITIVE_INFINITY, expected: 1 },
      { input: Number.NEGATIVE_INFINITY, expected: 1 },
    ])(
      "colSpan=$input scalar is clamped to a positive integer ($expected)",
      async ({ input, expected }) => {
        const screen = await render(
          <Grid columns={6} data-testid="grid" style={{ width: 600 }}>
            <GridItem colSpan={input} data-testid="gi">
              x
            </GridItem>
          </Grid>,
        );
        const el = screen.getByTestId("gi").element() as HTMLDivElement;
        expect(el.style.getPropertyValue("--_griditem-col-span-base")).toBe(String(expected));
        expect(readSpan(el)).toBe(String(expected));
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

    // Full 5-breakpoint colSpan object; every band has a distinct span
    // count so we can unambiguously verify which breakpoint's value won.
    const FULL_COL_SPAN = {
      base: 1,
      sm: 2,
      md: 3,
      lg: 4,
      xl: 6,
    } as const satisfies Record<Breakpoint, number>;

    test.for(BANDS)(
      "colSpan={full object} in $name ($width px) → grid-column resolves to $effectiveBreakpoint's span",
      async ({ width, effectiveBreakpoint }) => {
        const screen = await renderInContainerAtWidth(
          width,
          <GridItem colSpan={FULL_COL_SPAN} data-testid="gi">
            x
          </GridItem>,
        );
        const el = screen.getByTestId("gi").element() as HTMLDivElement;
        expect(readSpan(el)).toBe(String(FULL_COL_SPAN[effectiveBreakpoint]));
      },
    );

    test("cascade fallback: colSpan={base:1, md:3} in sm band → base (1) survives", async () => {
      // At 700px, only sm breakpoint has fired. Since
      // --_griditem-col-span-sm is unset, --_col-span-sm falls back to
      // --_col-span-base = 1.
      const screen = await renderInContainerAtWidth(
        700,
        <GridItem colSpan={{ base: 1, md: 3 }} data-testid="gi">
          x
        </GridItem>,
      );
      const el = screen.getByTestId("gi").element() as HTMLDivElement;
      expect(readSpan(el)).toBe("1");
    });

    test("cascade fallback: colSpan={base:1, md:3} above md → md (3) wins for all wider breakpoints", async () => {
      const screen = await renderInContainerAtWidth(
        1400,
        <GridItem colSpan={{ base: 1, md: 3 }} data-testid="gi">
          x
        </GridItem>,
      );
      const el = screen.getByTestId("gi").element() as HTMLDivElement;
      expect(readSpan(el)).toBe("3");
    });

    test("cascade fallback: object without base → CSS default (span 1) at base breakpoint", async () => {
      const screen = await renderInContainerAtWidth(
        400,
        <GridItem colSpan={{ md: 3 }} data-testid="gi">
          x
        </GridItem>,
      );
      const el = screen.getByTestId("gi").element() as HTMLDivElement;
      expect(readSpan(el)).toBe("1");
    });

    test("cascade fallback: object without base → md override kicks in at md band", async () => {
      const screen = await renderInContainerAtWidth(
        900,
        <GridItem colSpan={{ md: 3 }} data-testid="gi">
          x
        </GridItem>,
      );
      const el = screen.getByTestId("gi").element() as HTMLDivElement;
      expect(readSpan(el)).toBe("3");
    });

    test("no responsive props inside a wide container → CSS default (span 1) still applies", async () => {
      const screen = await renderInContainerAtWidth(1400, <GridItem data-testid="gi">x</GridItem>);
      const el = screen.getByTestId("gi").element() as HTMLDivElement;
      expect(readSpan(el)).toBe("1");
    });
  });

  describe("nested GridItem does not inherit outer's per-breakpoint input vars", () => {
    // Regression net for the responsive-prop cascade leak — see Stack.test.tsx's
    // "nested Stack does not inherit outer's per-breakpoint input vars" describe
    // for the fullest account and GridItem.css's @property block for the fix.
    // GridItem is a leaf (no container-type of its own), so BOTH outer and inner
    // GridItem query the wrapper's containerType directly. The leak still fires
    // because CSS custom property inheritance flows down the DOM chain
    // regardless of container-type. Nesting GridItem inside GridItem is a
    // legitimate pattern in real layouts (a cell that itself contains further
    // grid children), so the invariant is not academic.
    const BREAKPOINT_WIDTHS = { sm: 700, md: 900, lg: 1200, xl: 1400 } as const;

    type GridItemLeakAxis = keyof typeof GRID_ITEM_LEAK_TABLE;
    type GridItemLeakCase = {
      outerFor: (
        bp: Exclude<Breakpoint, "base">,
      ) => Partial<Omit<Parameters<typeof GridItem>[0], "children" | "ref">>;
      inner: Partial<Omit<Parameters<typeof GridItem>[0], "children" | "ref">>;
      computed: (el: HTMLElement) => string;
      expected: string;
    };

    const GRID_ITEM_LEAK_TABLE = {
      colSpan: {
        outerFor: (bp) => ({ colSpan: { base: 1, [bp]: 4 } }),
        inner: { colSpan: 1 },
        computed: readSpan,
        expected: "1",
      },
    } as const satisfies Record<"colSpan", GridItemLeakCase>;

    const CASES = (Object.keys(GRID_ITEM_LEAK_TABLE) as GridItemLeakAxis[]).flatMap((axis) =>
      BREAKPOINTS_NON_BASE.map((bp) => ({
        axis,
        bp,
        width: BREAKPOINT_WIDTHS[bp],
        ...GRID_ITEM_LEAK_TABLE[axis],
      })),
    );

    test.for(CASES)(
      "outer $axis leak at $bp does not reach inner",
      async ({ outerFor, inner, computed, expected, bp, width }) => {
        const screen = await render(
          <div style={{ containerType: "inline-size", width } as CSSProperties}>
            <GridItem {...outerFor(bp)} data-testid="outer">
              <GridItem {...inner} data-testid="inner">
                x
              </GridItem>
            </GridItem>
          </div>,
        );
        const innerEl = screen.getByTestId("inner").element() as HTMLElement;
        expect(computed(innerEl)).toBe(expected);
      },
    );
  });

  describe("GridItem inside Grid responds to Grid's inline-size", () => {
    test("GridItem inside a 900px-wide Grid → responds to Grid's @container width", async () => {
      // Grid establishes `container: ps1ui-grid / inline-size`. Its child
      // GridItem's @container queries match against Grid's width, not the
      // ancestor viewport. At 900 px, md band fires → colSpan.md wins.
      const screen = await render(
        <div style={{ width: 900 }}>
          <Grid columns={6}>
            <GridItem colSpan={{ base: 1, sm: 2, md: 4 }} data-testid="gi">
              x
            </GridItem>
          </Grid>
        </div>,
      );
      const el = screen.getByTestId("gi").element() as HTMLDivElement;
      expect(readSpan(el)).toBe("4");
    });
  });

  describe("passthrough", () => {
    test("forwards native <div> attributes (id, role, aria-label, data-*)", async () => {
      const screen = await render(
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- exercises GridItem's role passthrough; GridItem is intentionally a bare <div>.
        <GridItem id="hero" role="listitem" aria-label="hero" data-testid="gi">
          x
        </GridItem>,
      );
      const el = screen.getByTestId("gi");
      await expect.element(el).toHaveAttribute("id", "hero");
      await expect.element(el).toHaveAttribute("role", "listitem");
      await expect.element(el).toHaveAttribute("aria-label", "hero");
    });

    test("forwards a ref to the underlying <div>", async () => {
      let captured: HTMLDivElement | null = null;
      const setRef = (node: HTMLDivElement | null) => {
        captured = node;
      };
      await render(
        <GridItem ref={setRef} data-testid="gi">
          x
        </GridItem>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLDivElement).tagName.toLowerCase()).toBe("div");
    });
  });

  describe("a11y", () => {
    type A11yCase = { name: string; node: () => ReactElement };

    const cases: A11yCase[] = [
      {
        name: "2-column grid with a 2-span hero item",
        node: () => (
          <Grid columns={4}>
            <GridItem colSpan={2}>
              <Text>hero</Text>
            </GridItem>
            <GridItem>
              <Text>a</Text>
            </GridItem>
            <GridItem>
              <Text>b</Text>
            </GridItem>
          </Grid>
        ),
      },
      {
        name: "responsive colSpan on hero item",
        node: () => (
          <Grid columns={{ base: 1, md: 4 }} gap="md">
            <GridItem colSpan={{ base: 1, md: 2 }}>
              <Text>hero</Text>
            </GridItem>
            <GridItem>
              <Text>a</Text>
            </GridItem>
            <GridItem>
              <Text>b</Text>
            </GridItem>
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
