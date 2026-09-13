import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { resolveColorTokenIn } from "../../testing/color";
import { Text } from "../Text/Text";
import { PS1Root, type PS1RootTheme } from "./PS1Root";

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

  describe("theme", () => {
    const THEMES = ["light", "dark", "system"] as const satisfies readonly PS1RootTheme[];

    test.for(THEMES.map((theme) => ({ theme })))(
      "theme=$theme renders the data-ps1ui-theme attribute",
      async ({ theme }) => {
        const screen = await render(
          <PS1Root data-testid="root" theme={theme}>
            x
          </PS1Root>,
        );
        await expect.element(screen.getByTestId("root")).toHaveAttribute("data-ps1ui-theme", theme);
      },
    );

    test("omits data-ps1ui-theme when theme is not given", async () => {
      const screen = await render(<PS1Root data-testid="root">x</PS1Root>);
      const el = screen.getByTestId("root").element();
      expect(el.hasAttribute("data-ps1ui-theme")).toBe(false);
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
    // (`.ps1ui-root` + each primitive's `--query-container` modifier) sets
    // `align-self: stretch` (+ `justify-self`, `min-width: 0`) to keep it
    // filling the cross-axis of the parent. PS1Root is the one primitive that
    // is a query container unconditionally — everywhere else containment is
    // opt-in via `queryContainer`.
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

    // An untheme'd PS1Root is a pure containment wrapper — no canvas of its
    // own — so a `theme`-bearing sibling below has something to visibly
    // contrast against. See PS1Root.css's `.ps1ui-root[data-ps1ui-theme]`
    // comment for why the canvas/ink paint is scoped to the theme attribute.
    test("an untheme'd root paints no background", async () => {
      const screen = await render(<PS1Root data-testid="root">x</PS1Root>);
      const el = screen.getByTestId("root").element() as HTMLDivElement;
      expect(getComputedStyle(el).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    });

    // A themed root paints its own canvas and text color so the subtree is
    // self-contained (see PS1Root.css). Resolve the expected values via
    // resolveColorTokenIn on the element itself rather than hardcoding rgb()
    // literals — the probe inherits the same `color-scheme` this element's
    // `data-ps1ui-theme` just set, so it resolves the same `light-dark()`
    // token substitution the element's own background/color declarations do.
    test('theme="light" root paints the light bg/fg tokens', async () => {
      const screen = await render(
        <PS1Root data-testid="root" theme="light">
          x
        </PS1Root>,
      );
      const el = screen.getByTestId("root").element() as HTMLDivElement;
      const cs = getComputedStyle(el);
      expect(cs.backgroundColor).toBe(resolveColorTokenIn(el, "--ps1ui-color-bg"));
      expect(cs.color).toBe(resolveColorTokenIn(el, "--ps1ui-color-fg"));
    });

    test('theme="dark" root paints the dark bg/fg tokens', async () => {
      const screen = await render(
        <PS1Root data-testid="root" theme="dark">
          x
        </PS1Root>,
      );
      const el = screen.getByTestId("root").element() as HTMLDivElement;
      const cs = getComputedStyle(el);
      expect(cs.backgroundColor).toBe(resolveColorTokenIn(el, "--ps1ui-color-bg"));
      expect(cs.color).toBe(resolveColorTokenIn(el, "--ps1ui-color-fg"));
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

    // Regression cover: an omitted `theme` prop must not clobber a
    // passthrough `data-ps1ui-theme` attribute supplied via rest props. See
    // the precedence comment on PS1Root.tsx's implementation.
    test("preserves a passthrough data-ps1ui-theme attribute when theme is not given", async () => {
      const screen = await render(
        <PS1Root data-testid="root" data-ps1ui-theme="light">
          x
        </PS1Root>,
      );
      await expect.element(screen.getByTestId("root")).toHaveAttribute("data-ps1ui-theme", "light");
    });

    test("the theme prop wins over a passthrough data-ps1ui-theme attribute when both are given", async () => {
      const screen = await render(
        <PS1Root data-testid="root" data-ps1ui-theme="light" theme="dark">
          x
        </PS1Root>,
      );
      await expect.element(screen.getByTestId("root")).toHaveAttribute("data-ps1ui-theme", "dark");
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
