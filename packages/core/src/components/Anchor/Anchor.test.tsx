import type { MouseEvent as ReactMouseEvent, ReactElement, ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Anchor, type AnchorVariant } from "./Anchor";

type Screen = Awaited<ReturnType<typeof render>>;

const VARIANTS = ["primary", "subtle"] as const satisfies readonly AnchorVariant[];

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

    test("fires onClick when Enter is pressed on a focused link", async () => {
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

    test.for(cases)("$name → no axe violations", async ({ node, interact }) => {
      const screen = await render(node());
      if (interact) await interact(screen);
      await expectNoAxeViolations(screen.container);
    });
  });
});
