// Visual regression baseline for Button. Captures every variant × state
// combination the visible design surface exposes, so an unintended CSS or
// token change produces a pixel diff instead of slipping through the
// semantic-only assertion nets in Button.test.tsx / Button.contrast.test.tsx.
//
// Runs under the `vrt` project (see vitest.config.ts). Baselines live under
// `__screenshots__/Button.vrt.test.tsx/`; only the `-linux.png` set is
// committed (see repo-root .gitignore) — local darwin/win32 captures are
// regenerated on demand and never tracked.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { server } from "vitest/browser";
import { type PseudoClass, withPseudoState } from "../../testing/pseudo-state";
import { Button, type ButtonVariant } from "./Button";

const VARIANTS = ["primary", "secondary"] as const satisfies readonly ButtonVariant[];
const STATES = ["default", "hover", "focus-visible", "disabled"] as const;
const CASES = VARIANTS.flatMap((variant) => STATES.map((state) => ({ variant, state })));

describe("Button VRT", () => {
  test.for(CASES)("variant=$variant / state=$state", async ({ variant, state }, ctx) => {
    // Same WebKit skip as Button.contrast.test.tsx: macOS Safari's default
    // "Full Keyboard Access" excludes <button> from the Tab sequence, so
    // :focus-visible can't be authentically reached on the WebKit provider.
    // `ctx.skip()` (not an early `return`) so the reporter labels it skipped
    // rather than pass-with-no-assertions.
    ctx.skip(
      state === "focus-visible" && server.browser === "webkit",
      "macOS Safari Full Keyboard Access excludes <button> from Tab",
    );

    // The wrapper — not the button itself — is the screenshot target so
    // the :focus-visible box-shadow (which extends beyond the button's
    // border-box) is captured without clipping, and so the dark canvas
    // context around a secondary button (which has `background: transparent`)
    // is deterministic rather than depending on ambient html bg painting.
    // `display: inline-block` keeps the frame tight to the button — a
    // full-width capture would balloon the PNG with empty canvas.
    const screen = await render(
      <div
        data-testid="vrt-frame"
        style={{
          background: "var(--ps1ui-color-bg)",
          padding: 20,
          display: "inline-block",
        }}
      >
        <Button variant={variant} disabled={state === "disabled"} data-testid="vrt-btn">
          save changes
        </Button>
      </div>,
    );

    // Empty pseudo-state list is a no-op wrapper (verified in pseudo-state.ts's
    // apply loop) — collapses default/disabled + pseudo-class states into one
    // capture site so a future state addition doesn't have to re-audit which
    // branch it belongs to.
    const pseudo: readonly PseudoClass[] =
      state === "default" || state === "disabled" ? [] : [state];
    await withPseudoState('[data-testid="vrt-btn"]', pseudo, async () => {
      await expect
        .element(screen.getByTestId("vrt-frame"))
        .toMatchScreenshot(`${variant}-${state}`);
    });
  });
});
