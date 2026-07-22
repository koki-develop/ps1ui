import { createRef, type ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Label } from "../Label/Label";
import { RadioGroup } from "../RadioGroup/RadioGroup";
import { Radio } from "./Radio";

type Screen = Awaited<ReturnType<typeof render>>;

describe("Radio", () => {
  describe("rendering", () => {
    test("renders an <input type='radio'>", async () => {
      const screen = await render(<Radio aria-label="pick" />);
      const el = screen.getByRole("radio", { name: "pick" }).element();
      expect(el.tagName).toBe("INPUT");
      expect(el.getAttribute("type")).toBe("radio");
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-radio base class", async () => {
      const screen = await render(<Radio aria-label="x" />);
      await expect.element(screen.getByRole("radio")).toHaveClass("ps1ui-radio");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(<Radio aria-label="x" className="extra" />);
      const el = screen.getByRole("radio");
      await expect.element(el).toHaveClass("ps1ui-radio");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes (id, name, value, data-*, aria-*)", async () => {
      const screen = await render(
        <Radio
          id="pick-a"
          name="pick"
          value="a"
          aria-label="pick a"
          data-testid="r"
          aria-describedby="hint"
        />,
      );
      const el = screen.getByRole("radio");
      await expect.element(el).toHaveAttribute("id", "pick-a");
      await expect.element(el).toHaveAttribute("name", "pick");
      await expect.element(el).toHaveAttribute("value", "a");
      await expect.element(el).toHaveAttribute("data-testid", "r");
      await expect.element(el).toHaveAttribute("aria-describedby", "hint");
    });

    test("forwards the disabled attribute", async () => {
      const screen = await render(<Radio aria-label="x" disabled />);
      await expect.element(screen.getByRole("radio")).toBeDisabled();
    });

    test("forwards defaultChecked so the radio is initially checked", async () => {
      const screen = await render(<Radio aria-label="x" defaultChecked />);
      const el = screen.getByRole("radio").element() as HTMLInputElement;
      expect(el.checked).toBe(true);
    });

    test("forwards controlled checked so the radio reflects the prop", async () => {
      const screen = await render(<Radio aria-label="x" checked readOnly />);
      const el = screen.getByRole("radio").element() as HTMLInputElement;
      expect(el.checked).toBe(true);
    });

    test("forwards ref (RefObject) to the underlying <input>", async () => {
      const ref = createRef<HTMLInputElement>();
      await render(<Radio aria-label="x" ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.getAttribute("type")).toBe("radio");
    });
  });

  describe("interaction", () => {
    test("fires onChange when clicked (uncontrolled, standalone)", async () => {
      const onChange = vi.fn();
      const screen = await render(<Radio aria-label="x" onChange={onChange} />);
      const el = screen.getByRole("radio");
      await el.click();
      expect(onChange).toHaveBeenCalled();
      expect((el.element() as HTMLInputElement).checked).toBe(true);
    });

    // Known intermittent flake on the Playwright Firefox provider only — same
    // shape as Checkbox's Space test. See its long comment for the full account.
    test("Space toggles checked state when focused", { retry: 3 }, async () => {
      const screen = await render(<Radio aria-label="x" />);
      const el = screen.getByRole("radio");
      (el.element() as HTMLElement).focus();
      await userEvent.keyboard(" ");
      expect((el.element() as HTMLInputElement).checked).toBe(true);
    });

    test("clicking an associated <Label htmlFor> toggles the radio", async () => {
      const screen = await render(
        <>
          <Label htmlFor="pick">pick</Label>
          <Radio id="pick" />
        </>,
      );
      await screen.getByText("pick").click();
      const el = screen.getByRole("radio").element() as HTMLInputElement;
      expect(el.checked).toBe(true);
    });

    test("mutually-exclusive selection within a shared name group (native browser behavior)", async () => {
      const screen = await render(
        <>
          <Radio value="a" name="pair" aria-label="a" />
          <Radio value="b" name="pair" aria-label="b" />
        </>,
      );
      const a = screen.getByRole("radio", { name: "a" });
      const b = screen.getByRole("radio", { name: "b" });
      await a.click();
      expect((a.element() as HTMLInputElement).checked).toBe(true);
      expect((b.element() as HTMLInputElement).checked).toBe(false);
      await b.click();
      expect((a.element() as HTMLInputElement).checked).toBe(false);
      expect((b.element() as HTMLInputElement).checked).toBe(true);
    });
  });

  describe("inside RadioGroup", () => {
    test("takes its name attribute from the group", async () => {
      const screen = await render(
        <RadioGroup aria-label="fruit" name="fruit">
          <Radio value="a" aria-label="a" />
        </RadioGroup>,
      );
      const el = screen.getByRole("radio").element() as HTMLInputElement;
      expect(el.name).toBe("fruit");
    });

    test("checked state derives from group value === this radio's value", async () => {
      const screen = await render(
        <RadioGroup aria-label="fruit" value="b">
          <Radio value="a" aria-label="a" />
          <Radio value="b" aria-label="b" />
        </RadioGroup>,
      );
      const a = screen.getByRole("radio", { name: "a" }).element() as HTMLInputElement;
      const b = screen.getByRole("radio", { name: "b" }).element() as HTMLInputElement;
      expect(a.checked).toBe(false);
      expect(b.checked).toBe(true);
    });

    test("radio without a value stays unchecked when the group's value is undefined", async () => {
      const screen = await render(
        <RadioGroup aria-label="x">
          <Radio aria-label="valueless" />
        </RadioGroup>,
      );
      const el = screen.getByRole("radio").element() as HTMLInputElement;
      expect(el.checked).toBe(false);
    });

    test("group's disable propagates when the per-radio disabled is not set", async () => {
      const screen = await render(
        <RadioGroup aria-label="x" disabled>
          <Radio value="a" aria-label="a" />
        </RadioGroup>,
      );
      const el = screen.getByRole("radio").element() as HTMLInputElement;
      expect(el.disabled).toBe(true);
    });

    test("per-radio disable still opts in when the group is enabled", async () => {
      const screen = await render(
        <RadioGroup aria-label="x">
          <Radio value="a" aria-label="a" disabled />
          <Radio value="b" aria-label="b" />
        </RadioGroup>,
      );
      const a = screen.getByRole("radio", { name: "a" }).element() as HTMLInputElement;
      const b = screen.getByRole("radio", { name: "b" }).element() as HTMLInputElement;
      expect(a.disabled).toBe(true);
      expect(b.disabled).toBe(false);
    });

    test("caller's onChange still fires alongside the group handler", async () => {
      const onChange = vi.fn();
      const onValueChange = vi.fn();
      const screen = await render(
        <RadioGroup aria-label="x" onValueChange={onValueChange}>
          <Radio value="a" aria-label="a" onChange={onChange} />
        </RadioGroup>,
      );
      await screen.getByRole("radio", { name: "a" }).click();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenCalledWith("a");
    });

    test("caller's onChange can preventDefault to stop the group's update", async () => {
      // Escape hatch: the caller inspects the event and, if it should not be
      // propagated to the group, calls preventDefault() — proving the "group
      // handler runs only when the caller's handler didn't preventDefault"
      // branch in Radio.
      const onValueChange = vi.fn();
      const screen = await render(
        <RadioGroup aria-label="x" onValueChange={onValueChange}>
          <Radio value="a" aria-label="a" onChange={(e) => e.preventDefault()} />
        </RadioGroup>,
      );
      await screen.getByRole("radio", { name: "a" }).click();
      expect(onValueChange).not.toHaveBeenCalled();
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
        render: (extra: Record<string, unknown>) => (
          <Radio aria-label="apple" value="a" {...extra} />
        ),
      },
      {
        key: "<Label htmlFor>",
        render: (extra: Record<string, unknown>) => (
          <>
            <Label htmlFor="apple">apple</Label>
            <Radio id="apple" value="a" {...extra} />
          </>
        ),
      },
      {
        key: "wrapped in <Label>",
        render: (extra: Record<string, unknown>) => (
          <Label>
            apple
            <Radio value="a" {...extra} />
          </Label>
        ),
      },
    ] as const;

    const states = [
      { key: "default", props: {} },
      { key: "checked", props: { defaultChecked: true } },
      { key: "disabled", props: { disabled: true } },
      { key: "disabled + checked", props: { disabled: true, defaultChecked: true } },
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
          (screen.getByRole("radio").element() as HTMLElement).focus();
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
