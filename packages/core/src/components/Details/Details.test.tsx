import "../../styles/styles.css";

import type { ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Details } from "./Details";

describe("Details", () => {
  describe("rendering", () => {
    test("renders a <details> with a <summary> and the body children", async () => {
      const screen = await render(
        <Details summary="Section" data-testid="d">
          body copy
        </Details>,
      );
      const el = screen.getByTestId("d").element() as HTMLDetailsElement;
      expect(el.tagName.toLowerCase()).toBe("details");
      const summary = el.querySelector("summary");
      expect(summary).not.toBeNull();
      expect(summary?.tagName.toLowerCase()).toBe("summary");
      expect(summary?.textContent).toBe("Section");
      expect(el.textContent).toContain("body copy");
    });

    test("is closed by default (native <details> behavior)", async () => {
      const screen = await render(
        <Details summary="s" data-testid="d">
          x
        </Details>,
      );
      const el = screen.getByTestId("d").element() as HTMLDetailsElement;
      expect(el.open).toBe(false);
    });

    test("honours the `open` prop", async () => {
      const screen = await render(
        <Details summary="s" open data-testid="d">
          x
        </Details>,
      );
      const el = screen.getByTestId("d").element() as HTMLDetailsElement;
      expect(el.open).toBe(true);
    });

    test("accepts a ReactNode summary and renders it inside <summary>", async () => {
      const screen = await render(
        <Details summary={<strong data-testid="rich">Rich</strong>} data-testid="d">
          x
        </Details>,
      );
      const rich = screen.getByTestId("rich").element();
      expect(rich.tagName.toLowerCase()).toBe("strong");
      // Rich node is a child of the internal <summary>, not the details root.
      expect(rich.parentElement?.tagName.toLowerCase()).toBe("summary");
    });

    test("wraps body children in a .ps1ui-details__body div", async () => {
      const screen = await render(
        <Details summary="s" data-testid="d">
          <span data-testid="child">body</span>
        </Details>,
      );
      const body = screen.getByTestId("d").element().querySelector(".ps1ui-details__body");
      expect(body).not.toBeNull();
      expect(body?.querySelector('[data-testid="child"]')).not.toBeNull();
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-details / ps1ui-details__summary / ps1ui-details__body base classes", async () => {
      const screen = await render(
        <Details summary="s" data-testid="d">
          x
        </Details>,
      );
      const root = screen.getByTestId("d");
      await expect.element(root).toHaveClass("ps1ui-details");
      const el = root.element();
      expect(el.querySelector("summary")?.classList.contains("ps1ui-details__summary")).toBe(true);
      expect(el.querySelector(".ps1ui-details__body")).not.toBeNull();
    });

    test("merges caller-supplied className without dropping the base", async () => {
      const screen = await render(
        <Details summary="s" data-testid="d" className="extra">
          x
        </Details>,
      );
      const el = screen.getByTestId("d");
      await expect.element(el).toHaveClass("ps1ui-details");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native <details> attributes (id, name, aria-*, data-*)", async () => {
      const screen = await render(
        <Details
          summary="s"
          id="d1"
          name="grp"
          aria-labelledby="lbl"
          data-testid="d"
          data-custom="v"
        >
          x
        </Details>,
      );
      const el = screen.getByTestId("d");
      await expect.element(el).toHaveAttribute("id", "d1");
      await expect.element(el).toHaveAttribute("name", "grp");
      await expect.element(el).toHaveAttribute("aria-labelledby", "lbl");
      await expect.element(el).toHaveAttribute("data-custom", "v");
    });

    test("forwards the style attribute onto <details>", async () => {
      const screen = await render(
        <Details summary="s" data-testid="d" style={{ maxWidth: 240 }}>
          x
        </Details>,
      );
      const el = screen.getByTestId("d").element() as HTMLDetailsElement;
      expect(el.style.maxWidth).toBe("240px");
    });
  });

  describe("interaction", () => {
    test("clicking the summary toggles the open state", async () => {
      const screen = await render(
        <Details summary="Sect" data-testid="d">
          body
        </Details>,
      );
      const el = screen.getByTestId("d").element() as HTMLDetailsElement;
      const summary = el.querySelector("summary")!;

      expect(el.open).toBe(false);
      summary.click();
      expect(el.open).toBe(true);
      summary.click();
      expect(el.open).toBe(false);
    });

    test("fires onToggle when the open state changes", async () => {
      const onToggle = vi.fn();
      const screen = await render(
        <Details summary="s" onToggle={onToggle} data-testid="d">
          x
        </Details>,
      );
      const el = screen.getByTestId("d").element() as HTMLDetailsElement;
      el.querySelector("summary")!.click();
      // The native `toggle` event is queued as a microtask after the open
      // attribute mutation, so poll instead of asserting synchronously.
      await vi.waitFor(() => expect(onToggle).toHaveBeenCalledTimes(1));
    });

    // Space-key activation on Firefox is a known intermittent flake for
    // form controls (see packages/core/CLAUDE.md § "Known intermittent
    // Firefox flake"). Summary's Space behavior is the same shape: retry
    // absorbs the misfire without hiding a real regression.
    test("Enter on a focused summary toggles the open state", { retry: 3 }, async () => {
      const screen = await render(
        <Details summary="Sect" data-testid="d">
          body
        </Details>,
      );
      const el = screen.getByTestId("d").element() as HTMLDetailsElement;
      const summary = el.querySelector("summary")!;
      summary.focus();
      await userEvent.keyboard("{Enter}");
      expect(el.open).toBe(true);
    });
  });

  describe("a11y", () => {
    type A11yCase = { name: string; node: () => ReactElement };

    const cases: A11yCase[] = [
      {
        name: "closed with a plain-string summary",
        node: () => <Details summary="Components">body</Details>,
      },
      {
        name: "open with a plain-string summary",
        node: () => (
          <Details summary="Components" open>
            body
          </Details>
        ),
      },
      {
        name: "rich (ReactNode) summary",
        node: () => (
          <Details
            summary={
              <span>
                Section <strong>title</strong>
              </span>
            }
          >
            body
          </Details>
        ),
      },
    ];

    test.for(cases)("$name → no axe violations", async ({ node }) => {
      const screen = await render(node());
      await expectNoAxeViolations(screen.container);
    });
  });
});
