import "../../styles/styles.css";

import type { CSSProperties, ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import type { Breakpoint } from "../../utils/responsive";
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
    test("establishes an inline-size containment context", async () => {
      const screen = await render(<Stack data-testid="s">x</Stack>);
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(getComputedStyle(el).containerType).toBe("inline-size");
    });

    test("names the container context `ps1ui-stack`", async () => {
      const screen = await render(<Stack data-testid="s">x</Stack>);
      const el = screen.getByTestId("s").element() as HTMLDivElement;
      expect(getComputedStyle(el).containerName).toBe("ps1ui-stack");
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

  describe("nested Stack responds to outer Stack width", () => {
    test("inner Stack inside a 900px-wide outer → responds to outer's inline-size", async () => {
      const screen = await render(
        <div style={{ width: 900 }}>
          <Stack data-testid="outer">
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
