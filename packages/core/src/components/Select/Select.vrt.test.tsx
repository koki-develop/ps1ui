// Visual regression baseline for Select. This is the component in the library
// most exposed to engine drift: `appearance: none` is what makes the three
// engines stop painting their own drop-down chrome, and the ▾ glyph that
// replaces it is positioned against padding computed in `ch` units. A reset
// change, a token drift, or an engine that starts honouring `appearance`
// differently would all show up here first.
//
// Both drop-down and list-box modes are captured — they are two different
// renderings of the same element, and only the drop-down reserves inline-end
// space for the glyph.
//
// Select uses `:focus` (not `:focus-visible`), reached with the pseudo-state
// `focus` handler's programmatic `.focus()`, so WebKit's Full-Keyboard-Access
// exclusion of non-text controls from Tab never comes into play and no skip is
// needed — same situation as Input.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { type PseudoClass, withPseudoStateFor } from "../../testing/pseudo-state";
import { VrtFrame } from "../../testing/vrt";
import { Select } from "./Select";

type Mode = "dropdown" | "narrow" | "grouped" | "listbox";
type Interaction = "default" | "hover" | "focus" | "disabled";

const PSEUDO_STATES = ["hover", "focus"] as const satisfies readonly PseudoClass[];

// Fixed width so every capture measures the same box: a shrink-to-fit frame
// would size to the widest option and drift between modes.
const FRAME_WIDTH = 220;

const OPTIONS = (
  <>
    <option value="go">Go</option>
    <option value="rust">Rust</option>
    <option value="ts">TypeScript</option>
  </>
);

const GROUPED = (
  <>
    <optgroup label="systems">
      <option value="rust">Rust</option>
    </optgroup>
    <optgroup label="scripting">
      <option value="ts">TypeScript</option>
    </optgroup>
  </>
);

const CASES: readonly { mode: Mode; interaction: Interaction }[] = [
  // Interaction matrix on the drop-down: the glyph tint, the reserved padding
  // and the border/ring treatment all live here.
  { mode: "dropdown", interaction: "default" },
  { mode: "dropdown", interaction: "hover" },
  { mode: "dropdown", interaction: "focus" },
  { mode: "dropdown", interaction: "disabled" },
  // A control narrower than its container. The marker is part of the control's
  // own background, so it has to stay pinned to the control's inline end and
  // not drift out to the container edge — the whole reason Select renders no
  // wrapper element. A picture is the only assertion that really covers it.
  { mode: "narrow", interaction: "default" },
  // List box renders its options in-page, so optgroup weight and option
  // colours are actually visible in these two.
  { mode: "listbox", interaction: "default" },
  { mode: "listbox", interaction: "focus" },
  { mode: "grouped", interaction: "default" },
];

describe("Select VRT", () => {
  test.for(CASES)("mode=$mode / interaction=$interaction", async ({ mode, interaction }) => {
    const listbox = mode === "grouped" || mode === "listbox";
    const screen = await render(
      <VrtFrame width={FRAME_WIDTH}>
        <Select
          aria-label="language"
          data-testid="vrt-target"
          defaultValue="rust"
          size={listbox ? 4 : undefined}
          disabled={interaction === "disabled"}
          // Half the frame, so the gap between the control's inline end and the
          // frame edge makes any drift of the marker unmissable.
          style={mode === "narrow" ? { width: FRAME_WIDTH / 2 } : undefined}
        >
          {mode === "grouped" ? GROUPED : OPTIONS}
        </Select>
      </VrtFrame>,
    );

    await withPseudoStateFor('[data-testid="vrt-target"]', interaction, PSEUDO_STATES, async () => {
      await expect
        .element(screen.getByTestId("vrt-frame"))
        .toMatchScreenshot(`${mode}-${interaction}`);
    });
  });
});
