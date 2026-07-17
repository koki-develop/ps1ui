import "../../styles/styles.css";

import type { CSSProperties, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import type { Breakpoint } from "../../utils/responsive";
import {
  Heading,
  type HeadingElement,
  type HeadingLevel,
  type HeadingSize,
  type HeadingWeight,
} from "./Heading";

const LEVELS = [1, 2, 3, 4, 5, 6] as const satisfies readonly HeadingLevel[];
const AS_VALUES = ["h1", "h2", "h3", "h4", "h5", "h6"] as const satisfies readonly HeadingElement[];
const SIZES = ["sm", "md", "lg", "xl", "2xl", "3xl"] as const satisfies readonly HeadingSize[];
const WEIGHTS = [
  "regular",
  "medium",
  "semibold",
  "bold",
] as const satisfies readonly HeadingWeight[];

const BREAKPOINTS_NON_BASE = ["sm", "md", "lg", "xl"] as const satisfies readonly Exclude<
  Breakpoint,
  "base"
>[];

// Mirror of LEVEL_DEFAULTS in Heading.tsx — kept in the test as a snapshot so a defaults
// change in the component fails a test rather than silently shifting typography.
const EXPECTED_DEFAULTS: Record<HeadingLevel, { size: HeadingSize; weight: HeadingWeight }> = {
  1: { size: "3xl", weight: "bold" },
  2: { size: "2xl", weight: "semibold" },
  3: { size: "xl", weight: "semibold" },
  4: { size: "lg", weight: "semibold" },
  5: { size: "md", weight: "medium" },
  6: { size: "sm", weight: "medium" },
};

// Mirrors sizeToVar in Heading.tsx.
const SIZE_VAR = {
  sm: "var(--ps1ui-font-size-sm)",
  md: "var(--ps1ui-font-size-md)",
  lg: "var(--ps1ui-font-size-lg)",
  xl: "var(--ps1ui-font-size-xl)",
  "2xl": "var(--ps1ui-font-size-2xl)",
  "3xl": "var(--ps1ui-font-size-3xl)",
} as const satisfies Record<HeadingSize, string>;

// Mirrors weightToValue in Heading.tsx.
const WEIGHT_VALUE = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const satisfies Record<HeadingWeight, string>;

// Expected computed font-size: the rem values of --ps1ui-font-size-* tokens
// resolved at the test browser's default 16px root.
const FONT_SIZE_PX = {
  sm: "14px",
  md: "16px",
  lg: "18px",
  xl: "22px",
  "2xl": "26px",
  "3xl": "32px",
} as const satisfies Record<HeadingSize, string>;

// Renders a UI tree inside a fixed-width `container-type: inline-size` wrapper
// so Heading's `@container` queries match against the wrapper.
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

describe("Heading", () => {
  describe("rendering", () => {
    test.for(LEVELS.map((level) => ({ level })))(
      "level=$level renders the matching h$level tag by default",
      async ({ level }) => {
        const screen = await render(
          <Heading level={level} data-testid="h">
            level {level}
          </Heading>,
        );
        const el = screen.getByTestId("h").element();
        expect(el.tagName.toLowerCase()).toBe(`h${level}`);
      },
    );

    test.for(AS_VALUES.map((tag) => ({ tag })))(
      "as='$tag' overrides the rendered tag independently of level",
      async ({ tag }) => {
        const screen = await render(
          <Heading level={1} as={tag} data-testid="h">
            {tag}
          </Heading>,
        );
        const el = screen.getByTestId("h").element();
        expect(el.tagName.toLowerCase()).toBe(tag);
      },
    );

    test("renders children", async () => {
      const screen = await render(<Heading level={2}>Section title</Heading>);
      await expect.element(screen.getByRole("heading", { name: "Section title" })).toBeVisible();
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-heading base class", async () => {
      const screen = await render(
        <Heading level={1} data-testid="h">
          x
        </Heading>,
      );
      await expect.element(screen.getByTestId("h")).toHaveClass("ps1ui-heading");
    });

    test("does not emit legacy size/weight BEM classes (handled via CSS variables now)", async () => {
      // The old `ps1ui-heading--size-*` / `ps1ui-heading--weight-*` modifier
      // classes were replaced by inline CSS variables. Locking in that BEM
      // classes are gone — catches an accidental partial revert.
      const screen = await render(
        <Heading level={1} size="lg" weight="regular" data-testid="h">
          x
        </Heading>,
      );
      const el = screen.getByTestId("h").element();
      for (const cls of Array.from(el.classList)) {
        expect(cls).not.toMatch(/^ps1ui-heading--(size|weight)-/);
      }
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <Heading level={1} className="extra other" data-testid="h">
          x
        </Heading>,
      );
      const el = screen.getByTestId("h");
      await expect.element(el).toHaveClass("ps1ui-heading");
      await expect.element(el).toHaveClass("extra");
      await expect.element(el).toHaveClass("other");
    });
  });

  describe("inline style CSS variables", () => {
    test.for(LEVELS.map((level) => ({ level })))(
      "level=$level with no size/weight overrides → emits level's default at --_heading-{size,weight}-base",
      async ({ level }) => {
        const screen = await render(
          <Heading level={level} data-testid="h">
            x
          </Heading>,
        );
        const el = screen.getByTestId("h").element() as HTMLElement;
        const { size, weight } = EXPECTED_DEFAULTS[level];
        expect(el.style.getPropertyValue("--_heading-size-base")).toBe(SIZE_VAR[size]);
        expect(el.style.getPropertyValue("--_heading-weight-base")).toBe(WEIGHT_VALUE[weight]);
        // Only -base emitted for the scalar-default path.
        for (const bp of BREAKPOINTS_NON_BASE) {
          expect(el.style.getPropertyValue(`--_heading-size-${bp}`)).toBe("");
          expect(el.style.getPropertyValue(`--_heading-weight-${bp}`)).toBe("");
        }
      },
    );

    test.for(SIZES.map((size) => ({ size })))(
      "explicit scalar size=$size overrides the level default at --_heading-size-base",
      async ({ size }) => {
        const screen = await render(
          <Heading level={1} size={size} data-testid="h">
            x
          </Heading>,
        );
        const el = screen.getByTestId("h").element() as HTMLElement;
        expect(el.style.getPropertyValue("--_heading-size-base")).toBe(SIZE_VAR[size]);
      },
    );

    test.for(WEIGHTS.map((weight) => ({ weight })))(
      "explicit scalar weight=$weight overrides the level default at --_heading-weight-base",
      async ({ weight }) => {
        const screen = await render(
          <Heading level={1} weight={weight} data-testid="h">
            x
          </Heading>,
        );
        const el = screen.getByTestId("h").element() as HTMLElement;
        expect(el.style.getPropertyValue("--_heading-weight-base")).toBe(WEIGHT_VALUE[weight]);
      },
    );

    test("responsive size WITHOUT base falls back to the level default at base", async () => {
      // The withResponsiveBase pipeline: level 1's default size is `3xl`; a
      // caller who wrote `size={{ md: "xl" }}` gets `{ base: "3xl", md: "xl" }`
      // stamped as inline CSS variables.
      const screen = await render(
        <Heading level={1} size={{ md: "xl" }} data-testid="h">
          x
        </Heading>,
      );
      const el = screen.getByTestId("h").element() as HTMLElement;
      expect(el.style.getPropertyValue("--_heading-size-base")).toBe(SIZE_VAR["3xl"]);
      expect(el.style.getPropertyValue("--_heading-size-md")).toBe(SIZE_VAR.xl);
    });

    test("responsive weight WITHOUT base falls back to the level default at base", async () => {
      const screen = await render(
        <Heading level={2} weight={{ md: "regular" }} data-testid="h">
          x
        </Heading>,
      );
      const el = screen.getByTestId("h").element() as HTMLElement;
      // level 2 default weight = semibold (600)
      expect(el.style.getPropertyValue("--_heading-weight-base")).toBe(WEIGHT_VALUE.semibold);
      expect(el.style.getPropertyValue("--_heading-weight-md")).toBe(WEIGHT_VALUE.regular);
    });

    test("responsive size WITH explicit base uses the caller's base and per-breakpoint entries", async () => {
      const screen = await render(
        <Heading level={1} size={{ base: "sm", md: "xl", xl: "3xl" }} data-testid="h">
          x
        </Heading>,
      );
      const el = screen.getByTestId("h").element() as HTMLElement;
      // Level 1's default (3xl) is discarded because the caller supplied
      // an explicit base — user intent wins.
      expect(el.style.getPropertyValue("--_heading-size-base")).toBe(SIZE_VAR.sm);
      expect(el.style.getPropertyValue("--_heading-size-md")).toBe(SIZE_VAR.xl);
      expect(el.style.getPropertyValue("--_heading-size-xl")).toBe(SIZE_VAR["3xl"]);
      expect(el.style.getPropertyValue("--_heading-size-sm")).toBe("");
      expect(el.style.getPropertyValue("--_heading-size-lg")).toBe("");
    });

    test("caller-supplied style is preserved alongside responsive vars", async () => {
      const screen = await render(
        <Heading level={1} size="xl" style={{ letterSpacing: "0.1em" }} data-testid="h">
          x
        </Heading>,
      );
      const el = screen.getByTestId("h").element() as HTMLElement;
      expect(el.style.letterSpacing).toBe("0.1em");
      expect(el.style.getPropertyValue("--_heading-size-base")).toBe(SIZE_VAR.xl);
    });
  });

  describe("computed styles: scalar (no responsive)", () => {
    test.for(LEVELS.map((level) => ({ level })))(
      "level=$level with no overrides → level default resolves to expected font-size and font-weight",
      async ({ level }) => {
        const screen = await render(
          <Heading level={level} data-testid="h">
            x
          </Heading>,
        );
        const el = screen.getByTestId("h").element() as HTMLElement;
        const { size, weight } = EXPECTED_DEFAULTS[level];
        expect(getComputedStyle(el).fontSize).toBe(FONT_SIZE_PX[size]);
        expect(getComputedStyle(el).fontWeight).toBe(WEIGHT_VALUE[weight]);
      },
    );

    test.for(SIZES.map((size) => ({ size, expected: FONT_SIZE_PX[size] })))(
      "explicit size=$size scalar → font-size resolves to $expected",
      async ({ size, expected }) => {
        const screen = await render(
          <Heading level={1} size={size} data-testid="h">
            x
          </Heading>,
        );
        const el = screen.getByTestId("h").element() as HTMLElement;
        expect(getComputedStyle(el).fontSize).toBe(expected);
      },
    );

    test.for(WEIGHTS.map((weight) => ({ weight, expected: WEIGHT_VALUE[weight] })))(
      "explicit weight=$weight scalar → font-weight resolves to $expected",
      async ({ weight, expected }) => {
        const screen = await render(
          <Heading level={1} weight={weight} data-testid="h">
            x
          </Heading>,
        );
        const el = screen.getByTestId("h").element() as HTMLElement;
        expect(getComputedStyle(el).fontWeight).toBe(expected);
      },
    );
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

    const FULL_SIZE = {
      base: "sm",
      sm: "md",
      md: "lg",
      lg: "2xl",
      xl: "3xl",
    } as const satisfies Record<Breakpoint, HeadingSize>;

    test.for(BANDS)(
      "size={full object} in $name ($width px) → font-size resolves to $effectiveBreakpoint's px",
      async ({ width, effectiveBreakpoint }) => {
        const screen = await renderInContainerAtWidth(
          width,
          <Heading level={1} size={FULL_SIZE} data-testid="h">
            x
          </Heading>,
        );
        const el = screen.getByTestId("h").element() as HTMLElement;
        expect(getComputedStyle(el).fontSize).toBe(FONT_SIZE_PX[FULL_SIZE[effectiveBreakpoint]]);
      },
    );

    test("responsive object WITHOUT base → level default applies at base breakpoint", async () => {
      // withResponsiveBase should inject level 1's default (3xl) as base so
      // at narrow contexts we still see level 1 typography.
      const screen = await renderInContainerAtWidth(
        400,
        <Heading level={1} size={{ md: "sm" }} data-testid="h">
          x
        </Heading>,
      );
      const el = screen.getByTestId("h").element() as HTMLElement;
      expect(getComputedStyle(el).fontSize).toBe(FONT_SIZE_PX["3xl"]);
    });

    test("responsive object WITHOUT base → md override kicks in at md band", async () => {
      const screen = await renderInContainerAtWidth(
        900,
        <Heading level={1} size={{ md: "sm" }} data-testid="h">
          x
        </Heading>,
      );
      const el = screen.getByTestId("h").element() as HTMLElement;
      expect(getComputedStyle(el).fontSize).toBe(FONT_SIZE_PX.sm);
    });

    test("cascade fallback: size={base:'sm', md:'xl'} above md → md (xl) wins for all wider breakpoints", async () => {
      const screen = await renderInContainerAtWidth(
        1400,
        <Heading level={1} size={{ base: "sm", md: "xl" }} data-testid="h">
          x
        </Heading>,
      );
      const el = screen.getByTestId("h").element() as HTMLElement;
      expect(getComputedStyle(el).fontSize).toBe(FONT_SIZE_PX.xl);
    });

    test("no explicit responsive props inside a wide container → level default still applies (no accidental cascade)", async () => {
      const screen = await renderInContainerAtWidth(
        1400,
        <Heading level={3} data-testid="h">
          x
        </Heading>,
      );
      const el = screen.getByTestId("h").element() as HTMLElement;
      // Level 3 default = xl. Even at xl breakpoint (>= 80rem), the
      // level default is baked into `-base` only, so the cascade
      // reduces to that value at every breakpoint.
      expect(getComputedStyle(el).fontSize).toBe(FONT_SIZE_PX.xl);
    });
  });

  // Regression net for the responsive-prop cascade leak — see Stack.test.tsx's
  // "nested Stack does not inherit outer's per-breakpoint input vars" describe
  // for the fullest account and Heading.css's @property block for the fix.
  // Nesting `<h1><h2>...</h2></h1>` is invalid HTML (heading content only
  // permits phrasing content), but React renders whatever JSX asserts — the
  // resulting DOM has h1 containing h2, and CSS custom property inheritance
  // flows regardless. That's what makes the leak reachable in practice
  // (e.g., a caller composing a headline with a nested subheading via a
  // wrapper component). Both outer and inner use `withResponsiveBase` to
  // stamp level defaults at `base`, so `-base` never leaks; only per-
  // breakpoint entries can.
  describe("nested Heading does not inherit outer's per-breakpoint input vars", () => {
    // React logs `<h1> cannot contain a nested <h2>.` for every render below
    // (heading content only permits phrasing content per HTML5). The nesting
    // is INTENTIONAL — we're exercising CSS custom property inheritance,
    // which flows regardless of the HTML validity of the DOM parent chain.
    // Silence the noise so a real regression's failure output isn't buried.
    let consoleError: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      consoleError.mockRestore();
    });

    const BREAKPOINT_WIDTHS = { sm: 700, md: 900, lg: 1200, xl: 1400 } as const;

    type HeadingLeakAxis = keyof typeof HEADING_LEAK_TABLE;
    type HeadingLeakCase = {
      outerFor: (
        bp: Exclude<Breakpoint, "base">,
      ) => Partial<Omit<Parameters<typeof Heading>[0], "children" | "ref" | "level" | "as">>;
      inner: Partial<Omit<Parameters<typeof Heading>[0], "children" | "ref" | "level" | "as">>;
      computed: (cs: CSSStyleDeclaration) => string;
      expected: string;
    };

    const HEADING_LEAK_TABLE = {
      size: {
        outerFor: (bp) => ({ size: { base: "sm", [bp]: "3xl" } }),
        inner: { size: "sm" },
        computed: (cs) => cs.fontSize,
        expected: FONT_SIZE_PX.sm,
      },
      weight: {
        outerFor: (bp) => ({ weight: { base: "regular", [bp]: "bold" } }),
        inner: { weight: "regular" },
        computed: (cs) => cs.fontWeight,
        expected: WEIGHT_VALUE.regular,
      },
    } as const satisfies Record<"size" | "weight", HeadingLeakCase>;

    const CASES = (Object.keys(HEADING_LEAK_TABLE) as HeadingLeakAxis[]).flatMap((axis) =>
      BREAKPOINTS_NON_BASE.map((bp) => ({
        axis,
        bp,
        width: BREAKPOINT_WIDTHS[bp],
        ...HEADING_LEAK_TABLE[axis],
      })),
    );

    test.for(CASES)(
      "outer $axis leak at $bp does not reach inner",
      async ({ outerFor, inner, computed, expected, bp, width }) => {
        const screen = await render(
          <div style={{ containerType: "inline-size", width } as CSSProperties}>
            <Heading level={1} {...outerFor(bp)} data-testid="outer">
              <Heading level={2} {...inner} data-testid="inner">
                x
              </Heading>
            </Heading>
          </div>,
        );
        const innerEl = screen.getByTestId("inner").element() as HTMLElement;
        expect(computed(getComputedStyle(innerEl))).toBe(expected);
      },
    );
  });

  describe("Heading does NOT establish its own containment context (leaf component)", () => {
    test("container-type is not `inline-size`", async () => {
      const screen = await render(
        <Heading level={1} data-testid="h">
          x
        </Heading>,
      );
      const el = screen.getByTestId("h").element() as HTMLElement;
      expect(getComputedStyle(el).containerType).not.toBe("inline-size");
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes (id, data-*, aria-*)", async () => {
      const screen = await render(
        <Heading level={2} id="section-1" aria-describedby="hint" data-testid="h">
          x
        </Heading>,
      );
      const el = screen.getByTestId("h");
      await expect.element(el).toHaveAttribute("id", "section-1");
      await expect.element(el).toHaveAttribute("aria-describedby", "hint");
    });
  });

  describe("a11y", () => {
    type A11yCase = { name: string; node: () => ReactElement };

    // Orthogonal matrix: every (level, as) pair. Each render is a self-contained heading
    // and should pass axe on its own — heading-order does not fire on a single heading.
    const matrixCases: A11yCase[] = LEVELS.flatMap((level) =>
      AS_VALUES.map(
        (as): A11yCase => ({
          name: `level=${level} × as=${as}`,
          node: () => (
            <Heading level={level} as={as}>
              {`heading level=${level} rendered as ${as}`}
            </Heading>
          ),
        }),
      ),
    );

    const structuralCases: A11yCase[] = [
      {
        name: "heading-order: h1 → h6 in sequence passes axe",
        node: () => (
          <article>
            <Heading level={1}>Doc title</Heading>
            <Heading level={2}>Section</Heading>
            <Heading level={3}>Subsection</Heading>
            <Heading level={4}>Sub-subsection</Heading>
            <Heading level={5}>Minor heading</Heading>
            <Heading level={6}>Note heading</Heading>
          </article>
        ),
      },
      {
        name: "as override preserves semantic order (h1, h2, h3)",
        node: () => (
          <article>
            <Heading level={1} as="h1">
              Doc title
            </Heading>
            <Heading level={2} as="h2" size="lg">
              Visually smaller h2
            </Heading>
            <Heading level={3} as="h3" size="xl">
              Visually larger h3
            </Heading>
          </article>
        ),
      },
      {
        name: "single heading with size + weight overrides",
        node: () => (
          <Heading level={1} size="sm" weight="regular">
            reduced heading
          </Heading>
        ),
      },
      {
        name: "responsive size on level 1",
        node: () => (
          <Heading level={1} size={{ base: "xl", md: "3xl" }}>
            responsive heading
          </Heading>
        ),
      },
      {
        name: "responsive weight on level 2",
        node: () => (
          <Heading level={2} weight={{ base: "regular", md: "bold" }}>
            responsive weight heading
          </Heading>
        ),
      },
    ];

    test.for([...matrixCases, ...structuralCases])(
      "$name → no axe violations",
      async ({ node }) => {
        const screen = await render(node());
        await expectNoAxeViolations(screen.container);
      },
    );
  });
});
