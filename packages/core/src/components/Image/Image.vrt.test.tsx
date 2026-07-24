// Visual regression baselines for Image. One capture per variant — Image is a
// passive surface with no interactive states, so this pins the token-driven
// visual treatment end-to-end.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Image } from "./Image";

// Inline SVG keeps VRT deterministic — no network dependency, no CDN
// re-encoding drift.
const SAMPLE_SRC =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'>
  <rect width='320' height='180' fill='#0f1520'/>
  <rect x='40' y='40' width='240' height='100' fill='none' stroke='#7ee787' stroke-width='2'/>
  <text x='160' y='102' text-anchor='middle' fill='#c7d5df' font-family='JetBrains Mono, monospace' font-size='20'>ps1ui</text>
</svg>`);

describe("Image VRT", () => {
  test("plain", async () => {
    const screen = await render(
      <VrtFrame>
        <Image src={SAMPLE_SRC} alt="" width={320} height={180} />
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("plain");
  });

  test("bordered", async () => {
    const screen = await render(
      <VrtFrame>
        <Image src={SAMPLE_SRC} alt="" variant="bordered" width={320} height={180} />
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("bordered");
  });
});
