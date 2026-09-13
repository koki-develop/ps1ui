// Guards the components.css embed contract: this is the ONLY test file in the
// package that imports `./components.css` and nothing else — Browser Mode
// isolates state per FILE (see `.claude/rules/testing.md`), so this page never
// sees base.css's reset or ambient canvas, exactly like a real embedder who
// only pulls in components.css.
//
// Two invariants this file exists to pin, both regression-prone because
// styles.css/base.css's own tests (theme.test.tsx, reset.test.tsx) can't see
// them — those files always import styles.css, which carries both halves:
//
//   1. components.css must not set a document-wide `color-scheme` (see
//      tokens.css's `:root` comment and scripts/check-css-split.mjs) —
//      embedded ps1ui should follow the HOST's `color-scheme`, not force one
//      onto the host's `<html>`. Left completely unset, `color-scheme`
//      computes to "normal", which is what a real host document would see
//      too if it never declared one itself.
//   2. components.css must not carry the reset — a bare `<h1>` must keep its
//      UA font-size instead of collapsing to inherited body text (see
//      base.css's header comment and scripts/check-css-split.mjs).

import "./components.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { resolveColorTokenIn } from "../testing/color";

// Same technique as theme.test.tsx's `forcedTokenColor`: force `color-scheme`
// directly (not inherited) on a throwaway element and resolve the token
// inside it, so the expected light/dark value is derived instead of
// hardcoded as an rgb() literal.
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

describe("components.css entry", () => {
  test("does not set a document-wide color-scheme", () => {
    expect(getComputedStyle(document.documentElement).colorScheme).toBe("normal");
  });

  test("--ps1ui-color-bg resolves to the light value at the document root", () => {
    // With no `color-scheme` declared anywhere, the initial value ("normal")
    // is treated as `light` per the `light-dark()` spec, so an embedder that
    // never opts into a scheme sees ps1ui's light palette.
    expect(resolveColorTokenIn(document.body, "--ps1ui-color-bg")).toBe(
      forcedTokenColor("light", "--ps1ui-color-bg"),
    );
  });

  test('a [data-ps1ui-theme="dark"] element resolves the dark palette', async () => {
    const screen = await render(
      <div data-ps1ui-theme="dark" data-testid="root">
        x
      </div>,
    );
    const el = screen.getByTestId("root").element();
    expect(resolveColorTokenIn(el, "--ps1ui-color-bg")).toBe(
      forcedTokenColor("dark", "--ps1ui-color-bg"),
    );
  });

  test("a bare <h1> keeps the UA font-size instead of inheriting (the reset is absent)", async () => {
    const screen = await render(
      <div>
        <span data-testid="baseline">baseline</span>
        <h1 data-testid="heading">heading</h1>
      </div>,
    );
    const baselineSize = getComputedStyle(screen.getByTestId("baseline").element()).fontSize;
    const headingSize = getComputedStyle(screen.getByTestId("heading").element()).fontSize;
    expect(headingSize).not.toBe(baselineSize);
  });
});
