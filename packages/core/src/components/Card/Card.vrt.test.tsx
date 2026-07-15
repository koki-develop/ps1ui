// Visual regression baseline for Card. Single case — Card is a passive
// surface (bg + border + border-radius + padding + monospace body) with no
// interactive states. This pins the surface look end-to-end so a token
// drift on surface / border colour or a radius change surfaces as a diff.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Card } from "./Card";

describe("Card VRT", () => {
  test("default", async () => {
    // width=320 pins the surface at a consistent size — Card itself has no
    // intrinsic width, so without this it would collapse to the content or
    // expand to VrtFrame's inline-block width.
    const screen = await render(
      <VrtFrame width={320}>
        <Card>a card surface with a line of body text inside it.</Card>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("default");
  });
});
