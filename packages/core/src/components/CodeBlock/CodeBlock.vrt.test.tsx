// Visual regression baseline for CodeBlock. Not a variant matrix — each
// case pins a distinct rendering path:
//   - `typescript`: exercises the full Prism token spectrum (keyword,
//     string, function, etc.), catches token→CSS-variable drift.
//   - `diff`: verifies inserted/deleted tokens map to their dedicated
//     inserted/deleted hues (not folded into the generic string group).
//   - `no-language`: unhighlighted fallback path (no `.language-*` class),
//     confirms plain-text renders at the same surface + font as
//     highlighted blocks.
//   - `long-line-scrollable`: exercises the useLayoutEffect measurement
//     that sets `tabIndex={0}` when scrollWidth > clientWidth, so the
//     overflow visual is captured.
//   - `long-line-focus-visible`: same layout, focused via Tab — pins the
//     `:focus-visible` outline that only appears once the block is
//     keyboard-reachable.

import "../../styles/styles.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { server } from "vitest/browser";
import { withPseudoState } from "../../testing/pseudo-state";
import { VrtFrame } from "../../testing/vrt";
import { CodeBlock } from "./CodeBlock";

const TS = `const greeting = "hello, world";
function main() {
  console.log(greeting);
}`;

const DIFF = `- const greeting = "hello";
+ const greeting = "hello, world";
  console.log(greeting);`;

const LONG_LINE = `const veryLongIdentifier = { field: "value that keeps going past the container edge so the block scrolls horizontally" };`;

// Wide enough to keep short snippets readable, narrow enough that the
// long-line case actually overflows and triggers the scrollable path.
const NARROW = 360;
const WIDE = 480;

const CASES: readonly {
  name: string;
  language: string | undefined;
  children: string;
  width: number;
  // Omit for non-focused cases (the common path) — `focus: true` is the
  // exception that stands out.
  focus?: boolean;
}[] = [
  { name: "typescript", language: "typescript", children: TS, width: WIDE },
  { name: "diff", language: "diff", children: DIFF, width: WIDE },
  { name: "no-language", language: undefined, children: TS, width: WIDE },
  { name: "long-line-scrollable", language: "typescript", children: LONG_LINE, width: NARROW },
  {
    name: "long-line-focus-visible",
    language: "typescript",
    children: LONG_LINE,
    width: NARROW,
    focus: true,
  },
];

describe("CodeBlock VRT", () => {
  test.for(CASES)("$name", async ({ name, language, children, width, focus }, ctx) => {
    // CodeBlock's `:focus-visible` fires when the <pre> gains keyboard
    // focus via Tab. macOS Safari's default Full Keyboard Access excludes
    // <pre tabindex=0> the same way it excludes <button>/<a>/checkbox —
    // the WebKit Playwright build matches that default.
    ctx.skip(
      !!focus && server.browser === "webkit",
      "macOS Safari Full Keyboard Access excludes <pre tabindex=0> from Tab",
    );

    const screen = await render(
      <VrtFrame width={width}>
        <CodeBlock language={language} data-testid="vrt-target">
          {children}
        </CodeBlock>
      </VrtFrame>,
    );

    await withPseudoState(
      '[data-testid="vrt-target"]',
      focus ? ["focus-visible"] : [],
      async () => {
        await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(name);
      },
    );
  });
});
