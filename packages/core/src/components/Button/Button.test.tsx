import { userEvent } from "vitest/browser";
import type { ReactElement } from "react";
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
    ]);

    test.for(cases)("$name → no axe violations", async ({ node, interact }) => {
      const screen = await render(node());
      if (interact) await interact(screen);
      await expectNoAxeViolations(screen.container);
    });
  });
});
