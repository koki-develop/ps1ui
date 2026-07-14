import type { ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
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
    test("applies default classes: ps1ui-text, variant=body, size=sm, no weight class", async () => {
      const screen = await render(<Text data-testid="t">default</Text>);
      const el = screen.getByTestId("t").element();
      expect(el.classList.contains("ps1ui-text")).toBe(true);
      expect(el.classList.contains("ps1ui-text--body")).toBe(true);
      expect(el.classList.contains("ps1ui-text--size-sm")).toBe(true);
      expect(Array.from(el.classList).some((c) => c.startsWith("ps1ui-text--weight-"))).toBe(false);
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

    test.for(SIZES.map((size) => ({ size })))(
      "size=$size → ps1ui-text--size-$size",
      async ({ size }) => {
        const screen = await render(
          <Text size={size} data-testid="t">
            {size}
          </Text>,
        );
        await expect.element(screen.getByTestId("t")).toHaveClass(`ps1ui-text--size-${size}`);
      },
    );

    test("weight=undefined applies no ps1ui-text--weight-* class", async () => {
      const screen = await render(<Text data-testid="t">default</Text>);
      const el = screen.getByTestId("t").element();
      const weightClasses = Array.from(el.classList).filter((c) =>
        c.startsWith("ps1ui-text--weight-"),
      );
      expect(weightClasses).toHaveLength(0);
    });

    test.for(WEIGHTS.map((weight) => ({ weight })))(
      "weight=$weight → ps1ui-text--weight-$weight",
      async ({ weight }) => {
        const screen = await render(
          <Text weight={weight} data-testid="t">
            {weight}
          </Text>,
        );
        const el = screen.getByTestId("t").element();
        const weightClasses = Array.from(el.classList).filter((c) =>
          c.startsWith("ps1ui-text--weight-"),
        );
        expect(weightClasses).toEqual([`ps1ui-text--weight-${weight}`]);
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
        <Text className="extra" data-testid="t">
          x
        </Text>,
      );
      const el = screen.getByTestId("t");
      await expect.element(el).toHaveClass("ps1ui-text");
      await expect.element(el).toHaveClass("extra");
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
    ];

    test.for(cases)("$name → no axe violations", async ({ node }) => {
      const screen = await render(node());
      await expectNoAxeViolations(screen.container);
    });
  });
});
