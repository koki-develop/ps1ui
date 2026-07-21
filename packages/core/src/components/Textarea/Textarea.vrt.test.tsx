// Visual regression baseline for Textarea. Multi-line text input renders
// differently by engine (border metrics, placeholder color rendering, caret,
// resize handle) — VRT locks down each state × content combination so an
// ambient reset change or a token drift can't silently shift how the field
// reads. `multiline` content covers the line-height / padding stack that
// single-line Input can't exercise.
//
// Text inputs / textareas ARE Tab-reachable in Safari's default configuration
// (FKA affects buttons/checkboxes/anchors, not text fields), so no WebKit
// skip is needed.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { type PseudoClass, withPseudoStateFor } from "../../testing/pseudo-state";
import { VrtFrame } from "../../testing/vrt";
import { Textarea } from "./Textarea";

type Content = "empty" | "placeholder" | "filled" | "multiline";
type Interaction = "default" | "hover" | "focus" | "disabled";

const PSEUDO_STATES = ["hover", "focus"] as const satisfies readonly PseudoClass[];

// Textarea.css uses `:focus` (not `:focus-visible`), triggered by any focus
// path — mouse click or Tab — so we use the pseudo-state `focus` handler
// (programmatic `.focus()`) rather than the Tab-based `focus-visible` one.
// Fixed 220px width so the field doesn't span the wrapper's inline-block
// width. Fixed rows=3 pins the height across captures so the resize-handle
// position stays stable engine-to-engine.
const FRAME_WIDTH = 220;
const ROWS = 3;

const CASES: readonly { content: Content; interaction: Interaction }[] = [
  // Interaction matrix on empty + placeholder to catch base border /
  // placeholder-color / resize-handle drift.
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
  // Multi-line content — exclusive to Textarea; locks line-height / padding
  // stack and wrapped-content rendering across engines.
  { content: "multiline", interaction: "default" },
  { content: "multiline", interaction: "focus" },
];

describe("Textarea VRT", () => {
  test.for(CASES)(
    "content=$content / interaction=$interaction",
    async ({ content, interaction }) => {
      const value =
        content === "filled"
          ? "hello world"
          : content === "multiline"
            ? "line one\nline two\nline three"
            : undefined;
      const placeholder = content === "placeholder" ? "write your thoughts…" : undefined;

      const screen = await render(
        <VrtFrame width={FRAME_WIDTH}>
          <Textarea
            aria-label="notes"
            data-testid="vrt-target"
            rows={ROWS}
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
