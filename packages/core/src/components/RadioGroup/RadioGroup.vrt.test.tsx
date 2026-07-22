// Visual regression baseline for RadioGroup. Two axes matter here that Radio's
// own baseline can't cover: the group's vertical stack (flex column + gap) and
// group-level `disabled` propagating to every child. One capture per
// (selected × disabled) combination.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { VrtFrame } from "../../testing/vrt";
import { Label } from "../Label/Label";
import { Radio } from "../Radio/Radio";
import { RadioGroup } from "./RadioGroup";

type Selection = "none" | "first";
type Disabled = "enabled" | "disabled";

const SELECTIONS = ["none", "first"] as const satisfies readonly Selection[];
const DISABLED = ["enabled", "disabled"] as const satisfies readonly Disabled[];

const CASES = SELECTIONS.flatMap((selection) =>
  DISABLED.map((disabled) => ({ selection, disabled })),
);

describe("RadioGroup VRT", () => {
  test.for(CASES)("selection=$selection / $disabled", async ({ selection, disabled }) => {
    const screen = await render(
      <VrtFrame width={220}>
        <RadioGroup
          aria-label="fruit"
          data-testid="vrt-target"
          defaultValue={selection === "first" ? "apple" : undefined}
          disabled={disabled === "disabled"}
        >
          <Label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Radio value="apple" />
            apple
          </Label>
          <Label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Radio value="banana" />
            banana
          </Label>
          <Label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Radio value="cherry" />
            cherry
          </Label>
        </RadioGroup>
      </VrtFrame>,
    );

    await expect
      .element(screen.getByTestId("vrt-frame"))
      .toMatchScreenshot(`${selection}-${disabled}`);
  });
});
