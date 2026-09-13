// Visual regression baseline for PS1Root's themed canvas/ink paint. A
// `theme`-bearing PS1Root renders visible ink of its own (see
// PS1Root.css's `.ps1ui-root[data-ps1ui-theme]` rule) — nesting it in the
// OPPOSITE theme from its VrtFrame proves the nested scope paints its own
// background and text color rather than leaking the outer theme in. Anchor's
// `subtle` variant is included specifically because it reads its resting
// color via `color: inherit` — the exact case this rule exists for.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { THEMES } from "../../testing/theme";
import { VrtFrame } from "../../testing/vrt";
import { Anchor } from "../Anchor/Anchor";
import { Text } from "../Text/Text";
import { PS1Root } from "./PS1Root";

describe("PS1Root VRT", () => {
  test.for(THEMES.map((theme) => ({ theme })))(
    "theme=$theme / nested opposite theme",
    async ({ theme }) => {
      const oppositeTheme = theme === "dark" ? "light" : "dark";
      const screen = await render(
        // width=320 pins the frame to a fixed size: PS1Root is a query
        // container (`container-type: inline-size`), which per its own
        // header comment collapses its intrinsic inline size to 0 inside a
        // shrink-to-fit parent — VrtFrame's `inline-block` box is exactly
        // that, and without a pinned width the nested PS1Root (and its text)
        // would collapse to a sliver.
        <VrtFrame theme={theme} width={320}>
          <PS1Root theme={oppositeTheme} style={{ padding: 16 }}>
            <Text>the quick brown fox jumps over the lazy dog</Text>
            <Anchor href="#" variant="subtle">
              read the getting-started guide
            </Anchor>
          </PS1Root>
        </VrtFrame>,
      );
      await expect
        .element(screen.getByTestId("vrt-frame"))
        .toMatchScreenshot(`${theme}-nested-${oppositeTheme}`);
    },
  );
});
