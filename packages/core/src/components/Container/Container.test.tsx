import "../../styles/styles.css";

import type { ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import type { SpaceScale } from "../../utils/spacing";
import { Text } from "../Text/Text";
import { Container, type ContainerSize } from "./Container";

const SIZES = ["sm", "md", "lg", "xl", "full"] as const satisfies readonly ContainerSize[];
const PXS = ["none", "xs", "sm", "md", "lg", "xl", "2xl"] as const satisfies readonly SpaceScale[];

// Expected max-width per size, mirroring the --ps1ui-container-* tokens.
// Kept as an object (not a switch) so adding a size to `ContainerSize`
// fails the `satisfies` check below until this table is updated too.
const MAX_WIDTH_PX = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  full: null,
} as const satisfies Record<ContainerSize, number | null>;

// Expected horizontal padding per SpaceScale value, mirroring
// `--ps1ui-space-*` in tokens.css. Same `satisfies Record<SpaceScale, ...>`
// exhaustiveness net as Stack/Grid.
const PX_VALUE = {
  none: "0px",
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
} as const satisfies Record<SpaceScale, string>;

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
    test("applies default classes: base, size=lg, px=lg", async () => {
      const screen = await render(<Container data-testid="c">x</Container>);
      const el = screen.getByTestId("c").element();
      expect(el.classList.contains("ps1ui-container")).toBe(true);
      expect(el.classList.contains("ps1ui-container--size-lg")).toBe(true);
      expect(el.classList.contains("ps1ui-container--px-lg")).toBe(true);
    });

    test.for(SIZES.map((size) => ({ size })))(
      "size=$size → ps1ui-container--size-$size",
      async ({ size }) => {
        const screen = await render(
          <Container size={size} data-testid="c">
            {size}
          </Container>,
        );
        await expect.element(screen.getByTestId("c")).toHaveClass(`ps1ui-container--size-${size}`);
      },
    );

    test.for(PXS.map((px) => ({ px })))(
      "px=$px → ps1ui-container--px-$px (and no other px-* class)",
      async ({ px }) => {
        const screen = await render(
          <Container px={px} data-testid="c">
            {px}
          </Container>,
        );
        const el = screen.getByTestId("c").element();
        const pxClasses = Array.from(el.classList).filter((c) =>
          c.startsWith("ps1ui-container--px-"),
        );
        expect(pxClasses).toEqual([`ps1ui-container--px-${px}`]);
      },
    );

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <Container data-testid="c" className="extra">
          x
        </Container>,
      );
      const el = screen.getByTestId("c");
      await expect.element(el).toHaveClass("ps1ui-container");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("computed styles", () => {
    // Direct behavioural checks: class assertions above only prove the
    // modifier landed on the DOM; these prove the CSS rule the class hangs
    // off actually resolves to the expected pixel values. A future
    // accidental rename of the class or a token change silently drops
    // these; the unit-class matrix wouldn't.
    test.for(SIZES.map((size) => ({ size, expected: MAX_WIDTH_PX[size] })))(
      "size=$size → max-width resolves to expected value",
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
      "px=$px → padding-inline resolves to $expected",
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
      // Parent 800px, max-width 640px → 80px each side. Compare sides for
      // equality (centering is the actual invariant) rather than hardcoding.
      expect(cs.marginInlineStart).toBe(cs.marginInlineEnd);
      expect(parseFloat(cs.marginInlineStart)).toBeGreaterThan(0);
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

    test("forwards and preserves the style attribute", async () => {
      const screen = await render(
        <Container data-testid="c" style={{ background: "red" }}>
          x
        </Container>,
      );
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      expect(el.style.background).toContain("red");
    });
  });

  describe("a11y", () => {
    type A11yCase = { name: string; node: () => ReactElement };

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
