import { createRef, type ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Label } from "../Label/Label";
import { Switch } from "./Switch";

type Screen = Awaited<ReturnType<typeof render>>;

describe("Switch", () => {
  describe("rendering", () => {
    test("renders an <input type='checkbox'> exposed as a switch", async () => {
      const screen = await render(<Switch aria-label="notifications" />);
      const el = screen.getByRole("switch", { name: "notifications" }).element();
      expect(el.tagName).toBe("INPUT");
      expect(el.getAttribute("type")).toBe("checkbox");
      expect(el.getAttribute("role")).toBe("switch");
    });

    test("is NOT exposed as a checkbox — the role replaces the implicit one", async () => {
      // The whole point of the role: assistive tech announces on/off, not
      // checked/unchecked. If a refactor dropped role="switch" the component
      // would still look and behave identically, and only this assertion
      // would notice.
      const screen = await render(<Switch aria-label="notifications" />);
      expect(screen.getByRole("checkbox").query()).toBeNull();
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-switch base class", async () => {
      const screen = await render(<Switch aria-label="x" />);
      await expect.element(screen.getByRole("switch")).toHaveClass("ps1ui-switch");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(<Switch aria-label="x" className="extra" />);
      const el = screen.getByRole("switch");
      await expect.element(el).toHaveClass("ps1ui-switch");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes (id, name, data-*, aria-*)", async () => {
      const screen = await render(
        <Switch
          id="notifications"
          name="notifications"
          aria-label="notifications"
          data-testid="sw"
          aria-describedby="hint"
        />,
      );
      const el = screen.getByRole("switch");
      await expect.element(el).toHaveAttribute("id", "notifications");
      await expect.element(el).toHaveAttribute("name", "notifications");
      await expect.element(el).toHaveAttribute("data-testid", "sw");
      await expect.element(el).toHaveAttribute("aria-describedby", "hint");
    });

    test("forwards the disabled attribute", async () => {
      const screen = await render(<Switch aria-label="x" disabled />);
      await expect.element(screen.getByRole("switch")).toBeDisabled();
    });

    test("forwards defaultChecked so the switch starts on", async () => {
      const screen = await render(<Switch aria-label="x" defaultChecked />);
      const el = screen.getByRole("switch").element() as HTMLInputElement;
      expect(el.checked).toBe(true);
    });

    test("forwards controlled checked so the switch reflects the prop", async () => {
      const screen = await render(<Switch aria-label="x" checked readOnly />);
      const el = screen.getByRole("switch").element() as HTMLInputElement;
      expect(el.checked).toBe(true);
    });

    test("forwards ref (RefObject) to the underlying <input>", async () => {
      const ref = createRef<HTMLInputElement>();
      await render(<Switch aria-label="x" ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.getAttribute("type")).toBe("checkbox");
    });

    test("forwards ref (callback) to the underlying <input>", async () => {
      const cb = vi.fn();
      await render(<Switch aria-label="x" ref={cb} />);
      expect(cb).toHaveBeenCalled();
      const node = cb.mock.calls[0]?.[0];
      expect(node).toBeInstanceOf(HTMLInputElement);
    });

    test("participates in form submission with its name and value", async () => {
      // The reason the underlying element is a native checkbox rather than a
      // <button aria-pressed> (see Switch.tsx's header): the control's state
      // reaches FormData for free. An `on` switch contributes its value; an
      // `off` one contributes nothing, per the HTML checkbox rules.
      const screen = await render(
        <form data-testid="sw-form">
          <Switch aria-label="notifications" name="notifications" value="enabled" defaultChecked />
          <Switch aria-label="beta" name="beta" value="enabled" />
        </form>,
      );
      const form = screen.getByTestId("sw-form").element() as HTMLFormElement;
      const data = new FormData(form);
      expect(data.get("notifications")).toBe("enabled");
      expect(data.get("beta")).toBeNull();
    });
  });

  describe("interaction", () => {
    test("fires onChange when clicked (uncontrolled)", async () => {
      const onChange = vi.fn();
      const screen = await render(<Switch aria-label="x" onChange={onChange} />);
      const el = screen.getByRole("switch");
      await el.click();
      expect(onChange).toHaveBeenCalled();
      expect((el.element() as HTMLInputElement).checked).toBe(true);
    });

    test("toggles on and back off across repeated clicks", async () => {
      const screen = await render(<Switch aria-label="x" />);
      const el = screen.getByRole("switch");
      await el.click();
      expect((el.element() as HTMLInputElement).checked).toBe(true);
      await el.click();
      expect((el.element() as HTMLInputElement).checked).toBe(false);
    });

    test("exposes the on/off state to assistive tech as the role's checked state", async () => {
      // Native `checked` maps onto the switch role's aria-checked without any
      // attribute of ours — the role query is what proves that mapping holds.
      const screen = await render(<Switch aria-label="notifications" />);
      await expect.element(screen.getByRole("switch", { checked: false })).toBeInTheDocument();
      await screen.getByRole("switch").click();
      await expect.element(screen.getByRole("switch", { checked: true })).toBeInTheDocument();
    });

    // Same known Firefox flake as Checkbox's Space test — the full account
    // (why it is not fixable from application code, and why `retry: 3` is the
    // right containment) lives in Checkbox.test.tsx.
    test("Space toggles the switch when focused", { retry: 3 }, async () => {
      const screen = await render(<Switch aria-label="x" />);
      const el = screen.getByRole("switch");
      (el.element() as HTMLElement).focus();
      await userEvent.keyboard(" ");
      expect((el.element() as HTMLInputElement).checked).toBe(true);
    });

    test("clicking an associated <Label htmlFor> toggles the switch", async () => {
      const screen = await render(
        <>
          <Label htmlFor="notifications">notifications</Label>
          <Switch id="notifications" />
        </>,
      );
      await screen.getByText("notifications").click();
      const el = screen.getByRole("switch").element() as HTMLInputElement;
      expect(el.checked).toBe(true);
    });

    test("does not toggle when disabled", async () => {
      const onChange = vi.fn();
      const screen = await render(<Switch aria-label="x" disabled onChange={onChange} />);
      const el = screen.getByRole("switch").element() as HTMLInputElement;
      // A raw DOM click, not the locator's: Playwright's actionability check
      // would just time out on a disabled control, and what's under test is
      // that the activation behavior itself is skipped.
      el.click();
      expect(onChange).not.toHaveBeenCalled();
      expect(el.checked).toBe(false);
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
          <Switch aria-label="enable notifications" {...extra} />
        ),
      },
      {
        key: "<Label htmlFor>",
        render: (extra: Record<string, unknown>) => (
          <>
            <Label htmlFor="notifications">enable notifications</Label>
            <Switch id="notifications" {...extra} />
          </>
        ),
      },
      {
        key: "wrapped in <Label>",
        render: (extra: Record<string, unknown>) => (
          <Label>
            enable notifications
            <Switch {...extra} />
          </Label>
        ),
      },
    ] as const;

    const states = [
      { key: "off", props: {} },
      { key: "on", props: { defaultChecked: true } },
      { key: "disabled", props: { disabled: true } },
      { key: "disabled + on", props: { disabled: true, defaultChecked: true } },
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
          (screen.getByRole("switch").element() as HTMLElement).focus();
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
