// Regression net for the light/dark theme mechanism itself: every color token
// is a `light-dark(LIGHT, DARK)` pair on `:root`, and the ONLY switch is the
// `color-scheme` property set by `[data-ps1ui-theme]` (see tokens.css's
// header comment and PS1Root's `theme` prop). `light-dark()` resolves against
// the `color-scheme` in effect on the element that substitutes `var()`, which
// is what makes theming scoped per subtree with no other rules — this file
// asserts that resolution directly via computed styles instead of trusting
// the mechanism by inspection.
//
// Color-scheme emulation (the `theme="system"` cases) is page-global and
// Browser Mode shares the page per FILE — same constraint as forced-colors —
// so every such test lives here and always releases emulation in `afterEach`.

import "./styles.css";

import { afterEach, describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { PS1Root } from "../components/PS1Root/PS1Root";
import { resolveColorTokenIn } from "../testing/color";
import { disableColorSchemeEmulation, emulateColorScheme } from "../testing/color-scheme";

// A fixed reference point to compare document/PS1Root-driven resolutions
// against, without hardcoding rgb() literals: force `color-scheme` directly
// (not inherited) on a throwaway element and resolve the token inside it.
function forcedTokenColor(scheme: "light" | "dark", token: string): string {
  const ref = document.createElement("div");
  ref.style.colorScheme = scheme;
  document.body.appendChild(ref);
  try {
    return resolveColorTokenIn(ref, token);
  } finally {
    ref.remove();
  }
}

afterEach(async () => {
  await disableColorSchemeEmulation();
});

describe("theme mechanism", () => {
  describe("document default", () => {
    test("--ps1ui-color-bg resolves to the dark value at the document root", () => {
      expect(resolveColorTokenIn(document.body, "--ps1ui-color-bg")).toBe(
        forcedTokenColor("dark", "--ps1ui-color-bg"),
      );
    });

    test("documentElement's color-scheme is dark by default", () => {
      expect(getComputedStyle(document.documentElement).colorScheme).toBe("dark");
    });

    // Sanity check for forcedTokenColor itself: if light-dark() silently
    // stopped switching, both forced schemes would collapse to the same
    // color and every comparison below would pass vacuously.
    test("forcedTokenColor resolves light and dark to different colors", () => {
      expect(forcedTokenColor("light", "--ps1ui-color-bg")).not.toBe(
        forcedTokenColor("dark", "--ps1ui-color-bg"),
      );
    });
  });

  describe("PS1Root theme prop", () => {
    const TOKENS = ["--ps1ui-color-bg", "--ps1ui-color-fg", "--ps1ui-color-primary"];

    test('theme="light" resolves bg/fg/primary to the light values inside', async () => {
      const screen = await render(
        <PS1Root theme="light" data-testid="root">
          x
        </PS1Root>,
      );
      const el = screen.getByTestId("root").element();
      for (const token of TOKENS) {
        expect(resolveColorTokenIn(el, token)).toBe(forcedTokenColor("light", token));
      }
    });

    test('theme="dark" resolves bg/fg/primary to the dark values inside', async () => {
      const screen = await render(
        <PS1Root theme="dark" data-testid="root">
          x
        </PS1Root>,
      );
      const el = screen.getByTestId("root").element();
      for (const token of TOKENS) {
        expect(resolveColorTokenIn(el, token)).toBe(forcedTokenColor("dark", token));
      }
    });

    // The behavior PS1Root.css's `.ps1ui-root[data-ps1ui-theme]` rule exists
    // for: `color` is inherited, so a descendant reading `color: inherit`
    // (Anchor subtle, Divider, CodeBlock's inner `code`) must pick up the
    // themed root's OWN resolved fg, not whatever the document's outer (dark)
    // scope computed. Without that rule, this child would inherit the
    // document's dark fg straight through the light root.
    test('a color:inherit child inside theme="light" resolves the light fg, not the document default', async () => {
      const screen = await render(
        <PS1Root theme="light" data-testid="root">
          <span data-testid="child" style={{ color: "inherit" }}>
            x
          </span>
        </PS1Root>,
      );
      const child = screen.getByTestId("child").element();
      expect(getComputedStyle(child).color).toBe(forcedTokenColor("light", "--ps1ui-color-fg"));
    });
  });

  describe("nesting", () => {
    test("a dark PS1Root nested inside a light one resolves dark while the outer stays light", async () => {
      const screen = await render(
        <PS1Root theme="light" data-testid="outer">
          <PS1Root theme="dark" data-testid="inner">
            x
          </PS1Root>
        </PS1Root>,
      );
      const outer = screen.getByTestId("outer").element();
      const inner = screen.getByTestId("inner").element();
      expect(resolveColorTokenIn(outer, "--ps1ui-color-bg")).toBe(
        forcedTokenColor("light", "--ps1ui-color-bg"),
      );
      expect(resolveColorTokenIn(inner, "--ps1ui-color-bg")).toBe(
        forcedTokenColor("dark", "--ps1ui-color-bg"),
      );
    });

    test("a light PS1Root nested inside a dark one resolves light while the outer stays dark", async () => {
      const screen = await render(
        <PS1Root theme="dark" data-testid="outer">
          <PS1Root theme="light" data-testid="inner">
            x
          </PS1Root>
        </PS1Root>,
      );
      const outer = screen.getByTestId("outer").element();
      const inner = screen.getByTestId("inner").element();
      expect(resolveColorTokenIn(outer, "--ps1ui-color-bg")).toBe(
        forcedTokenColor("dark", "--ps1ui-color-bg"),
      );
      expect(resolveColorTokenIn(inner, "--ps1ui-color-bg")).toBe(
        forcedTokenColor("light", "--ps1ui-color-bg"),
      );
    });
  });

  describe("sibling isolation", () => {
    test("an element outside a light PS1Root still resolves dark", async () => {
      const screen = await render(
        <div>
          <PS1Root theme="light" data-testid="light-root">
            x
          </PS1Root>
          <span data-testid="sibling">y</span>
        </div>,
      );
      const sibling = screen.getByTestId("sibling").element();
      expect(resolveColorTokenIn(sibling, "--ps1ui-color-bg")).toBe(
        forcedTokenColor("dark", "--ps1ui-color-bg"),
      );
    });
  });

  describe('theme="system"', () => {
    test("under emulated light preference, system resolves light while an explicit dark sibling stays dark", async () => {
      await emulateColorScheme("light");
      // The emulated media feature doesn't always land synchronously with the
      // command's promise (observed on Firefox) — poll instead of reading once,
      // so a failure here points at emulation rather than at the mechanism.
      await vi.waitFor(() => {
        expect(window.matchMedia("(prefers-color-scheme: light)").matches).toBe(true);
      });
      const screen = await render(
        <div>
          <PS1Root theme="system" data-testid="system-root">
            x
          </PS1Root>
          <PS1Root theme="dark" data-testid="dark-root">
            y
          </PS1Root>
        </div>,
      );
      const systemEl = screen.getByTestId("system-root").element();
      const darkEl = screen.getByTestId("dark-root").element();
      expect(resolveColorTokenIn(systemEl, "--ps1ui-color-bg")).toBe(
        forcedTokenColor("light", "--ps1ui-color-bg"),
      );
      expect(resolveColorTokenIn(darkEl, "--ps1ui-color-bg")).toBe(
        forcedTokenColor("dark", "--ps1ui-color-bg"),
      );
    });

    test("under emulated dark preference, system resolves dark", async () => {
      await emulateColorScheme("dark");
      // See the light case above for why this is a poll, not a single read.
      await vi.waitFor(() => {
        expect(window.matchMedia("(prefers-color-scheme: dark)").matches).toBe(true);
      });
      const screen = await render(
        <PS1Root theme="system" data-testid="system-root">
          x
        </PS1Root>,
      );
      const systemEl = screen.getByTestId("system-root").element();
      expect(resolveColorTokenIn(systemEl, "--ps1ui-color-bg")).toBe(
        forcedTokenColor("dark", "--ps1ui-color-bg"),
      );
    });
  });
});
