// styles.css is loaded here (unlike most unit test files) because Anchor's
// `size` prop resolves entirely in CSS — through a custom-property cascade
// and @container queries — so the only meaningful assertions are computed
// ones. Colour contrast now also enters axe's reach in this file; that is
// covered on purpose by Anchor.contrast.test.tsx against explicit bg /
// surface tokens, and the cases here inherit the ambient page canvas.
import "../../styles/styles.css";

import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactElement, ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { withPseudoState } from "../../testing/pseudo-state";
import type { Breakpoint } from "../../utils/responsive";
import { Anchor, type AnchorSize, type AnchorVariant } from "./Anchor";

type Screen = Awaited<ReturnType<typeof render>>;

const VARIANTS = ["primary", "subtle"] as const satisfies readonly AnchorVariant[];

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const satisfies readonly AnchorSize[];

const BREAKPOINTS_NON_BASE = ["sm", "md", "lg", "xl"] as const satisfies readonly Exclude<
  Breakpoint,
  "base"
>[];

// Expected computed font-size per token: the rem values of
// --ps1ui-font-size-* in tokens.css resolved at the test browser's default
// 16px root. Kept as a table (same reason as Text.test.tsx) so a font-size
// token drift trips these tests, not just a class rename.
const FONT_SIZE_PX = {
  xs: "12px",
  sm: "14px",
  md: "16px",
  lg: "18px",
  xl: "22px",
} as const satisfies Record<AnchorSize, string>;

// Expected CSS var value Anchor emits into inline style for a given size
// prop entry. Mirrors fontSizeToVar() in utils/typography.ts.
const SIZE_VAR = {
  xs: "var(--ps1ui-font-size-xs)",
  sm: "var(--ps1ui-font-size-sm)",
  md: "var(--ps1ui-font-size-md)",
  lg: "var(--ps1ui-font-size-lg)",
  xl: "var(--ps1ui-font-size-xl)",
} as const satisfies Record<AnchorSize, string>;

// Renders a UI tree inside a fixed-width `container-type: inline-size` wrapper
// so Anchor's `@container` queries match against the wrapper.
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

