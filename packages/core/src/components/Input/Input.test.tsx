import type { ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Input } from "./Input";

type Screen = Awaited<ReturnType<typeof render>>;

const OVERRIDE_TYPES = ["email", "password", "search", "tel", "url", "number"] as const;

describe("Input", () => {
  describe("rendering", () => {
    test("renders an <input> element", async () => {
      const screen = await render(<Input aria-label="email" />);
      await expect.element(screen.getByRole("textbox", { name: "email" })).toBeVisible();
    });

    test("defaults type='text'", async () => {
      const screen = await render(<Input aria-label="email" />);
      const el = screen.getByRole("textbox").element();
      expect(el.getAttribute("type")).toBe("text");
    });

    test.for(OVERRIDE_TYPES.map((type) => ({ type })))(
      "allows the type attribute to be overridden to '$type'",
      async ({ type }) => {
        const screen = await render(<Input aria-label="field" type={type} data-testid="inp" />);
        const el = screen.getByTestId("inp").element();
        expect(el.getAttribute("type")).toBe(type);
      },
    );
  });

  describe("class composition", () => {
    test("applies the ps1ui-input base class", async () => {
      const screen = await render(<Input aria-label="x" />);
      await expect.element(screen.getByRole("textbox")).toHaveClass("ps1ui-input");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(<Input aria-label="x" className="extra" />);
      const el = screen.getByRole("textbox");
      await expect.element(el).toHaveClass("ps1ui-input");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes (id, name, data-*, aria-*)", async () => {
      const screen = await render(
        <Input
          id="email"
          name="email"
          aria-label="email"
          data-testid="inp"
          aria-describedby="hint"
        />,
      );
      const el = screen.getByRole("textbox");
      await expect.element(el).toHaveAttribute("id", "email");
      await expect.element(el).toHaveAttribute("name", "email");
      await expect.element(el).toHaveAttribute("data-testid", "inp");
      await expect.element(el).toHaveAttribute("aria-describedby", "hint");
    });

    test("forwards the disabled attribute", async () => {
      const screen = await render(<Input aria-label="x" disabled />);
      await expect.element(screen.getByRole("textbox")).toBeDisabled();
    });

    test("forwards placeholder and defaultValue", async () => {
      const screen = await render(
        <Input aria-label="x" placeholder="you@example.com" defaultValue="hello@ps1ui.dev" />,
      );
      const el = screen.getByRole("textbox");
      await expect.element(el).toHaveAttribute("placeholder", "you@example.com");
      expect((el.element() as HTMLInputElement).value).toBe("hello@ps1ui.dev");
    });
  });

  describe("interaction", () => {
    test("fires onChange as the user types (uncontrolled)", async () => {
      const onChange = vi.fn();
      const screen = await render(<Input aria-label="x" onChange={onChange} />);
      const el = screen.getByRole("textbox");
      await el.fill("abc");
      expect(onChange).toHaveBeenCalled();
      expect((el.element() as HTMLInputElement).value).toBe("abc");
    });
  });

  describe("a11y", () => {
    type A11yCase = {
      name: string;
      node: () => ReactElement;
      interact?: (screen: Screen) => Promise<void>;
    };

    const labelStrategies = [
      {
        key: "aria-label",
        render: (extra: Record<string, unknown>) => <Input aria-label="email address" {...extra} />,
      },
      {
        key: "<label htmlFor>",
        render: (extra: Record<string, unknown>) => (
          <>
            <label htmlFor="email">email address</label>
            <Input id="email" {...extra} />
          </>
        ),
      },
    ] as const;

    const states = [
      { key: "default", props: {} },
      { key: "disabled", props: { disabled: true } },
      { key: "aria-invalid", props: { "aria-invalid": "true" } },
    ] as const;

    const staticCases: A11yCase[] = labelStrategies.flatMap((label): A11yCase[] =>
      states.map(
        (s): A11yCase => ({
          name: `${label.key} / ${s.key}`,
          node: () => label.render(s.props),
        }),
      ),
    );

    const focusedCases: A11yCase[] = labelStrategies.map(
      (label): A11yCase => ({
        name: `${label.key} / focused`,
        node: () => label.render({}),
        interact: async (screen) => {
          (screen.getByRole("textbox").element() as HTMLElement).focus();
        },
      }),
    );

    const cases: A11yCase[] = [...staticCases, ...focusedCases];

    test.for(cases)("$name → no axe violations", async ({ node, interact }) => {
      const screen = await render(node());
      if (interact) await interact(screen);
      await expectNoAxeViolations(screen.container);
    });
  });
});
