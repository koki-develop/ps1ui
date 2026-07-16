import "../../styles/styles.css";

import type { CSSProperties, ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import type { Breakpoint } from "../../utils/responsive";
import { Text } from "../Text/Text";
import { Grid, type GridGap } from "./Grid";

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
    test("establishes an inline-size containment context", async () => {
      const screen = await render(<Grid data-testid="g">x</Grid>);
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(getComputedStyle(el).containerType).toBe("inline-size");
    });

    test("names the container context `ps1ui-grid`", async () => {
      const screen = await render(<Grid data-testid="g">x</Grid>);
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(getComputedStyle(el).containerName).toBe("ps1ui-grid");
    });

    // `container-type: inline-size` implies `contain: inline-size`, which
    // treats intrinsic width as 0. Placing Grid inside a shrink-to-fit flex
    // parent (`align-items: flex-start` in a column) would otherwise collapse
    // it to width 0. The shared containment-defense rule in components.css
    // (`.ps1ui-root, .ps1ui-container, .ps1ui-grid, .ps1ui-stack`) sets
    // `align-self: stretch` (+ `justify-self`, `min-width: 0`) to keep it
    // filling the cross-axis of the parent.
    test("resists collapse via align-self: stretch in shrink-wrap flex parent", async () => {
      const screen = await render(
        <div
          data-testid="p"
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: 500 }}
        >
          <Grid data-testid="g">
            <span>x</span>
          </Grid>
        </div>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(getComputedStyle(el).alignSelf).toBe("stretch");
      expect(el.getBoundingClientRect().width).toBe(500);
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

  describe("nested Grid responds to outer Grid width", () => {
    test("inner Grid inside a 900px-wide outer Grid → responds to outer's inline-size", async () => {
      const screen = await render(
        <div style={{ width: 900 }}>
          <Grid data-testid="outer">
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

  describe("passthrough", () => {
    test("forwards native <div> attributes (id, role, aria-label, data-*)", async () => {
      const screen = await render(
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- exercises Grid's role passthrough; Grid is intentionally a bare <div>.
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
        name: "as a labelled list of items",
        node: () => (
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- documents the labelled-list pattern; Grid is intentionally a bare <div>.
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
