// Visual regression baseline for Code. Two captures:
//   - `default`: standalone chip — pins bg, border, radius, padding, and the
//     default fg color against token drift.
//   - `in-text`: chip inside a Text — pins the em-relative font-size so a
//     regression from `0.9em` to `0.9rem` (which looks identical against the
//     frame's 16 px root) flips visibly against the parent text's size.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Text } from "../Text/Text";
import { Code } from "./Code";

describe("Code VRT", () => {
  test("default", async () => {
    const screen = await render(
      <VrtFrame>
        <Code data-testid="vrt-target">useState()</Code>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("default");
  });

  test("in-text", async () => {
    const screen = await render(
      <VrtFrame width={420}>
        <Text>
          Call <Code>useState()</Code> to add local state.
        </Text>
      </VrtFrame>,
    );
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot("in-text");
  });
});
