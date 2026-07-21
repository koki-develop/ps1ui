import type { ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Textarea } from "./Textarea";

type Screen = Awaited<ReturnType<typeof render>>;

describe("Textarea", () => {
  describe("rendering", () => {
    test("renders a <textarea> element", async () => {
      const screen = await render(<Textarea aria-label="notes" />);
      await expect.element(screen.getByRole("textbox", { name: "notes" })).toBeVisible();
    });

    test("renders as a TEXTAREA tag (not an input)", async () => {
      const screen = await render(<Textarea aria-label="notes" />);
      const el = screen.getByRole("textbox").element();
      expect(el.tagName).toBe("TEXTAREA");
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-textarea base class", async () => {
      const screen = await render(<Textarea aria-label="x" />);
      await expect.element(screen.getByRole("textbox")).toHaveClass("ps1ui-textarea");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(<Textarea aria-label="x" className="extra" />);
      const el = screen.getByRole("textbox");
      await expect.element(el).toHaveClass("ps1ui-textarea");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes (id, name, data-*, aria-*)", async () => {
      const screen = await render(
        <Textarea
          id="notes"
          name="notes"
          aria-label="notes"
          data-testid="ta"
          aria-describedby="hint"
        />,
      );
      const el = screen.getByRole("textbox");
      await expect.element(el).toHaveAttribute("id", "notes");
      await expect.element(el).toHaveAttribute("name", "notes");
      await expect.element(el).toHaveAttribute("data-testid", "ta");
      await expect.element(el).toHaveAttribute("aria-describedby", "hint");
    });

    test("forwards the disabled attribute", async () => {
      const screen = await render(<Textarea aria-label="x" disabled />);
      await expect.element(screen.getByRole("textbox")).toBeDisabled();
    });

    test("forwards placeholder and defaultValue", async () => {
      const screen = await render(
        <Textarea aria-label="x" placeholder="write here" defaultValue="hello" />,
      );
      const el = screen.getByRole("textbox");
      await expect.element(el).toHaveAttribute("placeholder", "write here");
      expect((el.element() as HTMLTextAreaElement).value).toBe("hello");
    });

    test("forwards rows and cols", async () => {
      const screen = await render(<Textarea aria-label="x" rows={8} cols={40} />);
      const el = screen.getByRole("textbox");
      await expect.element(el).toHaveAttribute("rows", "8");
      await expect.element(el).toHaveAttribute("cols", "40");
    });
  });

  describe("interaction", () => {
    test("fires onChange as the user types (uncontrolled)", async () => {
      const onChange = vi.fn();
      const screen = await render(<Textarea aria-label="x" onChange={onChange} />);
      const el = screen.getByRole("textbox");
      await el.fill("abc");
      expect(onChange).toHaveBeenCalled();
      expect((el.element() as HTMLTextAreaElement).value).toBe("abc");
    });

    test("accepts multi-line input with embedded newlines", async () => {
      const screen = await render(<Textarea aria-label="x" defaultValue={"line 1\nline 2"} />);
      const el = screen.getByRole("textbox");
      expect((el.element() as HTMLTextAreaElement).value).toBe("line 1\nline 2");
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
        render: (extra: Record<string, unknown>) => <Textarea aria-label="notes" {...extra} />,
      },
      {
        key: "<label htmlFor>",
        render: (extra: Record<string, unknown>) => (
          <>
            <label htmlFor="notes">notes</label>
            <Textarea id="notes" {...extra} />
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
