import type { ReactElement } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Button } from "../Button/Button";
import { Text } from "../Text/Text";
import { Card } from "./Card";

describe("Card", () => {
  describe("rendering", () => {
    test("renders a <div> with the given children", async () => {
      const screen = await render(<Card data-testid="c">content</Card>);
      const el = screen.getByTestId("c").element();
      expect(el.tagName.toLowerCase()).toBe("div");
      expect(el.textContent).toContain("content");
    });

    test("has no default role (leaves semantics to the caller)", async () => {
      const screen = await render(<Card data-testid="c">x</Card>);
      const el = screen.getByTestId("c").element();
      expect(el.getAttribute("role")).toBeNull();
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-card base class", async () => {
      const screen = await render(<Card data-testid="c">x</Card>);
      await expect.element(screen.getByTestId("c")).toHaveClass("ps1ui-card");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <Card data-testid="c" className="extra">
          x
        </Card>,
      );
      const el = screen.getByTestId("c");
      await expect.element(el).toHaveClass("ps1ui-card");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native <div> attributes (id, role, aria-labelledby, data-*)", async () => {
      const screen = await render(
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- exercises Card's role passthrough; Card is intentionally a bare <div>.
        <Card id="panel" role="region" aria-labelledby="panel-title" data-testid="c">
          <h2 id="panel-title">Title</h2>
        </Card>,
      );
      const el = screen.getByTestId("c");
      await expect.element(el).toHaveAttribute("id", "panel");
      await expect.element(el).toHaveAttribute("role", "region");
      await expect.element(el).toHaveAttribute("aria-labelledby", "panel-title");
    });

    test("forwards the style attribute", async () => {
      const screen = await render(
        <Card data-testid="c" style={{ maxWidth: 200 }}>
          x
        </Card>,
      );
      const el = screen.getByTestId("c").element() as HTMLDivElement;
      expect(el.style.maxWidth).toBe("200px");
    });
  });

  describe("a11y", () => {
    type A11yCase = { name: string; node: () => ReactElement };

    const cases: A11yCase[] = [
      {
        name: "wrapping plain text",
        node: () => <Card>content</Card>,
      },
      {
        name: "wrapping body Text",
        node: () => (
          <Card>
            <Text>a line of body copy</Text>
          </Card>
        ),
      },
      {
        name: "wrapping subtle Text (previously failing contrast case)",
        node: () => (
          <Card>
            <Text variant="subtle">a line of subtle copy</Text>
          </Card>
        ),
      },
      {
        name: "wrapping the Default story shape (Text + Buttons)",
        node: () => (
          <Card>
            <Text as="div" variant="accent" weight="semibold">
              welcome
            </Text>
            <Text as="p" variant="muted">
              A dev-focused React UI kit.
            </Text>
            <Button variant="primary">try it</Button>
            <Button variant="secondary">docs</Button>
          </Card>
        ),
      },
      {
        name: "as a labelled region",
        node: () => (
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- documents the labelled-region usage; Card is intentionally a bare <div>.
          <Card role="region" aria-labelledby="panel-title">
            <Text as="div" id="panel-title" weight="semibold">
              Section title
            </Text>
            <Text as="p" variant="muted">
              Body copy.
            </Text>
          </Card>
        ),
      },
    ];

    test.for(cases)("$name → no axe violations", async ({ node }) => {
      const screen = await render(node());
      await expectNoAxeViolations(screen.container);
    });
  });
});
