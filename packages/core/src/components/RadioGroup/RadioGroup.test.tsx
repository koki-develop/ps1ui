import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Radio } from "../Radio/Radio";
import { RadioGroup } from "./RadioGroup";

describe("RadioGroup", () => {
  describe("rendering", () => {
    test("renders a <div role='radiogroup'>", async () => {
      const screen = await render(
        <RadioGroup aria-label="fruit">
          <Radio value="a" aria-label="a" />
        </RadioGroup>,
      );
      const el = screen.getByRole("radiogroup", { name: "fruit" }).element();
      expect(el.tagName).toBe("DIV");
    });

    test("renders its children", async () => {
      const screen = await render(
        <RadioGroup aria-label="fruit">
          <Radio value="a" aria-label="a" />
          <Radio value="b" aria-label="b" />
        </RadioGroup>,
      );
      await expect.element(screen.getByRole("radio", { name: "a" })).toBeInTheDocument();
      await expect.element(screen.getByRole("radio", { name: "b" })).toBeInTheDocument();
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-radio-group base class", async () => {
      const screen = await render(<RadioGroup aria-label="x" />);
      await expect.element(screen.getByRole("radiogroup")).toHaveClass("ps1ui-radio-group");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(<RadioGroup aria-label="x" className="extra" />);
      const el = screen.getByRole("radiogroup");
      await expect.element(el).toHaveClass("ps1ui-radio-group");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native attributes (id, data-*, aria-*)", async () => {
      const screen = await render(
        <RadioGroup id="grp" aria-label="fruit" data-testid="grp" aria-describedby="hint" />,
      );
      const el = screen.getByRole("radiogroup");
      await expect.element(el).toHaveAttribute("id", "grp");
      await expect.element(el).toHaveAttribute("data-testid", "grp");
      await expect.element(el).toHaveAttribute("aria-describedby", "hint");
    });
  });

  describe("name", () => {
    test("auto-generates a shared name for every child radio when omitted", async () => {
      const screen = await render(
        <RadioGroup aria-label="fruit">
          <Radio value="a" aria-label="a" />
          <Radio value="b" aria-label="b" />
        </RadioGroup>,
      );
      const a = screen.getByRole("radio", { name: "a" }).element() as HTMLInputElement;
      const b = screen.getByRole("radio", { name: "b" }).element() as HTMLInputElement;
      expect(a.name).not.toBe("");
      expect(a.name).toBe(b.name);
    });

    test("uses the supplied name for every child radio", async () => {
      const screen = await render(
        <RadioGroup name="fruit" aria-label="fruit">
          <Radio value="a" aria-label="a" />
          <Radio value="b" aria-label="b" />
        </RadioGroup>,
      );
      const a = screen.getByRole("radio", { name: "a" }).element() as HTMLInputElement;
      const b = screen.getByRole("radio", { name: "b" }).element() as HTMLInputElement;
      expect(a.name).toBe("fruit");
      expect(b.name).toBe("fruit");
    });

    test("group's name overrides a per-radio name prop", async () => {
      const screen = await render(
        <RadioGroup name="fruit" aria-label="fruit">
          <Radio value="a" aria-label="a" name="ignored" />
        </RadioGroup>,
      );
      const a = screen.getByRole("radio", { name: "a" }).element() as HTMLInputElement;
      expect(a.name).toBe("fruit");
    });
  });

  describe("uncontrolled", () => {
    test("defaultValue sets which radio is initially checked", async () => {
      const screen = await render(
        <RadioGroup aria-label="fruit" defaultValue="b">
          <Radio value="a" aria-label="a" />
          <Radio value="b" aria-label="b" />
        </RadioGroup>,
      );
      const a = screen.getByRole("radio", { name: "a" }).element() as HTMLInputElement;
      const b = screen.getByRole("radio", { name: "b" }).element() as HTMLInputElement;
      expect(a.checked).toBe(false);
      expect(b.checked).toBe(true);
    });

    test("clicking a radio updates the group and unchecks the previously selected one", async () => {
      const screen = await render(
        <RadioGroup aria-label="fruit" defaultValue="a">
          <Radio value="a" aria-label="a" />
          <Radio value="b" aria-label="b" />
        </RadioGroup>,
      );
      const a = screen.getByRole("radio", { name: "a" }).element() as HTMLInputElement;
      const b = screen.getByRole("radio", { name: "b" });
      await b.click();
      expect(a.checked).toBe(false);
      expect((b.element() as HTMLInputElement).checked).toBe(true);
    });

    test("with no defaultValue, no radio is checked initially", async () => {
      const screen = await render(
        <RadioGroup aria-label="fruit">
          <Radio value="a" aria-label="a" />
          <Radio value="b" aria-label="b" />
        </RadioGroup>,
      );
      const a = screen.getByRole("radio", { name: "a" }).element() as HTMLInputElement;
      const b = screen.getByRole("radio", { name: "b" }).element() as HTMLInputElement;
      expect(a.checked).toBe(false);
      expect(b.checked).toBe(false);
    });
  });

  describe("controlled", () => {
    test("value prop drives which radio is checked and ignores clicks", async () => {
      // Frozen value: onValueChange fires but the group does not update because
      // the parent never lifts the change into props — canonical controlled test.
      const onValueChange = vi.fn();
      const screen = await render(
        <RadioGroup aria-label="fruit" value="a" onValueChange={onValueChange}>
          <Radio value="a" aria-label="a" />
          <Radio value="b" aria-label="b" />
        </RadioGroup>,
      );
      const a = screen.getByRole("radio", { name: "a" }).element() as HTMLInputElement;
      const b = screen.getByRole("radio", { name: "b" });
      expect(a.checked).toBe(true);
      await b.click();
      expect(onValueChange).toHaveBeenCalledWith("b");
      expect(a.checked).toBe(true);
      expect((b.element() as HTMLInputElement).checked).toBe(false);
    });

    test("re-renders reflect an externally lifted value", async () => {
      const Ctl = () => {
        const [v, setV] = useState("a");
        return (
          <>
            <button type="button" onClick={() => setV("b")}>
              switch
            </button>
            <RadioGroup aria-label="fruit" value={v}>
              <Radio value="a" aria-label="a" />
              <Radio value="b" aria-label="b" />
            </RadioGroup>
          </>
        );
      };
      const screen = await render(<Ctl />);
      const a = screen.getByRole("radio", { name: "a" }).element() as HTMLInputElement;
      const b = screen.getByRole("radio", { name: "b" }).element() as HTMLInputElement;
      expect(a.checked).toBe(true);
      await screen.getByRole("button", { name: "switch" }).click();
      expect(a.checked).toBe(false);
      expect(b.checked).toBe(true);
    });
  });

  describe("onValueChange", () => {
    test("fires with the newly-selected value when the user clicks a radio", async () => {
      const onValueChange = vi.fn();
      const screen = await render(
        <RadioGroup aria-label="fruit" onValueChange={onValueChange}>
          <Radio value="a" aria-label="a" />
          <Radio value="b" aria-label="b" />
        </RadioGroup>,
      );
      await screen.getByRole("radio", { name: "b" }).click();
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange).toHaveBeenLastCalledWith("b");
    });

    test("clicks still update internal state when the handler is omitted", async () => {
      const screen = await render(
        <RadioGroup aria-label="fruit">
          <Radio value="a" aria-label="a" />
        </RadioGroup>,
      );
      const a = screen.getByRole("radio", { name: "a" });
      await a.click();
      expect((a.element() as HTMLInputElement).checked).toBe(true);
    });
  });

  describe("disabled", () => {
    test("disables every child radio", async () => {
      const screen = await render(
        <RadioGroup aria-label="fruit" disabled>
          <Radio value="a" aria-label="a" />
          <Radio value="b" aria-label="b" />
        </RadioGroup>,
      );
      const a = screen.getByRole("radio", { name: "a" }).element() as HTMLInputElement;
      const b = screen.getByRole("radio", { name: "b" }).element() as HTMLInputElement;
      expect(a.disabled).toBe(true);
      expect(b.disabled).toBe(true);
    });

    test("does not disable radios when omitted", async () => {
      const screen = await render(
        <RadioGroup aria-label="fruit">
          <Radio value="a" aria-label="a" />
        </RadioGroup>,
      );
      const a = screen.getByRole("radio", { name: "a" }).element() as HTMLInputElement;
      expect(a.disabled).toBe(false);
    });

    test("a group-wide disable cannot be opted out of by a per-radio disabled={false}", async () => {
      const screen = await render(
        <RadioGroup aria-label="fruit" disabled>
          <Radio value="a" aria-label="a" disabled={false} />
        </RadioGroup>,
      );
      const a = screen.getByRole("radio", { name: "a" }).element() as HTMLInputElement;
      expect(a.disabled).toBe(true);
    });
  });

  describe("a11y", () => {
    test("radiogroup with aria-label passes axe", async () => {
      const screen = await render(
        <RadioGroup aria-label="favourite fruit">
          <Radio value="a" aria-label="apple" />
          <Radio value="b" aria-label="banana" />
        </RadioGroup>,
      );
      await expectNoAxeViolations(screen.container);
    });

    test("radiogroup with aria-labelledby passes axe", async () => {
      const screen = await render(
        <>
          <span id="grp-label">favourite fruit</span>
          <RadioGroup aria-labelledby="grp-label">
            <Radio value="a" aria-label="apple" />
            <Radio value="b" aria-label="banana" />
          </RadioGroup>
        </>,
      );
      await expectNoAxeViolations(screen.container);
    });
  });
});
