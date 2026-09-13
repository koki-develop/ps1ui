// Visual regression baselines for Divider. Captures the (orientation × variant)
// matrix as well as the two real-world compositions the rule is designed for
// (horizontal between blocks, vertical inside a flex row) so a token or CSS
// shift produces a pixel diff instead of slipping through the semantic-only
// assertions in Divider.test.tsx.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { THEMES } from "../../testing/theme";
import { VrtFrame } from "../../testing/vrt";
import { Divider, type DividerOrientation, type DividerVariant } from "./Divider";

const ORIENTATIONS = ["horizontal", "vertical"] as const satisfies readonly DividerOrientation[];
const VARIANTS = ["solid", "dashed", "dotted"] as const satisfies readonly DividerVariant[];

const CASES = THEMES.flatMap((theme) =>
  ORIENTATIONS.flatMap((orientation) =>
    VARIANTS.map((variant) => ({ theme, orientation, variant })),
  ),
);

describe("Divider VRT", () => {
  // Horizontal rules are captured inside a fixed-width frame so the 100 %
  // width rule has something to fill. Vertical rules are captured inside a
  // fixed-height flex row so `align-self: stretch` has a cross-axis to
  // stretch against — a bare vertical rule would collapse to 0 px and the
  // baseline would carry no signal.
  test.for(CASES)(
    "theme=$theme / orientation=$orientation / variant=$variant",
    async ({ theme, orientation, variant }) => {
      const screen = await render(
        <VrtFrame theme={theme}>
          {orientation === "horizontal" ? (
            <div style={{ width: 240 }}>
              <Divider orientation={orientation} variant={variant} data-testid="vrt-target" />
            </div>
          ) : (
            <div style={{ display: "flex", height: 60 }}>
              <Divider orientation={orientation} variant={variant} data-testid="vrt-target" />
            </div>
          )}
        </VrtFrame>,
      );
      await expect
        .element(screen.getByTestId("vrt-frame"))
        .toMatchScreenshot(`${theme}-${orientation}-${variant}`);
    },
  );

  // The horizontal-between-blocks composition — the primary consumer story
  // for a horizontal rule. Locks in the vertical rhythm around the rule
  // (base.css's default margin plus consumer-side spacing) so a change to
  // Divider's own margin reset shows here.
  test.for(THEMES.map((theme) => ({ theme })))(
    "theme=$theme / horizontal between two text blocks",
    async ({ theme }) => {
      const screen = await render(
        <VrtFrame theme={theme}>
          <div style={{ width: 240, color: "var(--ps1ui-color-fg)" }}>
            <div>Section one.</div>
            <Divider data-testid="vrt-target" />
            <div>Section two.</div>
          </div>
        </VrtFrame>,
      );
      await expect
        .element(screen.getByTestId("vrt-frame"))
        .toMatchScreenshot(`${theme}-between-blocks`);
    },
  );

  // The vertical-in-flex-row composition — the primary consumer story for a
  // vertical rule. The row's cross-axis height is what the rule stretches
  // against; a broken `align-self: stretch` would produce a 0 px rule that
  // shows as a missing gap between the labels.
  test.for(THEMES.map((theme) => ({ theme })))(
    "theme=$theme / vertical inside a horizontal flex row",
    async ({ theme }) => {
      const screen = await render(
        <VrtFrame theme={theme}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              color: "var(--ps1ui-color-fg)",
            }}
          >
            <span>File</span>
            <Divider orientation="vertical" data-testid="vrt-target" />
            <span>Edit</span>
            <Divider orientation="vertical" />
            <span>View</span>
          </div>
        </VrtFrame>,
      );
      await expect
        .element(screen.getByTestId("vrt-frame"))
        .toMatchScreenshot(`${theme}-vertical-in-row`);
    },
  );
});
