import "../../styles/styles.css";

import type { CSSProperties, ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import type { Breakpoint } from "../../utils/responsive";
import { Text, type TextElement, type TextSize, type TextVariant, type TextWeight } from "./Text";

const AS_VALUES = [
  "p",
  "span",
  "div",
  "label",
  "strong",
  "em",
  "small",
] as const satisfies readonly TextElement[];

const VARIANTS = [
  "body",
  "muted",
  "subtle",
  "primary",
  "accent",
] as const satisfies readonly TextVariant[];

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const satisfies readonly TextSize[];

const WEIGHTS = ["regular", "medium", "semibold", "bold"] as const satisfies readonly TextWeight[];

const INLINE_TAGS = [
  "span",
  "label",
  "strong",
  "em",
  "small",
] as const satisfies readonly TextElement[];
const BLOCK_TAGS = ["p", "div"] as const satisfies readonly TextElement[];

const BREAKPOINTS_NON_BASE = ["sm", "md", "lg", "xl"] as const satisfies readonly Exclude<
  Breakpoint,
  "base"
>[];

// Expected computed font-size per token: the rem values of
// --ps1ui-font-size-* in tokens.css resolved at the test browser's default
// 16px root. Kept as a table so any font-size token drift trips these
// tests, not just a class rename.
const FONT_SIZE_PX = {
  xs: "12px",
  sm: "14px",
  md: "16px",
  lg: "18px",
  xl: "22px",
} as const satisfies Record<TextSize, string>;

// Expected computed font-weight per prop input. Mirrors weightToValue()
// in Text.tsx exactly.
const FONT_WEIGHT = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const satisfies Record<TextWeight, string>;

// Expected CSS var value Text emits into inline style for a given size prop
// entry. Mirrors sizeToVar() in Text.tsx.
const SIZE_VAR = {
  xs: "var(--ps1ui-font-size-xs)",
  sm: "var(--ps1ui-font-size-sm)",
  md: "var(--ps1ui-font-size-md)",
  lg: "var(--ps1ui-font-size-lg)",
  xl: "var(--ps1ui-font-size-xl)",
} as const satisfies Record<TextSize, string>;

// Renders a UI tree inside a fixed-width `container-type: inline-size` wrapper
// so Text's `@container` queries match against the wrapper.
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

describe("Text", () => {
  describe("rendering", () => {
    test("defaults to a <p> element", async () => {
      const screen = await render(<Text data-testid="t">x</Text>);
      const el = screen.getByTestId("t").element();
      expect(el.tagName.toLowerCase()).toBe("p");
    });

    test.for(AS_VALUES.map((tag) => ({ tag })))(
      "as='$tag' renders the corresponding tag",
      async ({ tag }) => {
        const screen = await render(
          <Text as={tag} data-testid="t">
            {tag}
          </Text>,
        );
        const el = screen.getByTestId("t").element();
        expect(el.tagName.toLowerCase()).toBe(tag);
      },
    );
  });

  describe("class composition", () => {
    test("applies default classes: ps1ui-text, variant=body", async () => {
      const screen = await render(<Text data-testid="t">default</Text>);
      const el = screen.getByTestId("t").element();
      expect(el.classList.contains("ps1ui-text")).toBe(true);
      expect(el.classList.contains("ps1ui-text--body")).toBe(true);
    });

    test("does not emit legacy size/weight BEM classes (handled via CSS variables now)", async () => {
      // The old `ps1ui-text--size-*` / `ps1ui-text--weight-*` modifier
      // classes were replaced by inline CSS variables that cascade through
      // @container queries. Variant / truncate stay class-based (variant
      // is a discrete non-responsive axis; truncate is a boolean toggle).
      const screen = await render(
        <Text size="xl" weight="bold" data-testid="t">
          x
        </Text>,
      );
      const el = screen.getByTestId("t").element();
      for (const cls of Array.from(el.classList)) {
        expect(cls).not.toMatch(/^ps1ui-text--(size|weight)-/);
      }
    });

    test.for(VARIANTS.map((variant) => ({ variant })))(
      "variant=$variant → ps1ui-text--$variant",
      async ({ variant }) => {
        const screen = await render(
          <Text variant={variant} data-testid="t">
            {variant}
          </Text>,
        );
        await expect.element(screen.getByTestId("t")).toHaveClass(`ps1ui-text--${variant}`);
      },
    );

    test.for([
      ...INLINE_TAGS.map((tag) => ({ tag, expectInline: true })),
      ...BLOCK_TAGS.map((tag) => ({ tag, expectInline: false })),
    ])(
      "truncate + as='$tag' → truncate class + inline modifier=$expectInline",
      async ({ tag, expectInline }) => {
        const screen = await render(
          <Text as={tag} truncate data-testid="t">
            {tag}
          </Text>,
        );
        const el = screen.getByTestId("t").element();
        expect(el.classList.contains("ps1ui-text--truncate")).toBe(true);
        expect(el.classList.contains("ps1ui-text--truncate-inline")).toBe(expectInline);
      },
    );

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <Text className="extra other" data-testid="t">
          x
        </Text>,
      );
      const el = screen.getByTestId("t");
      await expect.element(el).toHaveClass("ps1ui-text");
      await expect.element(el).toHaveClass("extra");
      await expect.element(el).toHaveClass("other");
    });
  });

  describe("inline style CSS variables", () => {
    test("no size/weight props → no --_text-* variables are emitted", async () => {
      const screen = await render(<Text data-testid="t">x</Text>);
      const el = screen.getByTestId("t").element() as HTMLElement;
      const styleAttr = el.getAttribute("style") ?? "";
      expect(styleAttr).not.toMatch(/--_text-(size|weight)-/);
    });

    test.for(SIZES.map((size) => ({ size })))(
      "size=$size scalar → --_text-size-base is emitted",
      async ({ size }) => {
        const screen = await render(
          <Text size={size} data-testid="t">
            x
          </Text>,
        );
        const el = screen.getByTestId("t").element() as HTMLElement;
        expect(el.style.getPropertyValue("--_text-size-base")).toBe(SIZE_VAR[size]);
        for (const bp of BREAKPOINTS_NON_BASE) {
          expect(el.style.getPropertyValue(`--_text-size-${bp}`)).toBe("");
        }
      },
    );

    test.for(WEIGHTS.map((weight) => ({ weight })))(
      "weight=$weight scalar → --_text-weight-base emits numeric value",
      async ({ weight }) => {
        const screen = await render(
          <Text weight={weight} data-testid="t">
            x
          </Text>,
        );
        const el = screen.getByTestId("t").element() as HTMLElement;
        expect(el.style.getPropertyValue("--_text-weight-base")).toBe(FONT_WEIGHT[weight]);
        for (const bp of BREAKPOINTS_NON_BASE) {
          expect(el.style.getPropertyValue(`--_text-weight-${bp}`)).toBe("");
        }
      },
    );

    test("size responsive object emits one variable per specified breakpoint", async () => {
      const screen = await render(
        <Text size={{ base: "sm", md: "xl" }} data-testid="t">
          x
        </Text>,
      );
      const el = screen.getByTestId("t").element() as HTMLElement;
      expect(el.style.getPropertyValue("--_text-size-base")).toBe(SIZE_VAR.sm);
      expect(el.style.getPropertyValue("--_text-size-md")).toBe(SIZE_VAR.xl);
      expect(el.style.getPropertyValue("--_text-size-sm")).toBe("");
      expect(el.style.getPropertyValue("--_text-size-lg")).toBe("");
      expect(el.style.getPropertyValue("--_text-size-xl")).toBe("");
    });

    test("weight responsive object emits mapped numeric per specified breakpoint", async () => {
      const screen = await render(
        <Text weight={{ base: "regular", md: "bold" }} data-testid="t">
          x
        </Text>,
      );
      const el = screen.getByTestId("t").element() as HTMLElement;
      expect(el.style.getPropertyValue("--_text-weight-base")).toBe(FONT_WEIGHT.regular);
      expect(el.style.getPropertyValue("--_text-weight-md")).toBe(FONT_WEIGHT.bold);
    });

    test("full 5-breakpoint size object emits all five variables", async () => {
      const screen = await render(
        <Text size={{ base: "xs", sm: "sm", md: "md", lg: "lg", xl: "xl" }} data-testid="t">
          x
        </Text>,
      );
      const el = screen.getByTestId("t").element() as HTMLElement;
      expect(el.style.getPropertyValue("--_text-size-base")).toBe(SIZE_VAR.xs);
      expect(el.style.getPropertyValue("--_text-size-sm")).toBe(SIZE_VAR.sm);
      expect(el.style.getPropertyValue("--_text-size-md")).toBe(SIZE_VAR.md);
      expect(el.style.getPropertyValue("--_text-size-lg")).toBe(SIZE_VAR.lg);
      expect(el.style.getPropertyValue("--_text-size-xl")).toBe(SIZE_VAR.xl);
    });

    test("object without base entry emits only the specified breakpoints", async () => {
      const screen = await render(
        <Text size={{ md: "xl" }} data-testid="t">
          x
        </Text>,
      );
      const el = screen.getByTestId("t").element() as HTMLElement;
      expect(el.style.getPropertyValue("--_text-size-base")).toBe("");
      expect(el.style.getPropertyValue("--_text-size-md")).toBe(SIZE_VAR.xl);
    });

    test("combines size and weight responsive objects into one merged style", async () => {
      const screen = await render(
        <Text
          size={{ base: "sm", md: "xl" }}
          weight={{ base: "regular", md: "bold" }}
          data-testid="t"
        >
          x
        </Text>,
      );
      const el = screen.getByTestId("t").element() as HTMLElement;
      expect(el.style.getPropertyValue("--_text-size-base")).toBe(SIZE_VAR.sm);
      expect(el.style.getPropertyValue("--_text-size-md")).toBe(SIZE_VAR.xl);
      expect(el.style.getPropertyValue("--_text-weight-base")).toBe(FONT_WEIGHT.regular);
      expect(el.style.getPropertyValue("--_text-weight-md")).toBe(FONT_WEIGHT.bold);
    });

    test("caller-supplied style is preserved alongside responsive vars", async () => {
      const screen = await render(
        <Text size="lg" style={{ letterSpacing: "0.05em" }} data-testid="t">
          x
        </Text>,
      );
      const el = screen.getByTestId("t").element() as HTMLElement;
      expect(el.style.letterSpacing).toBe("0.05em");
      expect(el.style.getPropertyValue("--_text-size-base")).toBe(SIZE_VAR.lg);
    });
  });

  describe("computed styles: scalar (no responsive)", () => {
    test.for(SIZES.map((size) => ({ size, expected: FONT_SIZE_PX[size] })))(
      "size=$size scalar → font-size resolves to $expected",
      async ({ size, expected }) => {
        const screen = await render(
          <Text size={size} data-testid="t">
            {size}
          </Text>,
        );
        const el = screen.getByTestId("t").element() as HTMLElement;
        expect(getComputedStyle(el).fontSize).toBe(expected);
      },
    );

    test.for(WEIGHTS.map((weight) => ({ weight, expected: FONT_WEIGHT[weight] })))(
      "weight=$weight scalar → font-weight resolves to $expected",
      async ({ weight, expected }) => {
        const screen = await render(
          <Text weight={weight} data-testid="t">
            {weight}
          </Text>,
        );
        const el = screen.getByTestId("t").element() as HTMLElement;
        expect(getComputedStyle(el).fontWeight).toBe(expected);
      },
    );

    test("no size prop → CSS default font-size sm (14px)", async () => {
      const screen = await render(<Text data-testid="t">x</Text>);
      const el = screen.getByTestId("t").element() as HTMLElement;
      expect(getComputedStyle(el).fontSize).toBe(FONT_SIZE_PX.sm);
    });

    test("font-size tokens are rem-based: text scales with the root font-size (user preference)", async () => {
      // The px assertions above hold at the default 16px root whether the
      // tokens are rem or hardcoded px — this pins the actual point of the
      // rem scale: tracking the user's browser font-size setting.
      const screen = await render(<Text data-testid="t">x</Text>);
      const el = screen.getByTestId("t").element() as HTMLElement;
      document.documentElement.style.fontSize = "20px";
      try {
        // 0.875rem (sm) × 20px root
        expect(getComputedStyle(el).fontSize).toBe("17.5px");
      } finally {
        // Root font-size is page-global and Browser Mode shares the page per
        // file — always restore.
        document.documentElement.style.fontSize = "";
      }
    });

    test("no weight prop → font-weight resolves to normal (400) via CSS `initial` fallback", async () => {
      const screen = await render(<Text data-testid="t">x</Text>);
      const el = screen.getByTestId("t").element() as HTMLElement;
      expect(getComputedStyle(el).fontWeight).toBe("400");
    });

    test("no weight prop on <Text as='strong'> also renders normal (Text owns its own typography, not UA `<strong>`)", async () => {
      // Contract lock-in: Text is the source of truth for its own font-
      // weight. `<Text as="strong">` without `weight="bold"` renders as
      // normal — consumers who want visual bold weight in a semantic
      // strong element pair the two props explicitly. A pre-refactor
      // note left this to the UA cascade via `revert`; the current
      // contract is simpler and more predictable across browsers.
      const screen = await render(
        <Text as="strong" data-testid="t">
          strong text
        </Text>,
      );
      const el = screen.getByTestId("t").element() as HTMLElement;
      expect(getComputedStyle(el).fontWeight).toBe("400");
    });

    test("<Text as='strong' weight='bold'> renders bold (400 + 300 = the explicit combined choice)", async () => {
      const screen = await render(
        <Text as="strong" weight="bold" data-testid="t">
          strong text
        </Text>,
      );
      const el = screen.getByTestId("t").element() as HTMLElement;
      expect(getComputedStyle(el).fontWeight).toBe("700");
    });

    test("explicit weight on <Text as='strong'> overrides UA (regression: author declaration wins)", async () => {
      const screen = await render(
        <Text as="strong" weight="regular" data-testid="t">
          strong text
        </Text>,
      );
      const el = screen.getByTestId("t").element() as HTMLElement;
      expect(getComputedStyle(el).fontWeight).toBe(FONT_WEIGHT.regular);
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

    const FULL_SIZE = {
      base: "xs",
      sm: "sm",
      md: "md",
      lg: "lg",
      xl: "xl",
    } as const satisfies Record<Breakpoint, TextSize>;

    const FULL_WEIGHT = {
      base: "regular",
      sm: "medium",
      md: "semibold",
      lg: "bold",
      xl: "bold",
    } as const satisfies Record<Breakpoint, TextWeight>;

    test.for(BANDS)(
      "size={full object} in $name ($width px) → font-size resolves to $effectiveBreakpoint's px",
      async ({ width, effectiveBreakpoint }) => {
        const screen = await renderInContainerAtWidth(
          width,
          <Text size={FULL_SIZE} data-testid="t">
            x
          </Text>,
        );
        const el = screen.getByTestId("t").element() as HTMLElement;
        expect(getComputedStyle(el).fontSize).toBe(FONT_SIZE_PX[FULL_SIZE[effectiveBreakpoint]]);
      },
    );

    test.for(BANDS)(
      "weight={full object} in $name ($width px) → font-weight resolves to $effectiveBreakpoint's value",
      async ({ width, effectiveBreakpoint }) => {
        const screen = await renderInContainerAtWidth(
          width,
          <Text weight={FULL_WEIGHT} data-testid="t">
            x
          </Text>,
        );
        const el = screen.getByTestId("t").element() as HTMLElement;
        expect(getComputedStyle(el).fontWeight).toBe(FONT_WEIGHT[FULL_WEIGHT[effectiveBreakpoint]]);
      },
    );

    test("cascade fallback: size={base:'sm', md:'xl'} in sm band → base (sm) survives", async () => {
      const screen = await renderInContainerAtWidth(
        700,
        <Text size={{ base: "sm", md: "xl" }} data-testid="t">
          x
        </Text>,
      );
      const el = screen.getByTestId("t").element() as HTMLElement;
      expect(getComputedStyle(el).fontSize).toBe(FONT_SIZE_PX.sm);
    });

    test("cascade fallback: size={base:'sm', md:'xl'} above md → md (xl) wins for all wider breakpoints", async () => {
      const screen = await renderInContainerAtWidth(
        1400,
        <Text size={{ base: "sm", md: "xl" }} data-testid="t">
          x
        </Text>,
      );
      const el = screen.getByTestId("t").element() as HTMLElement;
      expect(getComputedStyle(el).fontSize).toBe(FONT_SIZE_PX.xl);
    });

    test("cascade fallback: object without base → CSS default (sm) at base breakpoint", async () => {
      const screen = await renderInContainerAtWidth(
        400,
        <Text size={{ md: "xl" }} data-testid="t">
          x
        </Text>,
      );
      const el = screen.getByTestId("t").element() as HTMLElement;
      expect(getComputedStyle(el).fontSize).toBe(FONT_SIZE_PX.sm);
    });

    test("cascade fallback: object without base → md override kicks in at md band", async () => {
      const screen = await renderInContainerAtWidth(
        900,
        <Text size={{ md: "xl" }} data-testid="t">
          x
        </Text>,
      );
      const el = screen.getByTestId("t").element() as HTMLElement;
      expect(getComputedStyle(el).fontSize).toBe(FONT_SIZE_PX.xl);
    });

    test("no responsive props inside a wide container → CSS defaults still apply (no accidental cascade)", async () => {
      const screen = await renderInContainerAtWidth(1400, <Text data-testid="t">x</Text>);
      const el = screen.getByTestId("t").element() as HTMLElement;
      expect(getComputedStyle(el).fontSize).toBe(FONT_SIZE_PX.sm);
    });
  });

  // Regression net for the responsive-prop cascade leak — see Stack.test.tsx's
  // "nested Stack does not inherit outer's per-breakpoint input vars" describe
  // for the fullest account and Text.css's @property block for the fix. Text
  // is a leaf (no container-type of its own), so BOTH outer and inner Text
  // query the wrapper's containerType directly. The leak still fires because
  // CSS custom property inheritance flows down the DOM chain regardless of
  // container-type. Nested Text is rare in practice (usually you'd use one
  // Text with a `<span>` child), but the invariant matters for any pattern
  // where a Text descendant lives inside a Text ancestor — e.g. `<Text
  // as="p"><Text as="strong">emphasis</Text></Text>`. Nested via `as="span"`
  // to keep the HTML valid (span-in-span; p-in-p would auto-close outer).
  describe("nested Text does not inherit outer's per-breakpoint input vars", () => {
    const BREAKPOINT_WIDTHS = { sm: 700, md: 900, lg: 1200, xl: 1400 } as const;

    type TextLeakAxis = keyof typeof TEXT_LEAK_TABLE;
    type TextLeakCase = {
      outerFor: (
        bp: Exclude<Breakpoint, "base">,
      ) => Partial<Omit<Parameters<typeof Text<"span">>[0], "children" | "ref" | "as">>;
      inner: Partial<Omit<Parameters<typeof Text<"span">>[0], "children" | "ref" | "as">>;
      computed: (cs: CSSStyleDeclaration) => string;
      expected: string;
    };

    const TEXT_LEAK_TABLE = {
      size: {
        outerFor: (bp) => ({ size: { base: "sm", [bp]: "xl" } }),
        inner: { size: "sm" },
        computed: (cs) => cs.fontSize,
        expected: FONT_SIZE_PX.sm,
      },
      weight: {
        outerFor: (bp) => ({ weight: { base: "regular", [bp]: "bold" } }),
        inner: { weight: "regular" },
        computed: (cs) => cs.fontWeight,
        expected: FONT_WEIGHT.regular,
      },
    } as const satisfies Record<"size" | "weight", TextLeakCase>;

    const CASES = (Object.keys(TEXT_LEAK_TABLE) as TextLeakAxis[]).flatMap((axis) =>
      BREAKPOINTS_NON_BASE.map((bp) => ({
        axis,
        bp,
        width: BREAKPOINT_WIDTHS[bp],
        ...TEXT_LEAK_TABLE[axis],
      })),
    );

    test.for(CASES)(
      "outer $axis leak at $bp does not reach inner",
      async ({ outerFor, inner, computed, expected, bp, width }) => {
        const screen = await render(
          <div style={{ containerType: "inline-size", width } as CSSProperties}>
            <Text as="span" {...outerFor(bp)} data-testid="outer">
              <Text as="span" {...inner} data-testid="inner">
                x
              </Text>
            </Text>
          </div>,
        );
        const innerEl = screen.getByTestId("inner").element() as HTMLElement;
        expect(computed(getComputedStyle(innerEl))).toBe(expected);
      },
    );
  });

  describe("Text does NOT establish its own containment context (leaf component)", () => {
    test("container-type is not `inline-size` — Text is not a container query ancestor", async () => {
      const screen = await render(<Text data-testid="t">x</Text>);
      const el = screen.getByTestId("t").element() as HTMLElement;
      // Establishing containment on a text leaf would be wasteful (extra
      // layout containment, extra query surface for descendants). Locked
      // in so an accidental copy from a layout primitive doesn't
      // silently add containment here.
      expect(getComputedStyle(el).containerType).not.toBe("inline-size");
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes on default <p> (id, data-*, aria-*)", async () => {
      const screen = await render(
        <Text id="lead" aria-describedby="hint" data-testid="t">
          x
        </Text>,
      );
      const el = screen.getByTestId("t");
      await expect.element(el).toHaveAttribute("id", "lead");
      await expect.element(el).toHaveAttribute("aria-describedby", "hint");
    });

    test("forwards htmlFor when as='label'", async () => {
      const screen = await render(
        <Text as="label" htmlFor="email" data-testid="t">
          email
        </Text>,
      );
      const el = screen.getByTestId("t").element();
      expect(el.getAttribute("for")).toBe("email");
    });
  });

  describe("a11y", () => {
    type A11yCase = { name: string; node: () => ReactElement };

    const cases: A11yCase[] = [
      ...VARIANTS.map(
        (variant): A11yCase => ({
          name: `variant=${variant} on default <p>`,
          node: () => <Text variant={variant}>the quick brown fox</Text>,
        }),
      ),
      {
        name: "as='label' associated with an <input>",
        node: () => (
          <>
            <Text as="label" htmlFor="email">
              email address
            </Text>
            <input id="email" aria-label="email address" />
          </>
        ),
      },
      {
        name: "truncated long text on <p>",
        node: () => (
          <div style={{ maxWidth: 200 }}>
            <Text truncate>this is a long line of text that will be truncated</Text>
          </div>
        ),
      },
      {
        name: "responsive size",
        node: () => <Text size={{ base: "sm", md: "xl" }}>responsive body text</Text>,
      },
      {
        name: "responsive weight",
        node: () => <Text weight={{ base: "regular", md: "bold" }}>responsive weight text</Text>,
      },
    ];

    test.for(cases)("$name → no axe violations", async ({ node }) => {
      const screen = await render(node());
      await expectNoAxeViolations(screen.container);
    });
  });
});
