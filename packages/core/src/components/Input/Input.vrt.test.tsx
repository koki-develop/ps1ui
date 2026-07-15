// Visual regression baseline for Input. Text input renders differently by
// engine (border metrics, placeholder color rendering, caret) — VRT locks
// down each state × content combination so an ambient reset change or a
// token drift can't silently shift how the field reads.
//
// Text inputs ARE Tab-reachable in Safari's default configuration (FKA
// affects buttons/checkboxes/anchors, not text fields), so no WebKit skip
// is needed — verified empirically by the pseudo-state sanity test's use of
// <input> as its Tab-reachable probe.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { type PseudoClass, withPseudoStateFor } from "../../testing/pseudo-state";
import { VrtFrame } from "../../testing/vrt";
import { Input } from "./Input";

type Content = "empty" | "placeholder" | "filled";
type Interaction = "default" | "hover" | "focus" | "disabled";

const PSEUDO_STATES = ["hover", "focus"] as const satisfies readonly PseudoClass[];

// Input.css uses `:focus` (not `:focus-visible`), triggered by any focus
// path — mouse click or Tab — so we use the pseudo-state `focus` handler
// (programmatic `.focus()`) rather than the Tab-based `focus-visible` one.
// Fixed 220px width so the field doesn't span the wrapper's inline-block
// width (which would collapse to the placeholder text width, producing
// visually inconsistent captures across states).
const FRAME_WIDTH = 220;

const CASES: readonly { content: Content; interaction: Interaction }[] = [
  // Interaction matrix on empty + placeholder to catch base border /
  // placeholder-color drift.
  { content: "empty", interaction: "default" },
  { content: "empty", interaction: "hover" },
  { content: "empty", interaction: "focus" },
  { content: "empty", interaction: "disabled" },
  { content: "placeholder", interaction: "default" },
  { content: "placeholder", interaction: "focus" },
  // Filled + focus checks that focus-ring composition still reads on top
  // of user-entered text; filled + disabled shows the muted-fg treatment.
  { content: "filled", interaction: "focus" },
  { content: "filled", interaction: "disabled" },
];

describe("Input VRT", () => {
  test.for(CASES)(
    "content=$content / interaction=$interaction",
    async ({ content, interaction }) => {
      const value = content === "filled" ? "hello@ps1ui.dev" : undefined;
      const placeholder = content === "placeholder" ? "you@example.com" : undefined;

      const screen = await render(
        <VrtFrame width={FRAME_WIDTH}>
          <Input
            aria-label="email"
            data-testid="vrt-target"
            defaultValue={value}
            placeholder={placeholder}
            disabled={interaction === "disabled"}
          />
        </VrtFrame>,
      );

      await withPseudoStateFor(
        '[data-testid="vrt-target"]',
        interaction,
        PSEUDO_STATES,
        async () => {
          await expect
            .element(screen.getByTestId("vrt-frame"))
            .toMatchScreenshot(`${content}-${interaction}`);
        },
      );
    },
  );
});
