import "../../styles/styles.css";

import type { CSSProperties, ReactElement, ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import type { Breakpoint } from "../../utils/responsive";
import type { SpaceScale } from "../../utils/spacing";
import { Text } from "../Text/Text";
import { Container, type ContainerSize } from "./Container";

const SIZES = ["sm", "md", "lg", "xl", "full"] as const satisfies readonly ContainerSize[];
const PXS = ["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const satisfies readonly SpaceScale[];
const BREAKPOINTS_NON_BASE = ["sm", "md", "lg", "xl"] as const satisfies readonly Exclude<
  Breakpoint,
  "base"
>[];

// Expected max-width per size, mirroring the --ps1ui-container-* tokens
// (in rem in tokens.css; resolved to px by getComputedStyle at the default
// 16px root font-size). Kept as an object (not a switch) so adding a size
// to `ContainerSize` fails the `satisfies` check below until this table is
// updated too.
const MAX_WIDTH_PX = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  full: null,
} as const satisfies Record<ContainerSize, number | null>;

// Expected horizontal padding per SpaceScale value, mirroring
// `--ps1ui-space-*` in tokens.css.
const PX_VALUE = {
  none: "0px",
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
} as const satisfies Record<SpaceScale, string>;

// Expected CSS var value that Container emits into inline style for a given
// size prop. Mirrors sizeToVar() in Container.tsx exactly.
const SIZE_VAR = {
  sm: "var(--ps1ui-container-sm)",
  md: "var(--ps1ui-container-md)",
  lg: "var(--ps1ui-container-lg)",
  xl: "var(--ps1ui-container-xl)",
  full: "none",
} as const satisfies Record<ContainerSize, string>;

// Expected CSS var value that Container emits into inline style for a given
// px prop. Mirrors spaceToVar() in Container.tsx exactly.
const PX_VAR = {
  none: "0",
  xs: "var(--ps1ui-space-xs)",
  sm: "var(--ps1ui-space-sm)",
  md: "var(--ps1ui-space-md)",
  lg: "var(--ps1ui-space-lg)",
  xl: "var(--ps1ui-space-xl)",
  "2xl": "var(--ps1ui-space-2xl)",
} as const satisfies Record<SpaceScale, string>;

// Renders a UI tree inside a fixed-width `container-type: inline-size` wrapper
// so Container's own `@container` queries match against the wrapper. Without
// this wrapper, Container has no containment ancestor and only the `base`
// value is applied (which is the documented silent no-op fallback).
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

describe("Container", () => {
  describe("rendering", () => {
    test("renders a <div> with the given children", async () => {
      const screen = await render(<Container data-testid="c">content</Container>);
      const el = screen.getByTestId("c").element();
      expect(el.tagName.toLowerCase()).toBe("div");
      expect(el.textContent).toContain("content");
    });

    test("has no default role (leaves semantics to the caller)", async () => {
      const screen = await render(<Container data-testid="c">x</Container>);
      const el = screen.getByTestId("c").element();
      expect(el.getAttribute("role")).toBeNull();
    });
  });

  describe("class composition", () => {
    test("applies the base ps1ui-container class", async () => {
      const screen = await render(<Container data-testid="c">x</Container>);
      const el = screen.getByTestId("c").element();
      expect(el.classList.contains("ps1ui-container")).toBe(true);
    });

    test("does not emit legacy BEM modifier classes (size/px handled via CSS variables now)", async () => {
      // The old `ps1ui-container--size-*` / `ps1ui-container--px-*` modifier
      // classes were replaced by inline CSS variables that cascade through
      // @container queries. This test locks in that BEM classes are gone —
      // catches an accidental partial revert.
      const screen = await render(
        <Container size="md" px="xl" data-testid="c">
          x
        </Container>,
      );
      const el = screen.getByTestId("c").element();
      for (const cls of Array.from(el.classList)) {
        expect(cls).not.toMatch(/^ps1ui-container--(size|px)-/);
      }
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <Container data-testid="c" className="extra other">
          x
        </Container>,
      );
      const el = screen.getByTestId("c");
      await expect.element(el).toHaveClass("ps1ui-container");
      await expect.element(el).toHaveClass("extra");
      await expect.element(el).toHaveClass("other");
    });
  });

  describe("containment context", () => {
    test("establishes an inline-size containment context", async () => {
      const screen = await render(<Container data-testid="c">x</Container>);
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      expect(getComputedStyle(el).containerType).toBe("inline-size");
    });

    test("names the container context `ps1ui-container`", async () => {
      const screen = await render(<Container data-testid="c">x</Container>);
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      expect(getComputedStyle(el).containerName).toBe("ps1ui-container");
    });

    // `container-type: inline-size` implies `contain: inline-size`, which
    // treats intrinsic width as 0. Placing Container inside a shrink-to-fit
    // flex parent (`align-items: flex-start` in a column) would otherwise
    // collapse it to width 0. The shared containment-defense rule in
    // components.css (`.ps1ui-root, .ps1ui-container, .ps1ui-grid, .ps1ui-stack`)
    // sets `align-self: stretch` (+ `justify-self`, `min-width: 0`) to keep
    // it filling the cross-axis of the parent.
    test("resists collapse via align-self: stretch in shrink-wrap flex parent", async () => {
      const screen = await render(
        <div
          data-testid="p"
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: 500 }}
        >
          <Container data-testid="c">
            <span>x</span>
          </Container>
        </div>,
      );
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      expect(getComputedStyle(el).alignSelf).toBe("stretch");
      expect(el.getBoundingClientRect().width).toBe(500);
    });
  });

  describe("inline style CSS variables", () => {
    test("no size/px props → no --_container-* variables are emitted", async () => {
      const screen = await render(<Container data-testid="c">x</Container>);
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      const styleAttr = el.getAttribute("style") ?? "";
      expect(styleAttr).not.toMatch(/--_container-size-/);
      expect(styleAttr).not.toMatch(/--_container-px-/);
    });

    test.for(SIZES.map((size) => ({ size })))(
      "size=$size scalar → --_container-size-base = $expected",
      async ({ size }) => {
        const screen = await render(
          <Container size={size} data-testid="c">
            x
          </Container>,
        );
        const el = screen.getByTestId("c").element() as HTMLDivElement;
        expect(el.style.getPropertyValue("--_container-size-base")).toBe(SIZE_VAR[size]);
        // Only -base emitted, no other breakpoints
        for (const bp of BREAKPOINTS_NON_BASE) {
          expect(el.style.getPropertyValue(`--_container-size-${bp}`)).toBe("");
        }
      },
    );

    test.for(PXS.map((px) => ({ px })))(
      "px=$px scalar → --_container-px-base is emitted",
      async ({ px }) => {
        const screen = await render(
          <Container px={px} data-testid="c">
            x
          </Container>,
        );
        const el = screen.getByTestId("c").element() as HTMLDivElement;
        expect(el.style.getPropertyValue("--_container-px-base")).toBe(PX_VAR[px]);
        for (const bp of BREAKPOINTS_NON_BASE) {
          expect(el.style.getPropertyValue(`--_container-px-${bp}`)).toBe("");
        }
      },
    );

    test("size responsive object emits one variable per specified breakpoint", async () => {
      const screen = await render(
        <Container size={{ base: "sm", md: "xl" }} data-testid="c">
          x
        </Container>,
      );
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_container-size-base")).toBe(SIZE_VAR.sm);
      expect(el.style.getPropertyValue("--_container-size-md")).toBe(SIZE_VAR.xl);
      expect(el.style.getPropertyValue("--_container-size-sm")).toBe("");
      expect(el.style.getPropertyValue("--_container-size-lg")).toBe("");
      expect(el.style.getPropertyValue("--_container-size-xl")).toBe("");
    });

    test("px responsive object emits one variable per specified breakpoint", async () => {
      const screen = await render(
        <Container px={{ base: "none", md: "2xl" }} data-testid="c">
          x
        </Container>,
      );
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_container-px-base")).toBe(PX_VAR.none);
      expect(el.style.getPropertyValue("--_container-px-md")).toBe(PX_VAR["2xl"]);
      expect(el.style.getPropertyValue("--_container-px-sm")).toBe("");
      expect(el.style.getPropertyValue("--_container-px-lg")).toBe("");
      expect(el.style.getPropertyValue("--_container-px-xl")).toBe("");
    });

    test("full 5-breakpoint size object emits all five variables", async () => {
      const screen = await render(
        <Container size={{ base: "sm", sm: "md", md: "lg", lg: "xl", xl: "full" }} data-testid="c">
          x
        </Container>,
      );
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_container-size-base")).toBe(SIZE_VAR.sm);
      expect(el.style.getPropertyValue("--_container-size-sm")).toBe(SIZE_VAR.md);
      expect(el.style.getPropertyValue("--_container-size-md")).toBe(SIZE_VAR.lg);
      expect(el.style.getPropertyValue("--_container-size-lg")).toBe(SIZE_VAR.xl);
      expect(el.style.getPropertyValue("--_container-size-xl")).toBe(SIZE_VAR.full);
    });

    test("object without base entry emits only the specified breakpoints", async () => {
      // The CSS's base fallback (--ps1ui-container-lg) then supplies the
      // effective value at the `base` breakpoint. Verified in the
      // "computed styles: responsive" section below.
      const screen = await render(
        <Container size={{ md: "xl" }} data-testid="c">
          x
        </Container>,
      );
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_container-size-base")).toBe("");
      expect(el.style.getPropertyValue("--_container-size-md")).toBe(SIZE_VAR.xl);
    });

    test("combines size and px responsive objects into one merged style", async () => {
      const screen = await render(
        <Container size={{ base: "sm", md: "xl" }} px={{ base: "none", md: "2xl" }} data-testid="c">
          x
        </Container>,
      );
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      expect(el.style.getPropertyValue("--_container-size-base")).toBe(SIZE_VAR.sm);
      expect(el.style.getPropertyValue("--_container-size-md")).toBe(SIZE_VAR.xl);
      expect(el.style.getPropertyValue("--_container-px-base")).toBe(PX_VAR.none);
      expect(el.style.getPropertyValue("--_container-px-md")).toBe(PX_VAR["2xl"]);
    });

    test("caller-supplied style is preserved alongside responsive vars", async () => {
      const screen = await render(
        <Container size="md" px="lg" style={{ background: "red" }} data-testid="c">
          x
        </Container>,
      );
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      expect(el.style.background).toContain("red");
      expect(el.style.getPropertyValue("--_container-size-base")).toBe(SIZE_VAR.md);
      expect(el.style.getPropertyValue("--_container-px-base")).toBe(PX_VAR.lg);
    });
  });

  describe("computed styles: scalar (no responsive)", () => {
    // These tests deliberately do NOT wrap in a container-type ancestor, so
    // `@container` blocks never fire. This isolates the scalar-only path and
    // verifies the `base` value survives untouched.
    test.for(SIZES.map((size) => ({ size, expected: MAX_WIDTH_PX[size] })))(
      "size=$size → max-width resolves to $expected",
      async ({ size, expected }) => {
        const screen = await render(
          <Container size={size} data-testid="c">
            {size}
          </Container>,
        );
        const el = screen.getByTestId("c").element() as HTMLDivElement;
        const maxWidth = getComputedStyle(el).maxWidth;
        if (expected === null) {
          expect(maxWidth).toBe("none");
        } else {
          expect(maxWidth).toBe(`${expected}px`);
        }
      },
    );

    test.for(PXS.map((px) => ({ px, expected: PX_VALUE[px] })))(
      "px=$px → padding-inline resolves to $expected on both sides",
      async ({ px, expected }) => {
        const screen = await render(
          <Container px={px} data-testid="c">
            x
          </Container>,
        );
        const el = screen.getByTestId("c").element() as HTMLDivElement;
        const cs = getComputedStyle(el);
        expect(cs.paddingLeft).toBe(expected);
        expect(cs.paddingRight).toBe(expected);
      },
    );

    test("no props → CSS default max-width is `lg` (1024px)", async () => {
      const screen = await render(<Container data-testid="c">x</Container>);
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      expect(getComputedStyle(el).maxWidth).toBe("1024px");
    });

    test("no props → CSS default padding is `lg` (16px)", async () => {
      const screen = await render(<Container data-testid="c">x</Container>);
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      const cs = getComputedStyle(el);
      expect(cs.paddingLeft).toBe("16px");
      expect(cs.paddingRight).toBe("16px");
    });

    test("size=sm inside a wider parent centers the container (equal inline margins)", async () => {
      // `margin-inline: auto` centers the block when parent > max-width.
      // getComputedStyle reports the *used* value (resolved pixels), not
      // "auto", so we verify by measuring the resolved offsets in a
      // wider-than-max-width parent.
      const screen = await render(
        <div style={{ width: 800 }}>
          <Container size="sm" data-testid="c">
            x
          </Container>
        </div>,
      );
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      const cs = getComputedStyle(el);
      // Parent 800px, max-width 640px → 80px each side.
      expect(cs.marginInlineStart).toBe(cs.marginInlineEnd);
      expect(parseFloat(cs.marginInlineStart)).toBeGreaterThan(0);
    });
  });

  describe("computed styles: responsive (via @container queries)", () => {
    // Fixed widths chosen to land ONE per breakpoint band:
    //  400 → below sm (40rem = 640px) — only base fires
    //  700 → between sm (640) and md (768) — sm fires
    //  900 → between md (768) and lg (1024) — sm+md fires, md wins
    // 1200 → between lg (1024) and xl (1280) — sm+md+lg fires, lg wins
    // 1400 → above xl (1280) — all fire, xl wins
    // Widths are chosen just inside their band to keep the intent
    // obvious; the exact value doesn't matter as long as it doesn't
    // straddle a threshold.
    type Band = { name: string; width: number; effectiveBreakpoint: Breakpoint };
    const BANDS: readonly Band[] = [
      { name: "below sm (base only)", width: 400, effectiveBreakpoint: "base" },
      { name: "sm band", width: 700, effectiveBreakpoint: "sm" },
      { name: "md band", width: 900, effectiveBreakpoint: "md" },
      { name: "lg band", width: 1200, effectiveBreakpoint: "lg" },
      { name: "xl band", width: 1400, effectiveBreakpoint: "xl" },
    ];

    // Full 5-breakpoint object; the effective size at each band should
    // match the exact entry for that breakpoint.
    const FULL_SIZE_OBJECT = {
      base: "sm",
      sm: "md",
      md: "lg",
      lg: "xl",
      xl: "full",
    } as const satisfies Record<Breakpoint, ContainerSize>;

    test.for(BANDS)(
      "size={full object} in $name ($width px) → effective size = $effectiveBreakpoint's entry",
      async ({ width, effectiveBreakpoint }) => {
        const screen = await renderInContainerAtWidth(
          width,
          <Container size={FULL_SIZE_OBJECT} data-testid="c">
            x
          </Container>,
        );
        const el = screen.getByTestId("c").element() as HTMLDivElement;
        const expectedSize: ContainerSize = FULL_SIZE_OBJECT[effectiveBreakpoint];
        const expected = MAX_WIDTH_PX[expectedSize];
        const maxWidth = getComputedStyle(el).maxWidth;
        if (expected === null) {
          expect(maxWidth).toBe("none");
        } else {
          expect(maxWidth).toBe(`${expected}px`);
        }
      },
    );

    test("cascade fallback: size={base:'sm', md:'xl'} in sm band → base (sm) survives", async () => {
      // At 700px, only sm breakpoint has fired. Since --_container-size-sm
      // is unset, --_size-sm falls back to --_size-base = 'sm' → 640px.
      const screen = await renderInContainerAtWidth(
        700,
        <Container size={{ base: "sm", md: "xl" }} data-testid="c">
          x
        </Container>,
      );
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      expect(getComputedStyle(el).maxWidth).toBe("640px");
    });

    test("cascade fallback: size={base:'sm', md:'xl'} above md → md (xl) wins for all wider breakpoints", async () => {
      // At 1400px (xl fires). Since --_container-size-xl and -lg are unset,
      // --_size-xl → --_size-lg → --_size-md = 'xl' = 1280px.
      const screen = await renderInContainerAtWidth(
        1400,
        <Container size={{ base: "sm", md: "xl" }} data-testid="c">
          x
        </Container>,
      );
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      expect(getComputedStyle(el).maxWidth).toBe("1280px");
    });

    test("cascade fallback: object without base → CSS default (lg = 1024px) at base breakpoint", async () => {
      const screen = await renderInContainerAtWidth(
        400,
        <Container size={{ md: "xl" }} data-testid="c">
          x
        </Container>,
      );
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      expect(getComputedStyle(el).maxWidth).toBe("1024px");
    });

    test("cascade fallback: object without base → md override kicks in at md band", async () => {
      const screen = await renderInContainerAtWidth(
        900,
        <Container size={{ md: "xl" }} data-testid="c">
          x
        </Container>,
      );
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      expect(getComputedStyle(el).maxWidth).toBe("1280px");
    });

    test("px cascade behaves identically to size cascade", async () => {
      // Spot-check px alongside size to prove the cascade generalizes.
      const screen = await renderInContainerAtWidth(
        900,
        <Container px={{ base: "none", md: "2xl" }} data-testid="c">
          x
        </Container>,
      );
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      const cs = getComputedStyle(el);
      expect(cs.paddingLeft).toBe("32px");
      expect(cs.paddingRight).toBe("32px");
    });

    test("no responsive props inside a wide container → CSS defaults still apply (no accidental cascade)", async () => {
      const screen = await renderInContainerAtWidth(1400, <Container data-testid="c">x</Container>);
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      // Default lg (1024px) survives even at xl breakpoint — @container
      // blocks override --_size to --_size-{bp}, but every --_size-{bp}
      // ultimately falls back to the CSS default (--ps1ui-container-lg).
      expect(getComputedStyle(el).maxWidth).toBe("1024px");
    });
  });

  // Regression net for the responsive-prop cascade leak — see Stack.test.tsx's
  // "nested Stack does not inherit outer's per-breakpoint input vars" describe
  // for the fullest account and Container.css's @property block for the fix.
  // Wraps in a `container-type: inline-size` div so the OUTER Container's own
  // @container query fires at each target breakpoint, guaranteeing outer's
  // inline-size exceeds the threshold and inner's query fires too.
  describe("nested Container does not inherit outer's per-breakpoint input vars", () => {
    const BREAKPOINT_WIDTHS = { sm: 700, md: 900, lg: 1200, xl: 1400 } as const;

    type ContainerLeakAxis = keyof typeof CONTAINER_LEAK_TABLE;
    type ContainerLeakCase = {
      outerFor: (
        bp: Exclude<Breakpoint, "base">,
      ) => Partial<Omit<Parameters<typeof Container>[0], "children" | "ref">>;
      inner: Partial<Omit<Parameters<typeof Container>[0], "children" | "ref">>;
      computed: (cs: CSSStyleDeclaration) => string;
      expected: string;
    };

    const CONTAINER_LEAK_TABLE = {
      size: {
        // Other axes held constant on both outer and inner so only `size`
        // can leak between them.
        outerFor: (bp) => ({ size: { base: "sm", [bp]: "xl" }, px: "none" }),
        inner: { size: "sm", px: "none" },
        computed: (cs) => cs.maxWidth,
        expected: "640px",
      },
      px: {
        outerFor: (bp) => ({ size: "full", px: { base: "none", [bp]: "2xl" } }),
        inner: { size: "full", px: "none" },
        computed: (cs) => cs.paddingInlineStart,
        expected: "0px",
      },
    } as const satisfies Record<"size" | "px", ContainerLeakCase>;

    const CASES = (Object.keys(CONTAINER_LEAK_TABLE) as ContainerLeakAxis[]).flatMap((axis) =>
      BREAKPOINTS_NON_BASE.map((bp) => ({
        axis,
        bp,
        width: BREAKPOINT_WIDTHS[bp],
        ...CONTAINER_LEAK_TABLE[axis],
      })),
    );

    test.for(CASES)(
      "outer $axis leak at $bp does not reach inner",
      async ({ outerFor, inner, computed, expected, bp, width }) => {
        const screen = await render(
          <div style={{ containerType: "inline-size", width } as CSSProperties}>
            <Container {...outerFor(bp)} data-testid="outer">
              <Container {...inner} data-testid="inner">
                x
              </Container>
            </Container>
          </div>,
        );
        const innerEl = screen.getByTestId("inner").element() as HTMLDivElement;
        expect(computed(getComputedStyle(innerEl))).toBe(expected);
      },
    );
  });

  describe("nested Container responds to outer Container width", () => {
    test("inner Container inside a 700px-wide outer Container → effective size = sm entry", async () => {
      const screen = await render(
        <div style={{ width: 900 }}>
          <Container size="full" px="none" data-testid="outer">
            {/* outer forces its own inline-size to ~900px; but we constrain
                its parent to 900 and its own width is 100% of parent. */}
            <div style={{ width: 700 }}>
              <Container size={{ base: "sm", sm: "md", md: "lg" }} data-testid="inner">
                x
              </Container>
            </div>
          </Container>
        </div>,
      );
      const inner = screen.getByTestId("inner").element() as HTMLDivElement;
      // Inner's nearest containment ancestor is the outer Container
      // (container-name: ps1ui-container). The outer's inline-size is
      // 900px so its `sm` (>= 40rem = 640px) and `md` (>= 48rem = 768px)
      // @container rules both fire → inner picks its `md` entry = 'lg'
      // → max-width 1024px. But inner is only 700px wide, so used
      // max-width caps at 700 in layout — however getComputedStyle
      // reports the specified value regardless: expect the raw 1024px.
      expect(getComputedStyle(inner).maxWidth).toBe("1024px");
    });
  });

  describe("passthrough", () => {
    test("forwards native <div> attributes (id, role, aria-label, data-*)", async () => {
      const screen = await render(
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- exercises Container's role passthrough; Container is intentionally a bare <div>.
        <Container id="main" role="main" aria-label="main content" data-testid="c">
          x
        </Container>,
      );
      const el = screen.getByTestId("c");
      await expect.element(el).toHaveAttribute("id", "main");
      await expect.element(el).toHaveAttribute("role", "main");
      await expect.element(el).toHaveAttribute("aria-label", "main content");
    });

    test("forwards a ref to the underlying <div>", async () => {
      let captured: HTMLDivElement | null = null;
      const setRef = (node: HTMLDivElement | null) => {
        captured = node;
      };
      await render(
        <Container ref={setRef} data-testid="c">
          x
        </Container>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLDivElement).tagName.toLowerCase()).toBe("div");
    });
  });

  describe("a11y", () => {
    type A11yCase = { name: string; node: () => ReactNode };

    const cases: A11yCase[] = [
      ...SIZES.map(
        (size): A11yCase => ({
          name: `size=${size} with body text`,
          node: () => (
            <Container size={size}>
              <Text>the quick brown fox jumps over the lazy dog</Text>
            </Container>
          ),
        }),
      ),
      {
        name: "px=none with body text",
        node: () => (
          <Container px="none">
            <Text>edge-to-edge content, no horizontal padding</Text>
          </Container>
        ),
      },
      {
        name: "responsive size object",
        node: () => (
          <Container size={{ base: "sm", md: "xl" }}>
            <Text>responsive size — sm on narrow, xl on wide</Text>
          </Container>
        ),
      },
      {
        name: "responsive px object",
        node: () => (
          <Container px={{ base: "sm", md: "xl" }}>
            <Text>responsive padding — sm on narrow, xl on wide</Text>
          </Container>
        ),
      },
      {
        name: "as a labelled main landmark",
        node: () => (
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- documents the labelled-landmark usage; Container is intentionally a bare <div>.
          <Container role="main" aria-labelledby="page-title">
            <Text as="div" id="page-title" weight="semibold">
              Page title
            </Text>
            <Text as="p">Body copy.</Text>
          </Container>
        ),
      },
    ];

    test.for(cases)("$name → no axe violations", async ({ node }) => {
      const screen = await render(node());
      await expectNoAxeViolations(screen.container);
    });
  });
});
