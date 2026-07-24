// Visual regression baselines for Divider. Captures the (orientation × variant)
// matrix as well as the two real-world compositions the rule is designed for
// (horizontal between blocks, vertical inside a flex row) so a token or CSS
// shift produces a pixel diff instead of slipping through the semantic-only
// assertions in Divider.test.tsx.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Divider, type DividerOrientation, type DividerVariant } from "./Divider";

const ORIENTATIONS = ["horizontal", "vertical"] as const satisfies readonly DividerOrientation[];
const VARIANTS = ["solid", "dashed", "dotted"] as const satisfies readonly DividerVariant[];

const CASES = ORIENTATIONS.flatMap((orientation) =>
  VARIANTS.map((variant) => ({ orientation, variant })),
);

describe("Divider VRT", () => {
  // Horizontal rules are captured inside a fixed-width frame so the 100 %
  // width rule has something to fill. Vertical rules are captured inside a
  // fixed-height flex row so `align-self: stretch` has a cross-axis to
  // stretch against — a bare vertical rule would collapse to 0 px and the
  // baseline would carry no signal.
  test.for(CASES)(
    "orientation=$orientation / variant=$variant",
    async ({ orientation, variant }) => {
      const screen = await render(
        <VrtFrame>
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
        .toMatchScreenshot(`${orientation}-${variant}`);
    },
  );

  // The horizontal-between-blocks composition — the primary consumer story
  // for a horizontal rule. Locks in the vertical rhythm around the rule
  // (base.css's default margin plus consumer-side spacing) so a change to
  // Divider's own margin reset shows here.
  test("horizontal between two text blocks", async () => {
    const screen = await render(
      <VrtFrame>
        <div style={{ width: 240, color: "var(--ps1ui-color-fg)" }}>
          <div>Section one.</div>
          <Divider data-testid="vrt-target" />
          <div>Section two.</div>
        </div>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("between-blocks");
  });

  // The vertical-in-flex-row composition — the primary consumer story for a
  // vertical rule. The row's cross-axis height is what the rule stretches
  // against; a broken `align-self: stretch` would produce a 0 px rule that
  // shows as a missing gap between the labels.
  test("vertical inside a horizontal flex row", async () => {
    const screen = await render(
      <VrtFrame>
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
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("vertical-in-row");
  });
});