describe("Anchor", () => {
  describe("rendering", () => {
    test("renders an <a> element with the given children", async () => {
      const screen = await render(<Anchor href="/x">link text</Anchor>);
      await expect.element(screen.getByRole("link", { name: "link text" })).toBeVisible();
    });

    test("forwards the href attribute", async () => {
      const screen = await render(<Anchor href="/path">x</Anchor>);
      await expect.element(screen.getByRole("link")).toHaveAttribute("href", "/path");
    });

    test("renders the component supplied via `as` (e.g. a router Link)", async () => {
      type RouterLinkProps = {
        children: ReactNode;
        className?: string;
        href: string;
      };
      // Synthetic stand-in for React Router / Next.js Link: same shape, no dependency.
      const RouterLink = ({ children, className, href }: RouterLinkProps) => (
        <a className={className} data-router="1" href={href}>
          {children}
        </a>
      );
      const screen = await render(
        <Anchor as={RouterLink} href="/routed">
          routed link
        </Anchor>,
      );
      const link = screen.getByRole("link", { name: "routed link" });
      await expect.element(link).toHaveAttribute("data-router", "1");
      await expect.element(link).toHaveAttribute("href", "/routed");
      await expect.element(link).toHaveClass("ps1ui-anchor");
      await expect.element(link).toHaveClass("ps1ui-anchor--primary");
    });
  });

  describe("class composition", () => {
    test.for([
      { variant: undefined, applied: "primary" as const, label: "(default)" },
      ...VARIANTS.map((v) => ({ variant: v, applied: v, label: v })),
    ])("variant=$variant → ps1ui-anchor--$applied", async ({ variant, applied, label }) => {
      const screen = await render(
        <Anchor variant={variant} href="/x">
          {label}
        </Anchor>,
      );
      const link = screen.getByRole("link", { name: label });
      await expect.element(link).toHaveClass("ps1ui-anchor");
      await expect.element(link).toHaveClass(`ps1ui-anchor--${applied}`);
    });

    test("merges caller-supplied className without dropping the base classes", async () => {
      const screen = await render(
        <Anchor href="/x" className="extra">
          merged
        </Anchor>,
      );
      const link = screen.getByRole("link");
      await expect.element(link).toHaveClass("ps1ui-anchor");
      await expect.element(link).toHaveClass("ps1ui-anchor--primary");
      await expect.element(link).toHaveClass("extra");
    });

    test("size emits no modifier class — it travels as a CSS variable", async () => {
      // `size` is responsive, so it cannot be class-based: the effective
      // value depends on the container width at paint time. Variant stays
      // class-based (a discrete, non-responsive axis).
      const screen = await render(
        <Anchor href="/x" size="xl">
          x
        </Anchor>,
      );
      const link = screen.getByRole("link").element();
      for (const cls of Array.from(link.classList)) {
        expect(cls).not.toMatch(/^ps1ui-anchor--size-/);
      }
    });
  });

  describe("inline style CSS variables", () => {
    test("no size prop → no --_anchor-size-* variables are emitted", async () => {
      const screen = await render(<Anchor href="/x">x</Anchor>);
      const link = screen.getByRole("link").element() as HTMLElement;
      const styleAttr = link.getAttribute("style") ?? "";
      expect(styleAttr).not.toMatch(/--_anchor-size-/);
    });

    test.for(SIZES.map((size) => ({ size })))(
      "size=$size scalar → --_anchor-size-base is emitted",
      async ({ size }) => {
        const screen = await render(
          <Anchor href="/x" size={size}>
            x
          </Anchor>,
        );
        const link = screen.getByRole("link").element() as HTMLElement;
        expect(link.style.getPropertyValue("--_anchor-size-base")).toBe(SIZE_VAR[size]);
        for (const bp of BREAKPOINTS_NON_BASE) {
          expect(link.style.getPropertyValue(`--_anchor-size-${bp}`)).toBe("");
        }
      },
    );

    test("responsive object emits one variable per specified breakpoint", async () => {
      const screen = await render(
        <Anchor href="/x" size={{ base: "xs", md: "lg" }}>
          x
        </Anchor>,
      );
      const link = screen.getByRole("link").element() as HTMLElement;
      expect(link.style.getPropertyValue("--_anchor-size-base")).toBe(SIZE_VAR.xs);
      expect(link.style.getPropertyValue("--_anchor-size-md")).toBe(SIZE_VAR.lg);
      expect(link.style.getPropertyValue("--_anchor-size-sm")).toBe("");
      expect(link.style.getPropertyValue("--_anchor-size-lg")).toBe("");
      expect(link.style.getPropertyValue("--_anchor-size-xl")).toBe("");
    });

    test("full 5-breakpoint object emits all five variables", async () => {
      const screen = await render(
        <Anchor href="/x" size={{ base: "xs", sm: "sm", md: "md", lg: "lg", xl: "xl" }}>
          x
        </Anchor>,
      );
      const link = screen.getByRole("link").element() as HTMLElement;
      expect(link.style.getPropertyValue("--_anchor-size-base")).toBe(SIZE_VAR.xs);
      expect(link.style.getPropertyValue("--_anchor-size-sm")).toBe(SIZE_VAR.sm);
      expect(link.style.getPropertyValue("--_anchor-size-md")).toBe(SIZE_VAR.md);
      expect(link.style.getPropertyValue("--_anchor-size-lg")).toBe(SIZE_VAR.lg);
      expect(link.style.getPropertyValue("--_anchor-size-xl")).toBe(SIZE_VAR.xl);
    });

    test("object without base entry emits only the specified breakpoints", async () => {
      const screen = await render(
        <Anchor href="/x" size={{ md: "lg" }}>
          x
        </Anchor>,
      );
      const link = screen.getByRole("link").element() as HTMLElement;
      expect(link.style.getPropertyValue("--_anchor-size-base")).toBe("");
      expect(link.style.getPropertyValue("--_anchor-size-md")).toBe(SIZE_VAR.lg);
    });

    test("caller-supplied style is preserved alongside the size variable", async () => {
      const screen = await render(
        <Anchor href="/x" size="lg" style={{ letterSpacing: "0.05em" }}>
          x
        </Anchor>,
      );
      const link = screen.getByRole("link").element() as HTMLElement;
      expect(link.style.letterSpacing).toBe("0.05em");
      expect(link.style.getPropertyValue("--_anchor-size-base")).toBe(SIZE_VAR.lg);
    });

    test("the size variable reaches a component rendered via `as`", async () => {
      // The polymorphic path builds its props object the same way, but it is
      // the only path where `style` lands on a caller-owned component rather
      // than a host element — worth pinning that it still forwards.
      type RouterLinkProps = { children: ReactNode; className?: string; style?: CSSProperties };
      const RouterLink = ({ children, className, style }: RouterLinkProps) => (
        <a className={className} href="/routed" style={style}>
          {children}
        </a>
      );
      const screen = await render(
        <Anchor as={RouterLink} size="xl">
          routed
        </Anchor>,
      );
      const link = screen.getByRole("link").element() as HTMLElement;
      expect(link.style.getPropertyValue("--_anchor-size-base")).toBe(SIZE_VAR.xl);
      expect(getComputedStyle(link).fontSize).toBe(FONT_SIZE_PX.xl);
    });
  });

  describe("computed styles: size (scalar)", () => {
    test.for(SIZES.map((size) => ({ size, expected: FONT_SIZE_PX[size] })))(
      "size=$size scalar → font-size resolves to $expected",
      async ({ size, expected }) => {
        const screen = await render(
          <Anchor href="/x" size={size}>
            {size}
          </Anchor>,
        );
        const link = screen.getByRole("link").element() as HTMLElement;
        expect(getComputedStyle(link).fontSize).toBe(expected);
      },
    );

    test("no size prop → font-size is inherited from the surrounding text", async () => {
      // The whole point of Anchor having no default size: a link inside
      // running text must read at the text's size. Anchor.css declares
      // `font-size: var(--_size)` with a guaranteed-invalid fallback, which
      // is invalid at computed-value time and therefore computes to the
      // inherited value. A 30px ancestor makes that indistinguishable from
      // the alternative failure mode (`initial` → the 16px medium default).
      const screen = await render(
        <div style={{ fontSize: "30px" }}>
          <Anchor href="/x">x</Anchor>
        </div>,
      );
      const link = screen.getByRole("link").element() as HTMLElement;
      expect(getComputedStyle(link).fontSize).toBe("30px");
    });

    test("an explicit size wins over the inherited font-size", async () => {
      const screen = await render(
        <div style={{ fontSize: "30px" }}>
          <Anchor href="/x" size="xs">
            x
          </Anchor>
        </div>,
      );
      const link = screen.getByRole("link").element() as HTMLElement;
      expect(getComputedStyle(link).fontSize).toBe(FONT_SIZE_PX.xs);
    });

    test("font-size tokens are rem-based: links scale with the root font-size (user preference)", async () => {
      const screen = await render(
        <Anchor href="/x" size="sm">
          x
        </Anchor>,
      );
      const link = screen.getByRole("link").element() as HTMLElement;
      document.documentElement.style.fontSize = "20px";
      try {
        // 0.875rem (sm) × 20px root
        expect(getComputedStyle(link).fontSize).toBe("17.5px");
      } finally {
        // Root font-size is page-global and Browser Mode shares the page per
        // file — always restore.
        document.documentElement.style.fontSize = "";
      }
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
    } as const satisfies Record<Breakpoint, AnchorSize>;

    test.for(BANDS)(
      "size={full object} in $name ($width px) → font-size resolves to $effectiveBreakpoint's px",
      async ({ width, effectiveBreakpoint }) => {
        const screen = await renderInContainerAtWidth(
          width,
          <Anchor href="/x" size={FULL_SIZE}>
            x
          </Anchor>,
        );
        const link = screen.getByRole("link").element() as HTMLElement;
        expect(getComputedStyle(link).fontSize).toBe(FONT_SIZE_PX[FULL_SIZE[effectiveBreakpoint]]);
      },
    );

    test("cascade fallback: size={base:'xs', md:'lg'} in sm band → base (xs) survives", async () => {
      const screen = await renderInContainerAtWidth(
        700,
        <Anchor href="/x" size={{ base: "xs", md: "lg" }}>
          x
        </Anchor>,
      );
      const link = screen.getByRole("link").element() as HTMLElement;
      expect(getComputedStyle(link).fontSize).toBe(FONT_SIZE_PX.xs);
    });

    test("cascade fallback: size={base:'xs', md:'lg'} above md → md (lg) wins for all wider breakpoints", async () => {
      const screen = await renderInContainerAtWidth(
        1400,
        <Anchor href="/x" size={{ base: "xs", md: "lg" }}>
          x
        </Anchor>,
      );
      const link = screen.getByRole("link").element() as HTMLElement;
      expect(getComputedStyle(link).fontSize).toBe(FONT_SIZE_PX.lg);
    });

    test("cascade fallback: object without base → inherited size at the base breakpoint", async () => {
      // No base entry means no default kicks in either — the "no size prop"
      // contract holds per breakpoint, not just for a wholly omitted prop.
      const screen = await renderInContainerAtWidth(
        400,
        <div style={{ fontSize: "30px" }}>
          <Anchor href="/x" size={{ md: "lg" }}>
            x
          </Anchor>
        </div>,
      );
      const link = screen.getByRole("link").element() as HTMLElement;
      expect(getComputedStyle(link).fontSize).toBe("30px");
    });

    test("cascade fallback: object without base → md override kicks in at md band", async () => {
      const screen = await renderInContainerAtWidth(
        900,
        <div style={{ fontSize: "30px" }}>
          <Anchor href="/x" size={{ md: "lg" }}>
            x
          </Anchor>
        </div>,
      );
      const link = screen.getByRole("link").element() as HTMLElement;
      expect(getComputedStyle(link).fontSize).toBe(FONT_SIZE_PX.lg);
    });

    test("no size prop inside a wide container → still inherited (no accidental cascade)", async () => {
      const screen = await renderInContainerAtWidth(
        1400,
        <div style={{ fontSize: "30px" }}>
          <Anchor href="/x">x</Anchor>
        </div>,
      );
      const link = screen.getByRole("link").element() as HTMLElement;
      expect(getComputedStyle(link).fontSize).toBe("30px");
    });
  });

  // Regression net for the responsive-prop cascade leak — see Stack.test.tsx's
  // "nested Stack does not inherit outer's per-breakpoint input vars" describe
  // for the fullest account and Anchor.css's @property block for the fix.
  // Anchor is a leaf (no container-type of its own), so BOTH outer and inner
  // query the wrapper's containerType directly; the leak still fires because
  // custom property inheritance flows down the DOM chain regardless. The
  // inner Anchor renders `as="span"` — an <a> inside an <a> is invalid HTML,
  // and `as` is the supported way to keep a ps1ui-styled link fragment inside
  // another link (an icon or badge segment, say).
  describe("nested Anchor does not inherit outer's per-breakpoint input vars", () => {
    const BREAKPOINT_WIDTHS = { sm: 700, md: 900, lg: 1200, xl: 1400 } as const;

    type AnchorLeakAxis = keyof typeof ANCHOR_LEAK_TABLE;
    type AnchorLeakCase = {
      outerFor: (
        bp: Exclude<Breakpoint, "base">,
      ) => Partial<Omit<Parameters<typeof Anchor<"a">>[0], "children" | "ref" | "as">>;
      inner: Partial<Omit<Parameters<typeof Anchor<"span">>[0], "children" | "ref" | "as">>;
      computed: (cs: CSSStyleDeclaration) => string;
      expected: string;
    };

    const ANCHOR_LEAK_TABLE = {
      size: {
        outerFor: (bp) => ({ size: { base: "xs", [bp]: "xl" } }),
        inner: { size: "xs" },
        computed: (cs) => cs.fontSize,
        expected: FONT_SIZE_PX.xs,
      },
    } as const satisfies Record<"size", AnchorLeakCase>;

    const CASES = (Object.keys(ANCHOR_LEAK_TABLE) as AnchorLeakAxis[]).flatMap((axis) =>
      BREAKPOINTS_NON_BASE.map((bp) => ({
        axis,
        bp,
        width: BREAKPOINT_WIDTHS[bp],
        ...ANCHOR_LEAK_TABLE[axis],
      })),
    );

    test.for(CASES)(
      "outer $axis leak at $bp does not reach inner",
      async ({ outerFor, inner, computed, expected, bp, width }) => {
        const screen = await render(
          <div style={{ containerType: "inline-size", width } as CSSProperties}>
            <Anchor href="/x" {...outerFor(bp)} data-testid="outer">
              <Anchor as="span" {...inner} data-testid="inner">
                x
              </Anchor>
            </Anchor>
          </div>,
        );
        const innerEl = screen.getByTestId("inner").element() as HTMLElement;
        expect(computed(getComputedStyle(innerEl))).toBe(expected);
      },
    );
  });

  describe("Anchor does NOT establish its own containment context (leaf component)", () => {
    test("container-type is not `inline-size` — Anchor is not a container query ancestor", async () => {
      // Establishing containment on a link would be wasteful (extra layout
      // containment, extra query surface for descendants) and would break
      // inline fragmentation across line boxes. Locked in so an accidental
      // copy from a layout primitive doesn't silently add containment here.
      const screen = await render(<Anchor href="/x">x</Anchor>);
      const link = screen.getByRole("link").element() as HTMLElement;
      expect(getComputedStyle(link).containerType).not.toBe("inline-size");
    });
  });

  // `leading` / `trailing` turn a link into an "icon + label" row without the
  // consumer hand-rolling `display: inline-flex` — the `live ↗` / `source ↗`
  // shape every site ends up writing twice. The load-bearing part is the
  // underline: it has to move from the root to the label, because a
  // decoration propagated from a flex container paints on the blockified slot
  // too while skipping the `gap`, rendering one link as two dashes.
  describe("adornments (leading / trailing)", () => {
    describe("DOM structure", () => {
      test("leading renders in a __leading slot before the label", async () => {
        const screen = await render(
          <Anchor href="/x" leading={<span data-testid="icon">→</span>}>
            source
          </Anchor>,
        );
        const link = screen.getByRole("link").element();
        const [first, second] = Array.from(link.children);
        expect(first?.classList.contains("ps1ui-anchor__leading")).toBe(true);
        expect(first?.querySelector("[data-testid='icon']")).not.toBeNull();
        expect(second?.classList.contains("ps1ui-anchor__label")).toBe(true);
        expect(second?.textContent).toBe("source");
      });

      test("both slots render in leading → label → trailing order", async () => {
        const screen = await render(
          <Anchor href="/x" leading="→" trailing="↗">
            live
          </Anchor>,
        );
        const link = screen.getByRole("link").element();
        expect(Array.from(link.children).map((child) => child.className)).toEqual([
          "ps1ui-anchor__leading",
          "ps1ui-anchor__label",
          "ps1ui-anchor__trailing",
        ]);
      });

      test("no adornment → no wrapper elements, children stay direct", async () => {
        const screen = await render(
          <Anchor href="/x">
            read <em data-testid="em">this</em>
          </Anchor>,
        );
        const link = screen.getByRole("link").element();
        expect(link.querySelector(".ps1ui-anchor__label")).toBeNull();
        expect(link.firstElementChild?.getAttribute("data-testid")).toBe("em");
      });

      test("multi-fragment children collapse into ONE label box", async () => {
        const screen = await render(
          <Anchor href="/x" trailing="↗">
            read <em>this</em> now
          </Anchor>,
        );
        const link = screen.getByRole("link").element();
        expect(link.children.length).toBe(2);
        expect(link.querySelector(".ps1ui-anchor__label")?.textContent).toBe("read this now");
      });

      test.for([
        { label: "false (`isExternal && <Icon/>`)", node: false as const },
        { label: "null (`isExternal ? <Icon/> : null`)", node: null },
      ])("a $label adornment leaves the link an ordinary inline box", async ({ node }) => {
        // Conditionally-external links are the whole reason `trailing` exists,
        // so the false branch has to be inert: no slot, no label wrapper, and
        // critically no inline-flex — an internal link must still wrap across
        // line boxes inside running text.
        const screen = await render(<Anchor href="/x" trailing={node} />);
        const link = screen.getByRole("link").element() as HTMLElement;
        expect(link.classList.contains("ps1ui-anchor--adorned")).toBe(false);
        expect(link.querySelector(".ps1ui-anchor__label")).toBeNull();
        expect(getComputedStyle(link).display).toBe("inline");
      });

      test("the slots reach a component supplied via `as`", async () => {
        // `as` targets receive the composed content as ordinary children, so a
        // router Link renders the row exactly like the native <a> does.
        type MockLinkProps = { children: ReactNode; className?: string; href: string };
        const MockLink = ({ children, className, href }: MockLinkProps) => (
          <a className={className} data-router-link href={href}>
            {children}
          </a>
        );
        const screen = await render(
          <Anchor as={MockLink} href="/docs" trailing="↗">
            docs
          </Anchor>,
        );
        const link = screen.getByRole("link").element();
        expect(link.hasAttribute("data-router-link")).toBe(true);
        expect(link.querySelector(".ps1ui-anchor__trailing")?.textContent).toBe("↗");
      });
    });

    describe("class composition", () => {
      test("an adornment emits --adorned; its absence does not", async () => {
        const adorned = await render(
          <Anchor href="/x" trailing="↗" data-testid="adorned">
            live
          </Anchor>,
        );
        expect(
          adorned.getByTestId("adorned").element().classList.contains("ps1ui-anchor--adorned"),
        ).toBe(true);
      });

      test("a bare Anchor carries no --adorned class", async () => {
        const screen = await render(<Anchor href="/x">live</Anchor>);
        expect(screen.getByRole("link").element().classList.contains("ps1ui-anchor--adorned")).toBe(
          false,
        );
      });
    });

    describe("computed styles", () => {
      test("adorned default <a> → inline-flex, 4px gap, centred", async () => {
        const screen = await render(
          <Anchor href="/x" leading="→" data-testid="a">
            live
          </Anchor>,
        );
        const cs = getComputedStyle(screen.getByTestId("a").element() as HTMLElement);
        expect(cs.display).toBe("inline-flex");
        expect(cs.columnGap).toBe("4px");
        expect(cs.alignItems).toBe("center");
      });

      test("adorned as='span' is inline-flex too — never block-level flex", async () => {
        // `as` accepts any ElementType, and a link fragment rendered as a span
        // still has to sit inside a sentence next to other content. `flex` here
        // would break it onto its own line.
        const screen = await render(
          <Anchor as="span" leading="→" data-testid="a">
            live
          </Anchor>,
        );
        expect(getComputedStyle(screen.getByTestId("a").element() as HTMLElement).display).toBe(
          "inline-flex",
        );
      });

      test("a bare Anchor stays an inline box so it can wrap across line boxes", async () => {
        const screen = await render(<Anchor href="/x">live</Anchor>);
        const cs = getComputedStyle(screen.getByRole("link").element() as HTMLElement);
        expect(cs.display).toBe("inline");
      });

      test("the underline moves from the root to the label when adorned", async () => {
        const screen = await render(
          <Anchor href="/x" trailing="↗" data-testid="a">
            live
          </Anchor>,
        );
        const link = screen.getByTestId("a").element() as HTMLElement;
        const label = link.querySelector(".ps1ui-anchor__label") as HTMLElement;
        const slot = link.querySelector(".ps1ui-anchor__trailing") as HTMLElement;
        expect(getComputedStyle(link).textDecorationLine).toBe("none");
        expect(getComputedStyle(label).textDecorationLine).toBe("underline");
        // The icon slot must not paint one of its own either — the whole point
        // is that `↗` renders clean.
        expect(getComputedStyle(slot).textDecorationLine).toBe("none");
      });

      test("a bare Anchor still underlines on the root itself", async () => {
        const screen = await render(<Anchor href="/x">live</Anchor>);
        const link = screen.getByRole("link").element() as HTMLElement;
        expect(getComputedStyle(link).textDecorationLine).toBe("underline");
      });

      test.for(VARIANTS.map((variant) => ({ variant })))(
        "variant=$variant: the adorned label's underline colour matches the bare link's",
        async ({ variant }) => {
          // The refactor that made this possible replaced a direct
          // `text-decoration-color` declaration with the inherited
          // `--_anchor-underline` custom property. This pins that both shapes
          // resolve to the same colour, so an adorned link cannot drift.
          const screen = await render(
            <>
              <Anchor variant={variant} href="/x" data-testid="bare">
                live
              </Anchor>
              <Anchor variant={variant} href="/x" trailing="↗" data-testid="adorned">
                live
              </Anchor>
            </>,
          );
          const bare = screen.getByTestId("bare").element() as HTMLElement;
          const label = (screen.getByTestId("adorned").element() as HTMLElement).querySelector(
            ".ps1ui-anchor__label",
          ) as HTMLElement;
          expect(getComputedStyle(label).textDecorationColor).toBe(
            getComputedStyle(bare).textDecorationColor,
          );
        },
      );

      test("subtle + adorned: hovering shifts the label's underline off fg-subtle", async () => {
        // subtle is the one variant whose underline is deliberately decoupled
        // from its text colour at rest, so it is the only one where the
        // hover shift can silently stop working on the adorned shape.
        const screen = await render(
          <>
            <Anchor
              variant="subtle"
              href="/x"
              trailing="↗"
              data-testid="dec-anchor"
              style={{ transition: "none" }}
            >
              live
            </Anchor>
            <span data-testid="dec-hover" style={{ color: "var(--ps1ui-color-primary)" }} />
            <span data-testid="dec-base" style={{ color: "var(--ps1ui-color-fg-subtle)" }} />
          </>,
        );
        const label = (screen.getByTestId("dec-anchor").element() as HTMLElement).querySelector(
          ".ps1ui-anchor__label",
        ) as HTMLElement;
        const hoverColor = getComputedStyle(screen.getByTestId("dec-hover").element()).color;
        const baseColor = getComputedStyle(screen.getByTestId("dec-base").element()).color;
        expect(hoverColor).not.toBe(baseColor);
        expect(getComputedStyle(label).textDecorationColor).toBe(baseColor);

        // The label runs its own 120ms text-decoration-color transition (the
        // root's inline `transition: none` cannot reach it — `transition` is
        // not an inherited property), so the assertion has to wait for the
        // shift to land rather than sampling the first frame.
        await withPseudoState('[data-testid="dec-anchor"]', ["hover"], async () => {
          await vi.waitFor(() => {
            expect(getComputedStyle(label).textDecorationColor).toBe(hoverColor);
          });
        });
      });

      test("underline style and thickness are pinned, not inherited from an ancestor", async () => {
        // base.css resets `a { text-decoration: inherit }`, so the component
        // owns every decoration longhand explicitly. A wrapper with its own
        // dotted, thick underline must not reach through to either shape —
        // the regression this guards is dropping one longhand while reaching
        // for the `text-decoration` shorthand.
        const screen = await render(
          <div
            style={{
              textDecorationLine: "underline",
              textDecorationStyle: "dotted",
              textDecorationThickness: "4px",
            }}
          >
            <Anchor href="/x" data-testid="bare">
              live
            </Anchor>
            <Anchor href="/x" trailing="↗" data-testid="adorned">
              live
            </Anchor>
          </div>,
        );
        const bare = getComputedStyle(screen.getByTestId("bare").element() as HTMLElement);
        expect(bare.textDecorationStyle).toBe("solid");
        expect(bare.textDecorationThickness).toBe("1px");

        const label = (screen.getByTestId("adorned").element() as HTMLElement).querySelector(
          ".ps1ui-anchor__label",
        ) as HTMLElement;
        const labelCs = getComputedStyle(label);
        expect(labelCs.textDecorationStyle).toBe("solid");
        expect(labelCs.textDecorationThickness).toBe("1px");
      });

      test("slots never shrink; the label absorbs the squeeze", async () => {
        const screen = await render(
          <Anchor href="/x" leading="→" trailing="↗" data-testid="a">
            live
          </Anchor>,
        );
        const link = screen.getByTestId("a").element();
        for (const selector of [".ps1ui-anchor__leading", ".ps1ui-anchor__trailing"]) {
          const cs = getComputedStyle(link.querySelector(selector) as HTMLElement);
          expect(cs.flexGrow).toBe("0");
          expect(cs.flexShrink).toBe("0");
          expect(cs.flexBasis).toBe("auto");
        }
        expect(
          getComputedStyle(link.querySelector(".ps1ui-anchor__label") as HTMLElement).minWidth,
        ).toBe("0px");
      });

      test("size still resolves on the adorned shape", async () => {
        // `font-size` lands on the root and the label inherits it — the row
        // layout must not introduce a second sizing surface.
        const screen = await render(
          <Anchor href="/x" size="xl" trailing="↗" data-testid="a">
            live
          </Anchor>,
        );
        const link = screen.getByTestId("a").element() as HTMLElement;
        const label = link.querySelector(".ps1ui-anchor__label") as HTMLElement;
        expect(getComputedStyle(link).fontSize).toBe(FONT_SIZE_PX.xl);
        expect(getComputedStyle(label).fontSize).toBe(FONT_SIZE_PX.xl);
      });
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes verbatim (id, data-*, aria-*, download, hrefLang, target, rel)", async () => {
      const screen = await render(
        <Anchor
          href="/x"
          id="lnk"
          data-testid="anchor"
          aria-describedby="hint"
          download="file.txt"
          hrefLang="en"
          target="_blank"
          rel="noopener noreferrer"
        >
          x
        </Anchor>,
      );
      const link = screen.getByRole("link");
      await expect.element(link).toHaveAttribute("id", "lnk");
      await expect.element(link).toHaveAttribute("data-testid", "anchor");
      await expect.element(link).toHaveAttribute("aria-describedby", "hint");
      await expect.element(link).toHaveAttribute("download", "file.txt");
      await expect.element(link).toHaveAttribute("hreflang", "en");
      await expect.element(link).toHaveAttribute("target", "_blank");
      await expect.element(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    test("target='_blank' alone emits no rel — that decision is the caller's", async () => {
      const screen = await render(
        <Anchor href="/x" target="_blank">
          new tab
        </Anchor>,
      );
      const link = screen.getByRole("link");
      await expect.element(link).toHaveAttribute("target", "_blank");
      expect(link.element().hasAttribute("rel")).toBe(false);
    });

    // `ref` — polymorphic components accept it (React 19 ref-as-prop; the
    // derivation and the history behind it are documented on TextProps in
    // Text.tsx) and it lands on whatever `as` resolved to. The type side — a
    // ref typed for the wrong element is rejected — lives in
    // src/polymorphic.test-d.tsx.
    test("forwards a ref to the default <a>", async () => {
      let captured: HTMLAnchorElement | null = null;
      await render(
        <Anchor
          href="/x"
          ref={(node: HTMLAnchorElement | null) => {
            captured = node;
          }}
        >
          x
        </Anchor>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLAnchorElement).tagName.toLowerCase()).toBe("a");
    });

    test("forwards a ref to the element `as` resolved to", async () => {
      let captured: HTMLSpanElement | null = null;
      await render(
        <Anchor
          as="span"
          ref={(node: HTMLSpanElement | null) => {
            captured = node;
          }}
        >
          x
        </Anchor>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLSpanElement).tagName.toLowerCase()).toBe("span");
    });
  });

  describe("interaction", () => {
    test("fires onClick when clicked", async () => {
      const onClick = vi.fn((event: ReactMouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
      });
      const screen = await render(
        <Anchor href="/x" onClick={onClick}>
          x
        </Anchor>,
      );
      await screen.getByRole("link").click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    // `retry: 3` absorbs the Playwright Firefox provider's intermittent
    // key-synthesis flake — see Checkbox.test.tsx's "Space toggles checked
    // state when focused" comment for the fullest account. Chromium /
    // WebKit runs stay effectively single-shot because they never miss.
    test("fires onClick when Enter is pressed on a focused link", { retry: 3 }, async () => {
      const onClick = vi.fn((event: ReactMouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
      });
      const screen = await render(
        <Anchor href="/x" onClick={onClick}>
          x
        </Anchor>,
      );
      const link = screen.getByRole("link");
      (link.element() as HTMLElement).focus();
      await userEvent.keyboard("{Enter}");
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("a11y", () => {
    type A11yCase = {
      name: string;
      node: () => ReactElement;
      interact?: (screen: Screen) => Promise<void>;
    };

    const cases: A11yCase[] = VARIANTS.flatMap((variant): A11yCase[] => [
      {
        name: `${variant} / default`,
        node: () => (
          <Anchor variant={variant} href="/x">
            docs page
          </Anchor>
        ),
      },
      {
        name: `${variant} / focused`,
        node: () => (
          <Anchor variant={variant} href="/x">
            docs page
          </Anchor>
        ),
        interact: async (screen) => {
          (screen.getByRole("link").element() as HTMLElement).focus();
        },
      },
      {
        name: `${variant} / external (target=_blank + rel)`,
        node: () => (
          <Anchor
            variant={variant}
            href="https://example.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            external site
          </Anchor>
        ),
      },
    ]);

    cases.push(
      {
        name: "scalar size",
        node: () => (
          <Anchor href="/x" size="xs">
            fine print link
          </Anchor>
        ),
      },
      {
        name: "responsive size",
        node: () => (
          <Anchor href="/x" size={{ base: "xs", md: "lg" }}>
            responsive link
          </Anchor>
        ),
      },
      {
        // The accessible name must still come from the label alone — a decorative
        // icon marked aria-hidden is the documented pattern, and axe would flag
        // an unlabelled inline image or a link whose name is only a glyph.
        name: "trailing icon marked aria-hidden",
        node: () => (
          <Anchor href="https://example.com" trailing={<span aria-hidden="true">↗</span>}>
            live site
          </Anchor>
        ),
      },
      {
        name: "leading + trailing icons",
        node: () => (
          <Anchor
            href="https://example.com"
            leading={<span aria-hidden="true">→</span>}
            trailing={<span aria-hidden="true">↗</span>}
          >
            live site
          </Anchor>
        ),
      },
      {
        name: "adorned + focused",
        node: () => (
          <Anchor href="/x" trailing={<span aria-hidden="true">↗</span>}>
            live site
          </Anchor>
        ),
        interact: async (screen) => {
          (screen.getByRole("link").element() as HTMLElement).focus();
        },
      },
    );

    test.for(cases)("$name → no axe violations", async ({ node, interact }) => {
      const screen = await render(node());
      if (interact) await interact(screen);
      await expectNoAxeViolations(screen.container);
    });
  });
});
