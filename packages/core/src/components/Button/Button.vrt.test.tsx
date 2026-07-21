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
import { type PseudoClass, withPseudoStateFor } from "../../testing/pseudo-state";
import { VrtFrame } from "../../testing/vrt";
import { Button, type ButtonSize, type ButtonVariant } from "./Button";

const VARIANTS = ["primary", "secondary", "danger"] as const satisfies readonly ButtonVariant[];
const SIZES = ["sm", "md", "lg"] as const satisfies readonly ButtonSize[];
const STATES = ["default", "hover", "focus-visible", "active", "disabled"] as const;
const PSEUDO_STATES = [
  "hover",
  "focus-visible",
  "active",
] as const satisfies readonly PseudoClass[];
const CASES = VARIANTS.flatMap((variant) => STATES.map((state) => ({ variant, state })));

describe("Button VRT", () => {
  test.for(CASES)("variant=$variant / state=$state", async ({ variant, state }, ctx) => {
    // Same WebKit skip as Button.contrast.test.tsx: macOS Safari's default
    // "Full Keyboard Access" excludes <button> from the Tab sequence, so
    // :focus-visible can't be authentically reached on the WebKit provider.
    ctx.skip(
      state === "focus-visible" && server.browser === "webkit",
      "macOS Safari Full Keyboard Access excludes <button> from Tab",
    );
    // Known flake — same pattern as Anchor subtle focus-visible: the
    // secondary variant's transparent background + focus-ring alpha blend
    // renders inconsistently across successive Firefox captures (measured
    // 4-6% pixel drift, > any sane tolerance). Stable Screenshot Detection
    // never converges. See packages/core/CLAUDE.md § "Known VRT flakes".
    ctx.skip(
      variant === "secondary" && state === "focus-visible" && server.browser === "firefox",
      "Firefox: secondary + focus-visible rasterises inconsistently across captures",
    );

    const screen = await render(
      <VrtFrame>
        <Button variant={variant} disabled={state === "disabled"} data-testid="vrt-target">
          save changes
        </Button>
      </VrtFrame>,
    );

    await withPseudoStateFor('[data-testid="vrt-target"]', state, PSEUDO_STATES, async () => {
      await expect
        .element(screen.getByTestId("vrt-frame"))
        .toMatchScreenshot(`${variant}-${state}`);
    });
  });

  // Regression net for the polymorphic `as` prop: a Button rendered as an <a> must
  // look visually identical to a native <button>. Guards against accidental
  // tag-scoped CSS regressions (e.g. `button.ps1ui-button { … }`) that would
  // silently break the link-as-button use case. One baseline per variant is
  // enough — the pseudo-state matrix above is already covered by the <button>
  // baselines, and any tag-conditional CSS would show up in the default paint.
  test.for(VARIANTS.map((variant) => ({ variant })))(
    "as='a' / variant=$variant matches the button baseline",
    async ({ variant }) => {
      const screen = await render(
        <VrtFrame>
          <Button as="a" href="#" variant={variant} data-testid="vrt-target">
            save changes
          </Button>
        </VrtFrame>,
      );
      await expect
        .element(screen.getByTestId("vrt-frame"))
        .toMatchScreenshot(`${variant}-as-a-default`);
    },
  );

  // Size axis — captured against the primary variant only. Sizes only alter
  // font-size / padding / gap; the variant × state matrix already covers the
  // colour surface, so a per-size × per-variant × per-state expansion would
  // add ~30 near-duplicate baselines whose only signal repeats what the
  // primary size row already carries. Any regression in the size CSS is
  // strictly geometric and shows up on the primary row.
  test.for(SIZES.map((size) => ({ size })))(
    "variant=primary / size=$size / default state",
    async ({ size }) => {
      const screen = await render(
        <VrtFrame>
          <Button variant="primary" size={size} data-testid="vrt-target">
            save changes
          </Button>
        </VrtFrame>,
      );
      await expect
        .element(screen.getByTestId("vrt-frame"))
        .toMatchScreenshot(`primary-size-${size}-default`);
    },
  );

  // The three sizes side-by-side in one capture — locks their relative
  // proportions (font/padding ratios) beyond what per-size captures alone
  // catch, since baseline vertical alignment across sizes is visible only
  // when they render together.
  test("sizes side-by-side keep aligned baselines and proportional dimensions", async () => {
    const screen = await render(
      <VrtFrame>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button variant="primary" size="sm">
            small
          </Button>
          <Button variant="primary" size="md">
            medium
          </Button>
          <Button variant="primary" size="lg">
            large
          </Button>
        </div>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("sizes-row");
  });
});
