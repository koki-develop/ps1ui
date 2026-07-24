import type { MouseEvent as ReactMouseEvent, ReactElement, ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Badge, type BadgeColor, type BadgeVariant } from "./Badge";

type Screen = Awaited<ReturnType<typeof render>>;

const VARIANTS = ["solid", "outline", "subtle"] as const satisfies readonly BadgeVariant[];
const COLORS = ["primary", "accent", "danger", "muted"] as const satisfies readonly BadgeColor[];

describe("Badge", () => {
  describe("rendering", () => {
    test("renders a <span> element with the given children", async () => {
      const screen = await render(<Badge data-testid="badge">new</Badge>);
      const badge = screen.getByTestId("badge").element();
      expect(badge.tagName).toBe("SPAN");
      expect(badge.textContent).toBe("new");
    });

    test("renders a <button> when as='button' is passed, exposing the button role", async () => {
      const screen = await render(<Badge as="button">apply filter</Badge>);
      await expect.element(screen.getByRole("button", { name: "apply filter" })).toBeVisible();
    });

    test("renders an <a> when as='a' is passed, exposing the link role", async () => {
      const screen = await render(
        <Badge as="a" href="/tags/react">
          react
        </Badge>,
      );
      const link = screen.getByRole("link", { name: "react" });
      await expect.element(link).toBeVisible();
      await expect.element(link).toHaveAttribute("href", "/tags/react");
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
        <Badge as={RouterLink} href="/tag" color="accent">
          routed
        </Badge>,
      );
      const link = screen.getByRole("link", { name: "routed" });
      await expect.element(link).toHaveAttribute("data-router", "1");
      await expect.element(link).toHaveAttribute("href", "/tag");
      await expect.element(link).toHaveClass("ps1ui-badge");
      await expect.element(link).toHaveClass("ps1ui-badge--accent");
    });

    test("renders the leading slot before children with the __leading class", async () => {
      const screen = await render(
        <Badge leading={<span data-testid="icon">*</span>} data-testid="badge">
          new
        </Badge>,
      );
      const badge = screen.getByTestId("badge").element();
      // First child must be the leading wrapper — order matters for a "leading"
      // slot; if this ever flipped, an icon would render after the label text.
      const firstChild = badge.firstElementChild;
      expect(firstChild).not.toBeNull();
      expect(firstChild?.classList.contains("ps1ui-badge__leading")).toBe(true);
      expect(firstChild?.querySelector('[data-testid="icon"]')).not.toBeNull();
      expect(badge.textContent).toBe("*new");
    });

    test("omits the leading wrapper entirely when leading is not provided", async () => {
      const screen = await render(<Badge data-testid="badge">only</Badge>);
      const badge = screen.getByTestId("badge").element();
      expect(badge.querySelector(".ps1ui-badge__leading")).toBeNull();
    });
  });

  describe("class composition", () => {
    test.for([
      { variant: undefined, applied: "subtle" as const, label: "(default)" },
      ...VARIANTS.map((v) => ({ variant: v, applied: v, label: v })),
    ])("variant=$variant → ps1ui-badge--$applied", async ({ variant, applied, label }) => {
      const screen = await render(
        <Badge variant={variant} data-testid="badge">
          {label}
        </Badge>,
      );
      const badge = screen.getByTestId("badge");
      await expect.element(badge).toHaveClass("ps1ui-badge");
      await expect.element(badge).toHaveClass(`ps1ui-badge--${applied}`);
    });

    test.for([
      { color: undefined, applied: "primary" as const, label: "(default)" },
      ...COLORS.map((c) => ({ color: c, applied: c, label: c })),
    ])("color=$color → ps1ui-badge--$applied", async ({ color, applied, label }) => {
      const screen = await render(
        <Badge color={color} data-testid="badge">
          {label}
        </Badge>,
      );
      const badge = screen.getByTestId("badge");
      await expect.element(badge).toHaveClass("ps1ui-badge");
      await expect.element(badge).toHaveClass(`ps1ui-badge--${applied}`);
    });

    test("emits exactly one ps1ui-badge--<variant> class per render", async () => {
      // Guards against a future refactor that appends multiple variant classes
      // (e.g. an unremoved default alongside an explicit override) — the CSS
      // background / border rules would collide unpredictably.
      const screen = await render(
        <Badge variant="outline" data-testid="badge">
          x
        </Badge>,
      );
      const badge = screen.getByTestId("badge").element();
      const variantClasses = Array.from(badge.classList).filter((c) =>
        VARIANTS.some((v) => c === `ps1ui-badge--${v}`),
      );
      expect(variantClasses).toEqual(["ps1ui-badge--outline"]);
    });

    test("emits exactly one ps1ui-badge--<color> class per render", async () => {
      const screen = await render(
        <Badge color="danger" data-testid="badge">
          x
        </Badge>,
      );
      const badge = screen.getByTestId("badge").element();
      const colorClasses = Array.from(badge.classList).filter((c) =>
        COLORS.some((k) => c === `ps1ui-badge--${k}`),
      );
      expect(colorClasses).toEqual(["ps1ui-badge--danger"]);
    });

    test("merges caller-supplied className without dropping the base classes", async () => {
      const screen = await render(
        <Badge className="extra" data-testid="badge">
          merged
        </Badge>,
      );
      const badge = screen.getByTestId("badge");
      await expect.element(badge).toHaveClass("ps1ui-badge");
      await expect.element(badge).toHaveClass("ps1ui-badge--subtle");
      await expect.element(badge).toHaveClass("ps1ui-badge--primary");
      await expect.element(badge).toHaveClass("extra");
    });

    test("applies the same variant and color classes when rendered as a button", async () => {
      const screen = await render(
        <Badge as="button" variant="solid" color="danger">
          delete
        </Badge>,
      );
      const btn = screen.getByRole("button");
      await expect.element(btn).toHaveClass("ps1ui-badge");
      await expect.element(btn).toHaveClass("ps1ui-badge--solid");
      await expect.element(btn).toHaveClass("ps1ui-badge--danger");
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes onto the <span> (id, data-*, aria-*, title)", async () => {
      const screen = await render(
        <Badge id="tag-react" data-testid="badge" aria-label="react tag" title="framework">
          react
        </Badge>,
      );
      const badge = screen.getByTestId("badge");
      await expect.element(badge).toHaveAttribute("id", "tag-react");
      await expect.element(badge).toHaveAttribute("aria-label", "react tag");
      await expect.element(badge).toHaveAttribute("title", "framework");
    });

    test("forwards the disabled attribute onto the underlying <button>", async () => {
      const screen = await render(
        <Badge as="button" disabled>
          x
        </Badge>,
      );
      await expect.element(screen.getByRole("button")).toBeDisabled();
    });

    test("forwards anchor-only attributes verbatim when as='a' (href, target, rel)", async () => {
      const screen = await render(
        <Badge as="a" href="https://example.com" target="_blank" rel="noopener noreferrer">
          x
        </Badge>,
      );
      const link = screen.getByRole("link");
      await expect.element(link).toHaveAttribute("href", "https://example.com");
      await expect.element(link).toHaveAttribute("target", "_blank");
      await expect.element(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    test("forwards aria-disabled onto an as='a' badge (anchors ignore :disabled)", async () => {
      // <a> is not form-associated and ignores the disabled attribute /
      // :disabled pseudo-class. Consumers signal an unavailable link via
      // aria-disabled; Badge's CSS matches [aria-disabled="true"] so the
      // visual (opacity, cursor: not-allowed) tracks the ARIA state.
      const screen = await render(
        <Badge as="a" href="/x" aria-disabled="true">
          unavailable
        </Badge>,
      );
      await expect.element(screen.getByRole("link")).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("interaction", () => {
    test("fires onClick when the interactive badge is clicked (as='button')", async () => {
      const onClick = vi.fn();
      const screen = await render(
        <Badge as="button" onClick={onClick}>
          filter
        </Badge>,
      );
      await screen.getByRole("button").click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    // `retry: 3` absorbs the Playwright Firefox provider's intermittent
    // key-synthesis flake — same pattern as Button/Checkbox's Space/Enter
    // tests; see Checkbox.test.tsx's "Space toggles checked state when
    // focused" for the fullest account. Chromium / WebKit runs stay
    // effectively single-shot because they never miss.
    test.for([
      { label: "Enter", key: "{Enter}" },
      { label: "Space", key: " " },
    ])(
      "fires onClick when $label is pressed on a focused button badge",
      { retry: 3 },
      async ({ key }) => {
        const onClick = vi.fn();
        const screen = await render(
          <Badge as="button" onClick={onClick}>
            filter
          </Badge>,
        );
        const btn = screen.getByRole("button");
        (btn.element() as HTMLElement).focus();
        await userEvent.keyboard(key);
        expect(onClick).toHaveBeenCalledTimes(1);
      },
    );

    test("fires onClick when the interactive badge is clicked (as='a')", async () => {
      const onClick = vi.fn((event: ReactMouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
      });
      const screen = await render(
        <Badge as="a" href="/x" onClick={onClick}>
          tag
        </Badge>,
      );
      await screen.getByRole("link").click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("a11y", () => {
    type A11yCase = {
      name: string;
      node: () => ReactElement;
      interact?: (screen: Screen) => Promise<void>;
    };

    const cases: A11yCase[] = [
      // Static display badge — every (variant × color) tuple. Semantic-a11y only
      // here (CSS not loaded), so color-contrast is not evaluated — that surface
      // is covered by Badge.contrast.test.tsx.
      ...VARIANTS.flatMap((variant): A11yCase[] =>
        COLORS.map((color) => ({
          name: `${variant} / ${color}`,
          node: () => (
            <Badge variant={variant} color={color}>
              label
            </Badge>
          ),
        })),
      ),
      // Interactive badges — role/name/ARIA-state coverage across the
      // polymorphic switch. Color is fixed to primary because axe here has
      // no CSS loaded (so color-contrast is not evaluated) and the semantic
      // surface is identical across colours by construction — a per-colour
      // expansion would run 16 near-duplicate axe passes with no distinct
      // failure mode. Contrast per (variant × color) is covered by
      // Badge.contrast.test.tsx.
      {
        name: "button / default",
        node: () => <Badge as="button">action</Badge>,
      },
      {
        name: "button / disabled (native)",
        node: () => (
          <Badge as="button" disabled>
            action
          </Badge>
        ),
      },
      {
        name: "button / focused",
        node: () => <Badge as="button">action</Badge>,
        interact: async (screen) => {
          (screen.getByRole("button").element() as HTMLElement).focus();
        },
      },
      {
        name: "link / default",
        node: () => (
          <Badge as="a" href="/tag">
            tag
          </Badge>
        ),
      },
      // aria-disabled anchor: <a> ignores :disabled, so the badge signals
      // "unavailable" via aria-disabled. Axe should still accept it (aria
      // state is a real disabled affordance for assistive tech even though
      // the DOM cannot enforce click prevention).
      {
        name: "link / aria-disabled",
        node: () => (
          <Badge as="a" href="/tag" aria-disabled="true">
            tag
          </Badge>
        ),
      },
      // Leading slot: the wrapper element itself is presentational; adding it
      // must not introduce an interactive descendant that breaks link/button
      // semantics.
      {
        name: "leading slot with icon",
        node: () => <Badge leading={<span aria-hidden="true">*</span>}>label</Badge>,
      },
    ];

    test.for(cases)("$name → no axe violations", async ({ node, interact }) => {
      const screen = await render(node());
      if (interact) await interact(screen);
      await expectNoAxeViolations(screen.container);
    });
  });
});
