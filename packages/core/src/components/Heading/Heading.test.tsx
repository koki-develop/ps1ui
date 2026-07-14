import type { ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
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

    test.for(LEVELS.map((level) => ({ level })))(
      "level=$level applies its default size and weight classes",
      async ({ level }) => {
        const screen = await render(
          <Heading level={level} data-testid="h">
            {`level-${level}`}
          </Heading>,
        );
        const el = screen.getByTestId("h");
        const { size, weight } = EXPECTED_DEFAULTS[level];
        await expect.element(el).toHaveClass(`ps1ui-heading--size-${size}`);
        await expect.element(el).toHaveClass(`ps1ui-heading--weight-${weight}`);
      },
    );

    test.for(SIZES.map((size) => ({ size })))(
      "size=$size overrides the level default",
      async ({ size }) => {
        const screen = await render(
          <Heading level={1} size={size} data-testid="h">
            {`size-${size}`}
          </Heading>,
        );
        const el = screen.getByTestId("h").element();
        const sizeClasses = Array.from(el.classList).filter((c) =>
          c.startsWith("ps1ui-heading--size-"),
        );
        expect(sizeClasses).toEqual([`ps1ui-heading--size-${size}`]);
      },
    );

    test.for(WEIGHTS.map((weight) => ({ weight })))(
      "weight=$weight overrides the level default",
      async ({ weight }) => {
        const screen = await render(
          <Heading level={1} weight={weight} data-testid="h">
            {`weight-${weight}`}
          </Heading>,
        );
        const el = screen.getByTestId("h").element();
        const weightClasses = Array.from(el.classList).filter((c) =>
          c.startsWith("ps1ui-heading--weight-"),
        );
        expect(weightClasses).toEqual([`ps1ui-heading--weight-${weight}`]);
      },
    );

    test("size / weight overrides keep only the caller-provided classes (no default leaks)", async () => {
      const screen = await render(
        <Heading level={1} size="sm" weight="regular" data-testid="h">
          overridden
        </Heading>,
      );
      const el = screen.getByTestId("h").element();
      const sizeClasses = Array.from(el.classList).filter((c) =>
        c.startsWith("ps1ui-heading--size-"),
      );
      const weightClasses = Array.from(el.classList).filter((c) =>
        c.startsWith("ps1ui-heading--weight-"),
      );
      expect(sizeClasses).toEqual(["ps1ui-heading--size-sm"]);
      expect(weightClasses).toEqual(["ps1ui-heading--weight-regular"]);
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <Heading level={1} className="extra" data-testid="h">
          x
        </Heading>,
      );
      const el = screen.getByTestId("h");
      await expect.element(el).toHaveClass("ps1ui-heading");
      await expect.element(el).toHaveClass("extra");
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

    test("forwards inline style", async () => {
      const screen = await render(
        <Heading level={1} style={{ letterSpacing: "0.1em" }} data-testid="h">
          x
        </Heading>,
      );
      const el = screen.getByTestId("h").element() as HTMLElement;
      expect(el.style.letterSpacing).toBe("0.1em");
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
        // heading-order guard — h1 down to h6 in strict order must not violate the rule.
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
        // Semantic vs visual split — level stays semantically valid while as tweaks the rendered
        // tag. Using level to preserve h1→h2→h3 order regardless of as would defeat the point,
        // so this case demonstrates the correct pattern: as follows the semantic hierarchy while
        // the visual size defaults to what the level implies.
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
