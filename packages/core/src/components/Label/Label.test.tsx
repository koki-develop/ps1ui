import type { ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { userEvent } from "vitest/browser";
import { expectNoAxeViolations } from "../../testing/axe";
import { Input } from "../Input/Input";
import { Label } from "./Label";

describe("Label", () => {
  describe("rendering", () => {
    test("renders a <label> element", async () => {
      const screen = await render(<Label data-testid="lbl">email</Label>);
      const el = screen.getByTestId("lbl").element();
      expect(el.tagName).toBe("LABEL");
    });

    test("renders its children", async () => {
      const screen = await render(<Label>email address</Label>);
      await expect.element(screen.getByText("email address")).toBeVisible();
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-label base class", async () => {
      const screen = await render(<Label data-testid="lbl">x</Label>);
      await expect.element(screen.getByTestId("lbl")).toHaveClass("ps1ui-label");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <Label data-testid="lbl" className="extra">
          x
        </Label>,
      );
      const el = screen.getByTestId("lbl");
      await expect.element(el).toHaveClass("ps1ui-label");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards htmlFor as the DOM `for` attribute", async () => {
      const screen = await render(
        <Label data-testid="lbl" htmlFor="email-input">
          email
        </Label>,
      );
      await expect.element(screen.getByTestId("lbl")).toHaveAttribute("for", "email-input");
    });

    test("forwards native attributes (id, data-*)", async () => {
      const screen = await render(
        <Label id="lbl-id" data-testid="lbl" data-custom="v">
          x
        </Label>,
      );
      const el = screen.getByTestId("lbl");
      await expect.element(el).toHaveAttribute("id", "lbl-id");
      await expect.element(el).toHaveAttribute("data-custom", "v");
    });
  });

  describe("interaction", () => {
    test("clicking the label focuses the associated input via htmlFor", async () => {
      const screen = await render(
        <>
          <Label htmlFor="email">email</Label>
          <Input id="email" />
        </>,
      );
      await userEvent.click(screen.getByText("email"));
      const input = screen.getByRole("textbox").element() as HTMLInputElement;
      expect(document.activeElement).toBe(input);
    });
  });

  describe("a11y", () => {
    type A11yCase = { name: string; node: () => ReactElement };

    const cases: A11yCase[] = [
      {
        name: "standalone label",
        node: () => <Label htmlFor="a">email</Label>,
      },
      {
        name: "label + associated Input (htmlFor)",
        node: () => (
          <>
            <Label htmlFor="b">email</Label>
            <Input id="b" />
          </>
        ),
      },
      {
        name: "label wrapping an Input (implicit association)",
        node: () => (
          <Label>
            email
            <Input />
          </Label>
        ),
      },
    ];

    test.for(cases)("$name → no axe violations", async ({ node }) => {
      const screen = await render(node());
      await expectNoAxeViolations(screen.container);
    });
  });
});
