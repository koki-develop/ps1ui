import { userEvent } from "vitest/browser";
import type { MouseEvent as ReactMouseEvent, ReactElement, ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Button, type ButtonVariant } from "./Button";

type Screen = Awaited<ReturnType<typeof render>>;

const VARIANTS = ["primary", "secondary"] as const satisfies readonly ButtonVariant[];

describe("Button", () => {
  describe("rendering", () => {
    test("renders a <button> element with the given children", async () => {
      const screen = await render(<Button>Click me</Button>);
      await expect.element(screen.getByRole("button", { name: "Click me" })).toBeVisible();
    });

    test("defaults type='button' so it never submits a form implicitly", async () => {
      const screen = await render(<Button>x</Button>);
      await expect.element(screen.getByRole("button")).toHaveAttribute("type", "button");
    });

    test("allows the type attribute to be overridden to 'submit'", async () => {
      const screen = await render(<Button type="submit">go</Button>);
      await expect.element(screen.getByRole("button")).toHaveAttribute("type", "submit");
    });

    test("renders an <a> when as='a' is passed, exposing the link role", async () => {
      const screen = await render(
        <Button as="a" href="/docs">
          read the docs
        </Button>,
      );
      const link = screen.getByRole("link", { name: "read the docs" });
      await expect.element(link).toBeVisible();
      await expect.element(link).toHaveAttribute("href", "/docs");
    });

    test("does not stamp type='button' onto the rendered <a>", async () => {
      const screen = await render(
        <Button as="a" href="/x">
          x
        </Button>,
      );
      // The `type` attribute on <a> means MIME type, not form-submit control — leaking
      // a `type="button"` default onto the anchor would be an invalid-attribute regression.
      expect(screen.getByRole("link").element().hasAttribute("type")).toBe(false);
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
        <Button as={RouterLink} href="/routed" variant="secondary">
          routed button-link
        </Button>,
      );
      const link = screen.getByRole("link", { name: "routed button-link" });
      await expect.element(link).toHaveAttribute("data-router", "1");
      await expect.element(link).toHaveAttribute("href", "/routed");
      await expect.element(link).toHaveClass("ps1ui-button");
      await expect.element(link).toHaveClass("ps1ui-button--secondary");
    });
  });

  describe("class composition", () => {
    test.for([
      { variant: undefined, applied: "primary" as const, label: "(default)" },
      ...VARIANTS.map((v) => ({ variant: v, applied: v, label: v })),
    ])("variant=$variant → ps1ui-button--$applied", async ({ variant, applied, label }) => {
      const screen = await render(<Button variant={variant}>{label}</Button>);
      const btn = screen.getByRole("button", { name: label });
      await expect.element(btn).toHaveClass("ps1ui-button");
      await expect.element(btn).toHaveClass(`ps1ui-button--${applied}`);
    });

    test("merges caller-supplied className without dropping the base classes", async () => {
      const screen = await render(<Button className="extra">merged</Button>);
      const btn = screen.getByRole("button");
      await expect.element(btn).toHaveClass("ps1ui-button");
      await expect.element(btn).toHaveClass("ps1ui-button--primary");
      await expect.element(btn).toHaveClass("extra");
    });

    test("applies the same variant classes to an as='a' link", async () => {
      const screen = await render(
        <Button as="a" href="/x" variant="secondary">
          link
        </Button>,
      );
      const link = screen.getByRole("link");
      await expect.element(link).toHaveClass("ps1ui-button");
      await expect.element(link).toHaveClass("ps1ui-button--secondary");
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes (id, name, data-*, aria-*)", async () => {
      const screen = await render(
        <Button id="save" name="save" data-testid="btn" aria-describedby="hint">
          x
        </Button>,
      );
      const btn = screen.getByRole("button");
      await expect.element(btn).toHaveAttribute("id", "save");
      await expect.element(btn).toHaveAttribute("name", "save");
      await expect.element(btn).toHaveAttribute("data-testid", "btn");
      await expect.element(btn).toHaveAttribute("aria-describedby", "hint");
    });

    test("forwards the disabled attribute to the underlying <button>", async () => {
      const screen = await render(<Button disabled>x</Button>);
      await expect.element(screen.getByRole("button")).toBeDisabled();
    });

    test("forwards anchor-only attributes verbatim when as='a' (href, target, rel, download)", async () => {
      const screen = await render(
        <Button
          as="a"
          href="https://example.com"
          target="_blank"
          rel="noopener noreferrer"
          download="file.txt"
        >
          x
        </Button>,
      );
      const link = screen.getByRole("link");
      await expect.element(link).toHaveAttribute("href", "https://example.com");
      await expect.element(link).toHaveAttribute("target", "_blank");
      await expect.element(link).toHaveAttribute("rel", "noopener noreferrer");
      await expect.element(link).toHaveAttribute("download", "file.txt");
    });
  });

  describe("interaction", () => {
    test("fires onClick when clicked", async () => {
      const onClick = vi.fn();
      const screen = await render(<Button onClick={onClick}>x</Button>);
      await screen.getByRole("button").click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test.for([
      { label: "Enter", key: "{Enter}" },
      // "Space" is a known intermittent flake on the Playwright Firefox
      // provider only — see Checkbox.test.tsx's "Space toggles checked
      // state when focused" comment for the same, unfixed-from-our-side
      // Firefox Space-activation event-sequence quirk.
      { label: "Space", key: " " },
    ])("fires onClick when $label is pressed on a focused button", async ({ key }) => {
      const onClick = vi.fn();
      const screen = await render(<Button onClick={onClick}>x</Button>);
      const btn = screen.getByRole("button");
      (btn.element() as HTMLElement).focus();
      await userEvent.keyboard(key);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test("fires onClick when as='a' is clicked", async () => {
      const onClick = vi.fn((event: ReactMouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
      });
      const screen = await render(
        <Button as="a" href="/x" onClick={onClick}>
          x
        </Button>,
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

    const cases: A11yCase[] = VARIANTS.flatMap((variant): A11yCase[] => [
      {
        name: `${variant} / default`,
        node: () => <Button variant={variant}>label</Button>,
      },
      {
        name: `${variant} / disabled`,
        node: () => (
          <Button variant={variant} disabled>
            label
          </Button>
        ),
      },
      {
        name: `${variant} / focused`,
        node: () => <Button variant={variant}>label</Button>,
        interact: async (screen) => {
          (screen.getByRole("button").element() as HTMLElement).focus();
        },
      },
      {
        name: `${variant} / after click (toggle)`,
        node: () => (
          <Button variant={variant} aria-pressed="false">
            toggle
          </Button>
        ),
        interact: async (screen) => {
          await screen.getByRole("button").click();
        },
      },
      {
        name: `${variant} / as='a' link`,
        node: () => (
          <Button as="a" href="/docs" variant={variant}>
            label
          </Button>
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
