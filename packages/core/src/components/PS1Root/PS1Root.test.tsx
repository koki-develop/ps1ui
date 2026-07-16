import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { Text } from "../Text/Text";
import { PS1Root } from "./PS1Root";

describe("PS1Root", () => {
  describe("rendering", () => {
    test("renders a <div> with the given children", async () => {
      const screen = await render(<PS1Root data-testid="root">content</PS1Root>);
      const el = screen.getByTestId("root").element();
      expect(el.tagName.toLowerCase()).toBe("div");
      expect(el.textContent).toContain("content");
    });

    test("has no default role (transparent structural wrapper)", async () => {
      const screen = await render(<PS1Root data-testid="root">x</PS1Root>);
      const el = screen.getByTestId("root").element();
      expect(el.getAttribute("role")).toBeNull();
    });
  });

  describe("class composition", () => {
    test("applies the base ps1ui-root class", async () => {
      const screen = await render(<PS1Root data-testid="root">x</PS1Root>);
      const el = screen.getByTestId("root").element();
      expect(el.classList.contains("ps1ui-root")).toBe(true);
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <PS1Root data-testid="root" className="extra other">
          x
        </PS1Root>,
      );
      const el = screen.getByTestId("root");
      await expect.element(el).toHaveClass("ps1ui-root");
      await expect.element(el).toHaveClass("extra");
      await expect.element(el).toHaveClass("other");
    });
  });

  describe("computed styles", () => {
    test("establishes an inline-size containment context", async () => {
      // Behavioural check: the whole point of PS1Root is to be a container
      // query ancestor for descendants. Assert that `container-type` really
      // resolves — a class rename or accidental override would otherwise
      // silently break every responsive prop in the library.
      const screen = await render(<PS1Root data-testid="root">x</PS1Root>);
      const el = screen.getByTestId("root").element() as HTMLDivElement;
      const cs = getComputedStyle(el);
      expect(cs.containerType).toBe("inline-size");
    });

    // `container-type: inline-size` implies `contain: inline-size`, which
    // treats intrinsic width as 0. Placing PS1Root inside a shrink-to-fit
    // flex parent (`align-items: flex-start` in a column) would otherwise
    // collapse it to width 0 — silently degrading every `@container`-driven
    // descendant. The shared containment-defense rule in components.css
    // (`.ps1ui-root, .ps1ui-container, .ps1ui-grid, .ps1ui-stack`) sets
    // `align-self: stretch` (+ `justify-self`, `min-width: 0`) to keep it
    // filling the cross-axis of the parent.
    test("resists collapse via align-self: stretch in shrink-wrap flex parent", async () => {
      const screen = await render(
        <div
          data-testid="p"
          style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", width: 500 }}
        >
          <PS1Root data-testid="root">
            <span>x</span>
          </PS1Root>
        </div>,
      );
      const el = screen.getByTestId("root").element() as HTMLDivElement;
      expect(getComputedStyle(el).alignSelf).toBe("stretch");
      expect(el.getBoundingClientRect().width).toBe(500);
    });

    test("names the container context `ps1ui-root`", async () => {
      // Named containers let downstream authors write scoped queries
      // (e.g. `@container ps1ui-root (...)`). Locking the name in tests
      // catches an accidental rename before it silently breaks a
      // consumer's targeted query.
      const screen = await render(<PS1Root data-testid="root">x</PS1Root>);
      const el = screen.getByTestId("root").element() as HTMLDivElement;
      const cs = getComputedStyle(el);
      expect(cs.containerName).toBe("ps1ui-root");
    });
  });

  describe("passthrough", () => {
    test("forwards native <div> attributes (id, aria-label, data-*)", async () => {
      const screen = await render(
        <PS1Root id="app" aria-label="application root" data-custom="v" data-testid="root">
          x
        </PS1Root>,
      );
      const el = screen.getByTestId("root");
      await expect.element(el).toHaveAttribute("id", "app");
      await expect.element(el).toHaveAttribute("aria-label", "application root");
      await expect.element(el).toHaveAttribute("data-custom", "v");
    });

    test("forwards and preserves the style attribute", async () => {
      const screen = await render(
        <PS1Root data-testid="root" style={{ background: "red" }}>
          x
        </PS1Root>,
      );
      const el = screen.getByTestId("root").element() as HTMLDivElement;
      expect(el.style.background).toContain("red");
    });

    test("forwards a ref to the underlying <div>", async () => {
      let captured: HTMLDivElement | null = null;
      const setRef = (node: HTMLDivElement | null) => {
        captured = node;
      };
      await render(
        <PS1Root ref={setRef} data-testid="root">
          x
        </PS1Root>,
      );
      expect(captured).not.toBeNull();
      expect((captured as unknown as HTMLDivElement).tagName.toLowerCase()).toBe("div");
    });
  });

  describe("a11y", () => {
    test("no axe violations for a plain PS1Root with text content", async () => {
      const screen = await render(
        <PS1Root>
          <Text>the quick brown fox jumps over the lazy dog</Text>
        </PS1Root>,
      );
      await expectNoAxeViolations(screen.container);
    });
  });
});
