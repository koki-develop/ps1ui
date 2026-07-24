// Visual regression baseline for Badge. Captures every (variant × color)
// combination the static display surface exposes, plus the interactive
// hover/focus/active/disabled states unlocked by `as="button"` — so a
// token or CSS shift produces a pixel diff instead of slipping through
// the semantic-only assertions in Badge.test.tsx / Badge.contrast.test.tsx.
//
// Runs under the `vrt` project (see vitest.config.ts). Baselines live under
// `__screenshots__/Badge.vrt.test.tsx/`; only the `-linux.png` set is
// committed (see repo-root .gitignore) — local darwin/win32 captures are
// regenerated on demand and never tracked.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { server } from "vitest/browser";
import { type PseudoClass, withPseudoStateFor } from "../../testing/pseudo-state";
import { VrtFrame } from "../../testing/vrt";
import { Badge, type BadgeColor, type BadgeVariant } from "./Badge";

const VARIANTS = ["solid", "outline", "subtle"] as const satisfies readonly BadgeVariant[];
const COLORS = ["primary", "accent", "danger", "muted"] as const satisfies readonly BadgeColor[];
const INTERACTIVE_STATES = ["default", "hover", "focus-visible", "active", "disabled"] as const;
const PSEUDO_STATES = [
  "hover",
  "focus-visible",
  "active",
] as const satisfies readonly PseudoClass[];

const STATIC_CASES = VARIANTS.flatMap((variant) => COLORS.map((color) => ({ variant, color })));

describe("Badge VRT", () => {
  // Static badges — the (variant × color) matrix at rest. This is the
  // full colour surface; any token / mix shift shows here first.
  test.for(STATIC_CASES)(
    "variant=$variant / color=$color / default",
    async ({ variant, color }) => {
      const screen = await render(
        <VrtFrame>
          <Badge variant={variant} color={color} data-testid="vrt-target">
            {`${variant}-${color}`}
          </Badge>
        </VrtFrame>,
      );
      await expect
        .element(screen.getByTestId("vrt-frame"))
        .toMatchScreenshot(`${variant}-${color}`);
    },
  );

  // The whole matrix in one shot — locks the visual rhythm across colours
  // and variants that a per-cell capture can't see (relative saturation,
  // border weight parity between primary/accent/danger/muted).
  test("matrix side-by-side", async () => {
    const screen = await render(
      <VrtFrame>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(4, auto)" }}>
          {STATIC_CASES.map(({ variant, color }) => (
            <Badge key={`${variant}-${color}`} variant={variant} color={color}>
              {color}
            </Badge>
          ))}
        </div>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("matrix");
  });

  // Interactive state matrix — captured per variant against the primary
  // colour. Hover/active feedback is variant-specific (solid darkens,
  // outline lightly fills, subtle deepens its tint), so each variant needs
  // its own baseline row. Colour is fixed to primary because those rules
  // read from the shared --_base var — a per-colour × per-state expansion
  // would add ~40 near-duplicate baselines whose only signal repeats what
  // the primary row already carries.
  const INTERACTIVE_CASES = VARIANTS.flatMap((variant) =>
    INTERACTIVE_STATES.map((state) => ({ variant, state })),
  );
  test.for(INTERACTIVE_CASES)(
    "as=button / variant=$variant / state=$state",
    async ({ variant, state }, ctx) => {
      // Same WebKit skip as Button.vrt.test.tsx: macOS Safari's default
      // "Full Keyboard Access" excludes <button> from the Tab sequence, so
      // :focus-visible can't be authentically reached on the WebKit provider.
      ctx.skip(
        state === "focus-visible" && server.browser === "webkit",
        "macOS Safari Full Keyboard Access excludes <button> from Tab",
      );

      const screen = await render(
        <VrtFrame>
          <Badge
            as="button"
            variant={variant}
            color="primary"
            disabled={state === "disabled"}
            data-testid="vrt-target"
          >
            filter
          </Badge>
        </VrtFrame>,
      );
      await withPseudoStateFor('[data-testid="vrt-target"]', state, PSEUDO_STATES, async () => {
        await expect
          .element(screen.getByTestId("vrt-frame"))
          .toMatchScreenshot(`interactive-${variant}-${state}`);
      });
    },
  );

  // Polymorphic `as` — a Badge rendered as an <a> must look visually
  // identical to a <button> at rest. Guards against tag-scoped CSS
  // regressions (e.g. `button.ps1ui-badge { … }`) that would silently
  // break the tag-as-link use case. One baseline per variant is enough;
  // per-state colour behaviour is already covered by the button matrix.
  test.for(VARIANTS.map((variant) => ({ variant })))(
    "as=a / variant=$variant matches the button baseline",
    async ({ variant }) => {
      const screen = await render(
        <VrtFrame>
          <Badge as="a" href="#" variant={variant} color="primary" data-testid="vrt-target">
            filter
          </Badge>
        </VrtFrame>,
      );
      await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(`as-a-${variant}`);
    },
  );

  // Leading slot geometry — icons/markers must sit inline at the same
  // baseline as the label, spaced by the badge's own gap. A regression
  // here (leading wrapper accidentally getting margin, gap flipping to
  // column, etc.) shows up as a shifted glyph or split line.
  test("leading slot aligns inline with the label", async () => {
    const screen = await render(
      <VrtFrame>
        <Badge
          variant="subtle"
          color="primary"
          leading={<span aria-hidden="true">↑</span>}
          data-testid="vrt-target"
        >
          up 24%
        </Badge>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("leading");
  });
});
