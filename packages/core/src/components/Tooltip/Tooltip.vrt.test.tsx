// Visual regression baseline for Tooltip. The tooltip panel is portaled to
// document.body (position: fixed, viewport-coord positioning), so it renders
// OUTSIDE the VrtFrame's DOM subtree — but Playwright's element screenshot
// clips to VrtFrame's bounding box in viewport space, and any pixels that
// fall within that box are captured regardless of DOM ancestry. The inner
// padding around the trigger sizes the frame large enough that all four
// placements land inside that box.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Tooltip, type TooltipPlacement } from "./Tooltip";

const PLACEMENTS = [
  "top",
  "bottom",
  "left",
  "right",
] as const satisfies readonly TooltipPlacement[];

describe("Tooltip VRT", () => {
  test.for(PLACEMENTS.map((placement) => ({ placement })))(
    "placement=$placement",
    async ({ placement }) => {
      const screen = await render(
        <VrtFrame>
          <div
            style={{
              width: 240,
              height: 140,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Tooltip content="Delete" open placement={placement}>
              <button
                type="button"
                data-testid="vrt-target"
                style={{
                  background: "var(--ps1ui-color-surface)",
                  color: "var(--ps1ui-color-fg)",
                  border: "1px solid var(--ps1ui-color-border)",
                  fontFamily: "var(--ps1ui-font-mono)",
                  fontSize: "var(--ps1ui-font-size-sm)",
                  padding: "4px 12px",
                }}
              >
                trigger
              </button>
            </Tooltip>
          </div>
        </VrtFrame>,
      );

      // Wait for the panel to be positioned (visibility flips to visible only
      // after the post-mount measurement completes).
      await expect
        .poll(
          () => document.querySelector<HTMLElement>('[role="tooltip"]')?.style.visibility ?? null,
        )
        .toBe("visible");

      await expect
        .element(screen.getByTestId("vrt-frame"))
        .toMatchScreenshot(`placement-${placement}`);
    },
  );
});
