import { createRef, useState, type ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Label } from "../Label/Label";
import { Checkbox } from "./Checkbox";

type Screen = Awaited<ReturnType<typeof render>>;

describe("Checkbox", () => {
  describe("rendering", () => {
    test("renders an <input type='checkbox'>", async () => {
      const screen = await render(<Checkbox aria-label="terms" />);
      const el = screen.getByRole("checkbox", { name: "terms" }).element();
      expect(el.tagName).toBe("INPUT");
      expect(el.getAttribute("type")).toBe("checkbox");
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-checkbox base class", async () => {
      const screen = await render(<Checkbox aria-label="x" />);
      await expect.element(screen.getByRole("checkbox")).toHaveClass("ps1ui-checkbox");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(<Checkbox aria-label="x" className="extra" />);
      const el = screen.getByRole("checkbox");
      await expect.element(el).toHaveClass("ps1ui-checkbox");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes (id, name, data-*, aria-*)", async () => {
      const screen = await render(
        <Checkbox
          id="terms"
          name="terms"
          aria-label="terms"
          data-testid="cb"
          aria-describedby="hint"
        />,
      );
      const el = screen.getByRole("checkbox");
      await expect.element(el).toHaveAttribute("id", "terms");
      await expect.element(el).toHaveAttribute("name", "terms");
      await expect.element(el).toHaveAttribute("data-testid", "cb");
      await expect.element(el).toHaveAttribute("aria-describedby", "hint");
    });

    test("forwards the disabled attribute", async () => {
      const screen = await render(<Checkbox aria-label="x" disabled />);
      await expect.element(screen.getByRole("checkbox")).toBeDisabled();
    });

    test("forwards defaultChecked so the checkbox is initially checked", async () => {
      const screen = await render(<Checkbox aria-label="x" defaultChecked />);
      const el = screen.getByRole("checkbox").element() as HTMLInputElement;
      expect(el.checked).toBe(true);
    });

    test("forwards controlled checked so the checkbox reflects the prop", async () => {
      const screen = await render(<Checkbox aria-label="x" checked readOnly />);
      const el = screen.getByRole("checkbox").element() as HTMLInputElement;
      expect(el.checked).toBe(true);
    });

    test("forwards ref (RefObject) to the underlying <input>", async () => {
      const ref = createRef<HTMLInputElement>();
      await render(<Checkbox aria-label="x" ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.getAttribute("type")).toBe("checkbox");
    });

    test("forwards ref (callback) to the underlying <input>", async () => {
      const cb = vi.fn();
      await render(<Checkbox aria-label="x" ref={cb} />);
      expect(cb).toHaveBeenCalled();
      const node = cb.mock.calls[0]?.[0];
      expect(node).toBeInstanceOf(HTMLInputElement);
    });

    test("honors a React 19 cleanup-returning callback ref (cleanup runs on unmount, never called with null)", async () => {
      // A cleanup-style ref's body is written to never receive null — React 19
      // drives detachment through the returned cleanup instead. The merged ref
      // must preserve that contract, not downgrade it to a null call.
      const calls: Array<HTMLInputElement | null> = [];
      const cleanup = vi.fn();
      const screen = await render(
        <Checkbox
          aria-label="x"
          ref={(node: HTMLInputElement) => {
            calls.push(node);
            return cleanup;
          }}
        />,
      );
      expect(calls.length).toBe(1);
      expect(calls[0]).toBeInstanceOf(HTMLInputElement);
      expect(cleanup).not.toHaveBeenCalled();
      screen.unmount();
      expect(cleanup).toHaveBeenCalledTimes(1);
      // The callback itself was never re-invoked with null.
      expect(calls.length).toBe(1);
    });
  });

  describe("indeterminate", () => {
    test("sets the DOM :indeterminate state when the prop is true", async () => {
      const screen = await render(<Checkbox aria-label="x" indeterminate />);
      const el = screen.getByRole("checkbox").element() as HTMLInputElement;
      expect(el.indeterminate).toBe(true);
      expect(el.matches(":indeterminate")).toBe(true);
    });

    test("defaults to false when the prop is omitted", async () => {
      const screen = await render(<Checkbox aria-label="x" />);
      const el = screen.getByRole("checkbox").element() as HTMLInputElement;
      expect(el.indeterminate).toBe(false);
    });

    test("re-syncs the DOM property when the prop toggles", async () => {
      // Proves useLayoutEffect re-fires on dep change, not just on mount.
      const Toggle = () => {
        const [ind, setInd] = useState(true);
        return (
          <>
            <button type="button" onClick={() => setInd((v) => !v)}>
              toggle
            </button>
            <Checkbox aria-label="cb" indeterminate={ind} />
          </>
        );
      };
      const screen = await render(<Toggle />);
      const cb = screen.getByRole("checkbox").element() as HTMLInputElement;
      expect(cb.indeterminate).toBe(true);
      await screen.getByRole("button", { name: "toggle" }).click();
      expect(cb.indeterminate).toBe(false);
      await screen.getByRole("button", { name: "toggle" }).click();
      expect(cb.indeterminate).toBe(true);
    });
  });

  describe("interaction", () => {
    test("fires onChange when clicked (uncontrolled)", async () => {
      const onChange = vi.fn();
      const screen = await render(<Checkbox aria-label="x" onChange={onChange} />);
      const el = screen.getByRole("checkbox");
      await el.click();
      expect(onChange).toHaveBeenCalled();
      expect((el.element() as HTMLInputElement).checked).toBe(true);
    });

    test("toggles checked state on repeated clicks", async () => {
      const screen = await render(<Checkbox aria-label="x" />);
      const el = screen.getByRole("checkbox");
      await el.click();
      expect((el.element() as HTMLInputElement).checked).toBe(true);
      await el.click();
      expect((el.element() as HTMLInputElement).checked).toBe(false);
    });

    // Known intermittent flake on the Playwright Firefox provider only
    // (reproduced ~15-20% of full-suite runs under concurrent 3-browser
    // load, never in isolation): Firefox's native Space-activation sequence
    // for checkboxes genuinely differs from Chromium/WebKit (it fires an
    // extra DOMActivate event and reports keypress keyCode 0 instead of 32
    // — see MDN/Bugzilla discussions of Firefox checkbox Space handling),
    // and occasionally the synthesized key doesn't complete that sequence
    // in time under load. A settle-tick between focus() and keyboard() was
    // tried and made no measurable difference (see src/testing/settle.ts's
    // comment) — this isn't a render-timing gap, so there's no known fix
    // from application code. `retry: 3` absorbs the flake at the CI level
    // so the suite doesn't need a manual re-run when it lands; Chromium /
    // WebKit runs stay effectively single-shot because they never miss.
    test("Space toggles checked state when focused", { retry: 3 }, async () => {
      const screen = await render(<Checkbox aria-label="x" />);
      const el = screen.getByRole("checkbox");
      (el.element() as HTMLElement).focus();
      await userEvent.keyboard(" ");
      expect((el.element() as HTMLInputElement).checked).toBe(true);
    });

    test("clicking an associated <Label htmlFor> toggles the checkbox", async () => {
      const screen = await render(
        <>
          <Label htmlFor="agree">agree</Label>
          <Checkbox id="agree" />
        </>,
      );
      await screen.getByText("agree").click();
      const el = screen.getByRole("checkbox").element() as HTMLInputElement;
      expect(el.checked).toBe(true);
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
          <Checkbox aria-label="agree to terms" {...extra} />
        ),
      },
      {
        key: "<Label htmlFor>",
        render: (extra: Record<string, unknown>) => (
          <>
            <Label htmlFor="agree">agree to terms</Label>
            <Checkbox id="agree" {...extra} />
          </>
        ),
      },
      {
        key: "wrapped in <Label>",
        render: (extra: Record<string, unknown>) => (
          <Label>
            agree to terms
            <Checkbox {...extra} />
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
      { key: "indeterminate", props: { indeterminate: true } },
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
          (screen.getByRole("checkbox").element() as HTMLElement).focus();
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
