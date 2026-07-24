import "../../styles/styles.css";

import { createRef, type ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { resolveColorToken } from "../../testing/color";
import { Stack } from "../Stack/Stack";
import { Text } from "../Text/Text";
import { Divider, type DividerOrientation, type DividerVariant } from "./Divider";

const ORIENTATIONS = ["horizontal", "vertical"] as const satisfies readonly DividerOrientation[];
const VARIANTS = ["solid", "dashed", "dotted"] as const satisfies readonly DividerVariant[];

describe("Divider", () => {
  describe("rendering", () => {
    test("renders a native <hr> element", async () => {
      const screen = await render(<Divider data-testid="d" />);
      const el = screen.getByTestId("d").element();
      expect(el.tagName.toLowerCase()).toBe("hr");
    });

    test("exposes the implicit separator role", async () => {
      // <hr> has an implicit ARIA role of separator — no `role=` attribute
      // is written, but the role is queryable via the accessibility tree.
      const screen = await render(<Divider />);
      await expect.element(screen.getByRole("separator")).toBeVisible();
    });

    test("omits aria-orientation when horizontal (separator's default is horizontal)", async () => {
      // Emitting `aria-orientation="horizontal"` would duplicate the default
      // and add DOM noise. The absence is deliberate.
      const screen = await render(<Divider data-testid="d" />);
      const el = screen.getByTestId("d").element();
      expect(el.hasAttribute("aria-orientation")).toBe(false);
    });

    test("emits aria-orientation='vertical' when orientation='vertical'", async () => {
      const screen = await render(<Divider data-testid="d" orientation="vertical" />);
      await expect.element(screen.getByTestId("d")).toHaveAttribute("aria-orientation", "vertical");
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-divider base class", async () => {
      const screen = await render(<Divider data-testid="d" />);
      await expect.element(screen.getByTestId("d")).toHaveClass("ps1ui-divider");
    });

    test.for([
      { orientation: undefined, applied: "horizontal" as const, label: "(default)" },
      ...ORIENTATIONS.map((o) => ({ orientation: o, applied: o, label: o })),
    ])("orientation=$label → ps1ui-divider--$applied", async ({ orientation, applied }) => {
      const screen = await render(<Divider data-testid="d" orientation={orientation} />);
      await expect.element(screen.getByTestId("d")).toHaveClass(`ps1ui-divider--${applied}`);
    });

    test.for([
      { variant: undefined, applied: "solid" as const, label: "(default)" },
      ...VARIANTS.map((v) => ({ variant: v, applied: v, label: v })),
    ])("variant=$label → ps1ui-divider--$applied", async ({ variant, applied }) => {
      const screen = await render(<Divider data-testid="d" variant={variant} />);
      await expect.element(screen.getByTestId("d")).toHaveClass(`ps1ui-divider--${applied}`);
    });

    test("emits exactly one ps1ui-divider--<orientation> class per render", async () => {
      // Guards against a future refactor that leaves both orientation classes
      // attached (e.g. a default + an explicit override); the CSS rules for
      // horizontal / vertical target different border sides and combining
      // them would paint two visible edges.
      const screen = await render(<Divider data-testid="d" orientation="vertical" />);
      const el = screen.getByTestId("d").element();
      const orientationClasses = Array.from(el.classList).filter((c) =>
        ORIENTATIONS.some((o) => c === `ps1ui-divider--${o}`),
      );
      expect(orientationClasses).toEqual(["ps1ui-divider--vertical"]);
    });

    test("emits exactly one ps1ui-divider--<variant> class per render", async () => {
      const screen = await render(<Divider data-testid="d" variant="dashed" />);
      const el = screen.getByTestId("d").element();
      const variantClasses = Array.from(el.classList).filter((c) =>
        VARIANTS.some((v) => c === `ps1ui-divider--${v}`),
      );
      expect(variantClasses).toEqual(["ps1ui-divider--dashed"]);
    });

    test("merges caller-supplied className without dropping the base classes", async () => {
      const screen = await render(
        <Divider data-testid="d" className="extra other" orientation="vertical" variant="dotted" />,
      );
      const el = screen.getByTestId("d");
      await expect.element(el).toHaveClass("ps1ui-divider");
      await expect.element(el).toHaveClass("ps1ui-divider--vertical");
      await expect.element(el).toHaveClass("ps1ui-divider--dotted");
      await expect.element(el).toHaveClass("extra");
      await expect.element(el).toHaveClass("other");
    });
  });

  describe("computed styles", () => {
    test("horizontal paints only a top border coloured by --ps1ui-color-border", async () => {
      // Sit the divider inside a fixed-width container so the 100 % rule has
      // something to fill — otherwise the flex-item default (auto width) makes
      // the assertion depend on the tester viewport.
      const screen = await render(
        <div style={{ width: 200 }}>
          <Divider data-testid="d" />
        </div>,
      );
      const el = screen.getByTestId("d").element() as HTMLElement;
      const computed = getComputedStyle(el);
      expect(computed.borderTopWidth).toBe("1px");
      expect(computed.borderRightWidth).toBe("0px");
      expect(computed.borderBottomWidth).toBe("0px");
      expect(computed.borderLeftWidth).toBe("0px");
      expect(computed.borderTopColor).toBe(resolveColorToken("--ps1ui-color-border"));
      expect(el.clientWidth).toBe(200);
    });

    test("vertical paints only a left border and takes width 0 at rest", async () => {
      const screen = await render(<Divider data-testid="d" orientation="vertical" />);
      const el = screen.getByTestId("d").element() as HTMLElement;
      const computed = getComputedStyle(el);
      expect(computed.borderLeftWidth).toBe("1px");
      expect(computed.borderTopWidth).toBe("0px");
      expect(computed.borderRightWidth).toBe("0px");
      expect(computed.borderBottomWidth).toBe("0px");
      expect(computed.borderLeftColor).toBe(resolveColorToken("--ps1ui-color-border"));
    });

    // Every (orientation × variant) tuple must resolve to the correct
    // border-style on the SIDE the orientation actually paints. Testing only
    // the horizontal border-top would let a future per-orientation CSS split
    // (e.g. `.ps1ui-divider--horizontal.ps1ui-divider--dashed { … }` alongside
    // a removed base --dashed rule) silently render vertical dashed / dotted
    // dividers as solid. Each row asserts the painted side directly.
    const STYLE_CASES = ORIENTATIONS.flatMap((orientation) =>
      VARIANTS.map((variant) => ({
        orientation,
        variant,
        side: orientation === "horizontal" ? ("Top" as const) : ("Left" as const),
      })),
    );
    test.for(STYLE_CASES)(
      "orientation=$orientation / variant=$variant → border-$side-style: $variant",
      async ({ orientation, variant, side }) => {
        const screen = await render(
          <Divider data-testid="d" orientation={orientation} variant={variant} />,
        );
        const el = screen.getByTestId("d").element() as HTMLElement;
        // Index into computed style by the painted side — "Top" for horizontal,
        // "Left" for vertical. The other three sides have 0-width borders so
        // their border-style is not observable.
        const styleKey = `border${side}Style` as const;
        expect(getComputedStyle(el)[styleKey]).toBe(variant);
      },
    );

    test("vertical divider inside a flex row stretches to the row's cross-axis height", async () => {
      // Real-world usage: a toolbar with icons separated by vertical rules.
      // The flex row's cross-axis height (60 px here) must drive the rule's
      // height via `align-self: stretch`. Without that declaration, the rule
      // would collapse to 0 px because <hr>'s intrinsic height is 0.
      const screen = await render(
        <div style={{ display: "flex", height: 60 }}>
          <span>left</span>
          <Divider data-testid="d" orientation="vertical" />
          <span>right</span>
        </div>,
      );
      const el = screen.getByTestId("d").element() as HTMLElement;
      // The border width contributes to the box's rendered height; the
      // outer height must match the flex row's height exactly.
      expect(el.getBoundingClientRect().height).toBe(60);
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes (id, data-*, aria-*, title)", async () => {
      const screen = await render(
        <Divider
          id="sect-break"
          data-testid="d"
          data-custom="v"
          aria-label="section break"
          title="between sections"
        />,
      );
      const el = screen.getByTestId("d");
      await expect.element(el).toHaveAttribute("id", "sect-break");
      await expect.element(el).toHaveAttribute("data-custom", "v");
      await expect.element(el).toHaveAttribute("aria-label", "section break");
      await expect.element(el).toHaveAttribute("title", "between sections");
    });

    test("forwards the style attribute alongside the component's own classes", async () => {
      const screen = await render(<Divider data-testid="d" style={{ opacity: "0.5" }} />);
      const el = screen.getByTestId("d").element() as HTMLElement;
      expect(el.style.opacity).toBe("0.5");
      expect(el.classList.contains("ps1ui-divider")).toBe(true);
    });

    test("forwards ref (RefObject) to the underlying <hr>", async () => {
      const ref = createRef<HTMLHRElement>();
      await render(<Divider ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLElement);
      expect(ref.current?.tagName.toLowerCase()).toBe("hr");
    });

    test("caller-supplied aria-orientation wins over the orientation-derived default", async () => {
      // The component sets aria-orientation from `orientation`, but a caller
      // that needs a stronger override (e.g. tracking a live orientation
      // switch outside the prop model) must be able to write it directly.
      // The passthrough pattern places `aria-orientation` before `...rest`,
      // so the caller's value wins.
      const screen = await render(
        <Divider data-testid="d" orientation="vertical" aria-orientation="horizontal" />,
      );
      await expect
        .element(screen.getByTestId("d"))
        .toHaveAttribute("aria-orientation", "horizontal");
    });
  });

  describe("a11y", () => {
    type A11yCase = { name: string; node: () => ReactElement };

    const cases: A11yCase[] = [
      { name: "horizontal / solid (default)", node: () => <Divider /> },
      {
        name: "vertical / dashed",
        node: () => <Divider orientation="vertical" variant="dashed" />,
      },
      {
        name: "horizontal between two Text blocks",
        node: () => (
          <div>
            <Text>Section one.</Text>
            <Divider />
            <Text>Section two.</Text>
          </div>
        ),
      },
      {
        name: "vertical inside a horizontal Stack toolbar",
        node: () => (
          <Stack direction="row" gap="sm" align="center">
            <Text>left</Text>
            <Divider orientation="vertical" />
            <Text>right</Text>
          </Stack>
        ),
      },
      {
        name: "with a descriptive aria-label",
        node: () => <Divider aria-label="end of intro" />,
      },
    ];

    test.for(cases)("$name → no axe violations", async ({ node }) => {
      const screen = await render(node());
      await expectNoAxeViolations(screen.container);
    });
  });
});
