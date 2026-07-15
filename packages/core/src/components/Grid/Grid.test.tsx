import "../../styles/styles.css";

import type { CSSProperties, ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Text } from "../Text/Text";
import { Grid, type GridGap } from "./Grid";

const GAPS = ["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const satisfies readonly GridGap[];

// Column counts exercised in unit/behavioural tests. Chosen to cover the
// realistic range (1..12) plus 1-column (default) — a change to the
// `repeat(var(--ps1ui-grid-columns), minmax(0, 1fr))` rule breaks these.
const COLUMN_COUNTS = [1, 2, 3, 4, 6, 12] as const;

const GAP_PX = {
  none: "0px",
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
} as const satisfies Record<GridGap, string>;

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
  });

  describe("class composition", () => {
    test("applies default classes: base, gap=md", async () => {
      const screen = await render(<Grid data-testid="g">x</Grid>);
      const el = screen.getByTestId("g").element();
      expect(el.classList.contains("ps1ui-grid")).toBe(true);
      expect(el.classList.contains("ps1ui-grid--gap-md")).toBe(true);
    });

    test.for(GAPS.map((gap) => ({ gap })))(
      "gap=$gap → ps1ui-grid--gap-$gap (and no other gap-* class)",
      async ({ gap }) => {
        const screen = await render(
          <Grid gap={gap} data-testid="g">
            x
          </Grid>,
        );
        const el = screen.getByTestId("g").element();
        const gapClasses = Array.from(el.classList).filter((c) => c.startsWith("ps1ui-grid--gap-"));
        expect(gapClasses).toEqual([`ps1ui-grid--gap-${gap}`]);
      },
    );

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <Grid className="extra" data-testid="g">
          x
        </Grid>,
      );
      const el = screen.getByTestId("g");
      await expect.element(el).toHaveClass("ps1ui-grid");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("columns", () => {
    test("default columns=1 stamps --ps1ui-grid-columns=1 on the inline style", async () => {
      const screen = await render(<Grid data-testid="g">x</Grid>);
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--ps1ui-grid-columns")).toBe("1");
    });

    test.for(COLUMN_COUNTS.map((columns) => ({ columns })))(
      "columns=$columns stamps --ps1ui-grid-columns=$columns and resolves grid-template-columns to $columns tracks",
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
        // The stamped custom property.
        expect(el.style.getPropertyValue("--ps1ui-grid-columns")).toBe(String(columns));
        // Behavioural: the resolved grid-template-columns must expand to
        // exactly `columns` tracks. getComputedStyle returns a space-
        // separated list of resolved track sizes (e.g. "100px 100px 100px"
        // for 3 columns in a 300px grid). Split-and-count is more robust
        // than an exact-string compare — Firefox emits "0px" for
        // zero-content minmax tracks vs. Chromium's non-empty values on
        // sized tracks, but every engine emits exactly N tokens for N
        // tracks.
        const gtc = getComputedStyle(el).gridTemplateColumns;
        const tracks = gtc.trim().split(/\s+/).filter(Boolean);
        expect(tracks).toHaveLength(columns);
      },
    );

    // Invalid inputs must clamp to 1, not stamp through and produce an
    // invalid CSS `repeat(0, ...)` / `repeat(-1, ...)` / `repeat(1.5, ...)`
    // that browsers drop entirely (silently collapsing the grid to
    // auto-flow). Covers dynamic callers like `columns={items.length}`
    // on an empty list.
    test.for([
      { input: 0, expected: 1 },
      { input: -3, expected: 1 },
      { input: 1.5, expected: 1 },
      { input: 3.9, expected: 3 },
      // NaN / ±Infinity must also clamp — Math.max(1, NaN) is NaN and
      // Math.max(1, Infinity) is Infinity, so the pre-clamp Number.isFinite
      // gate is what actually catches these. Realistic origin: parseInt on
      // a missing config value, `Number(undefined)`, arithmetic overflow.
      { input: Number.NaN, expected: 1 },
      { input: Number.POSITIVE_INFINITY, expected: 1 },
      { input: Number.NEGATIVE_INFINITY, expected: 1 },
    ])(
      "columns=$input is clamped to a positive integer ($expected)",
      async ({ input, expected }) => {
        const screen = await render(
          <Grid columns={input} data-testid="g" style={{ width: 300 }}>
            <div>x</div>
          </Grid>,
        );
        const el = screen.getByTestId("g").element() as HTMLDivElement;
        expect(el.style.getPropertyValue("--ps1ui-grid-columns")).toBe(String(expected));
        const tracks = getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
        expect(tracks).toHaveLength(expected);
      },
    );

    test("style prop is preserved alongside the columns var (spread merge)", async () => {
      const screen = await render(
        <Grid columns={3} data-testid="g" style={{ padding: 12 }}>
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.style.padding).toContain("12px");
      expect(el.style.getPropertyValue("--ps1ui-grid-columns")).toBe("3");
    });

    test("caller-supplied --ps1ui-grid-columns in style is overridden by the columns prop", async () => {
      // The intent: `columns` prop is the source of truth. A caller who
      // stamps the var themselves via `style` should not win over an
      // explicit `columns={n}`. Object-spread order in Grid.tsx makes the
      // internal stamp last, so it wins — this test locks that in.
      const screen = await render(
        <Grid columns={4} data-testid="g" style={{ "--ps1ui-grid-columns": 99 } as CSSProperties}>
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--ps1ui-grid-columns")).toBe("4");
    });
  });

  describe("computed styles", () => {
    test("base sets display: grid", async () => {
      const screen = await render(<Grid data-testid="g">x</Grid>);
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(getComputedStyle(el).display).toBe("grid");
    });

    test.for(GAPS.map((gap) => ({ gap, expected: GAP_PX[gap] })))(
      "gap=$gap → row-gap and column-gap resolve to $expected",
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

    test("forwards and merges the style attribute with the columns var", async () => {
      const screen = await render(
        <Grid columns={2} data-testid="g" style={{ background: "red" }}>
          x
        </Grid>,
      );
      const el = screen.getByTestId("g").element() as HTMLDivElement;
      expect(el.style.background).toContain("red");
      expect(el.style.getPropertyValue("--ps1ui-grid-columns")).toBe("2");
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
