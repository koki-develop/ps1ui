// Visual regression baseline for Label. Single case — Label is a bare
// typography wrapper with no variants or states, so this is a one-shot
// pin against font-family / font-size / font-weight / colour drift on the
// label class.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { THEMES } from "../../testing/theme";
import { VrtFrame } from "../../testing/vrt";
import { Label } from "./Label";

describe("Label VRT", () => {
  test.for(THEMES.map((theme) => ({ theme })))("theme=$theme / default", async ({ theme }) => {
    const screen = await render(
      <VrtFrame theme={theme}>
        <Label htmlFor="vrt-target">email address</Label>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(`${theme}-default`);
  });
});
