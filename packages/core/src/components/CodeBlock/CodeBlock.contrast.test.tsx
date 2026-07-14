// Contrast regression tests. Loads the real CSS so axe's color-contrast rule can
// compute ratios against the actual painted colors. Each sample is picked to emit
// as many distinct Prism token classes as possible so every --ps1ui-code-* value is
// exercised at least once against both --ps1ui-color-bg and --ps1ui-color-surface.

import "../../styles/index.css";

import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { CodeBlock } from "./CodeBlock";

// Combined sample designed to cover: comment, keyword, string, number, boolean,
// function, class-name/builtin, operator, punctuation, constant (regex, template).
const TS_SAMPLE = `// a leading comment
const answer: number = 42;
const flag: boolean = true;
function greet(name: string): string {
  return \`hello, \${name}\`;
}
class Widget {}
const re = /^ps1ui-/;`;

// Emits tag, attr-name, attr-value tokens (unique to markup/HTML grammars).
const HTML_SAMPLE = `<button type="button" class="primary" aria-label="submit">
  submit
</button>`;

// Diff adds inserted/deleted token classes on top of the shared palette.
const DIFF_SAMPLE = `- const greeting = "hello";
+ const greeting = "hello, world";
  console.log(greeting);`;

const CASES = [
  { name: "typescript", language: "typescript", code: TS_SAMPLE },
  { name: "html (markup)", language: "markup", code: HTML_SAMPLE },
  { name: "diff", language: "diff", code: DIFF_SAMPLE },
] as const;

describe("CodeBlock layout", () => {
  test("resists inherited text-align (stays left-aligned inside a centered container)", async () => {
    // <pre>'s default `text-align: inherit` would let a centered ancestor push
    // each code line to the center — semantically wrong for source code and
    // visually broken. .ps1ui-codeblock pins `text-align: left` explicitly.
    const screen = await render(
      <div style={{ textAlign: "center" }}>
        <CodeBlock data-testid="cb">short</CodeBlock>
      </div>,
    );
    const el = screen.getByTestId("cb").element();
    expect(getComputedStyle(el).textAlign).toBe("left");
  });

  test("stays left-aligned inside an RTL container (does not flip to right)", async () => {
    // `text-align: start` would mean "right" under `dir=rtl`, which is wrong for
    // code. The rule uses `left` specifically to survive RTL contexts.
    const screen = await render(
      <div dir="rtl">
        <CodeBlock data-testid="cb">short</CodeBlock>
      </div>,
    );
    const el = screen.getByTestId("cb").element();
    expect(getComputedStyle(el).textAlign).toBe("left");
  });

  test("forces LTR direction even inside an RTL ancestor", async () => {
    // Without an explicit `direction: ltr`, code inside `<div dir="rtl">` would
    // inherit RTL — character flow reverses at the paragraph level and the
    // horizontal scrollbar starts on the right. Both are wrong for source code.
    const screen = await render(
      <div dir="rtl">
        <CodeBlock data-testid="cb">short</CodeBlock>
      </div>,
    );
    const el = screen.getByTestId("cb").element();
    expect(getComputedStyle(el).direction).toBe("ltr");
  });

  test("pins white-space to `pre` so a consumer reset can't collapse overflow-x", async () => {
    // A global consumer rule like `pre { white-space: pre-wrap; }` would soft-
    // wrap lines and make overflow-x: auto never trigger. We beat that on
    // specificity (class beats tag). Per-instance opt-in via `style={{ whiteSpace: ... }}`
    // still works because inline style outranks the class rule.
    const screen = await render(<CodeBlock data-testid="cb">short</CodeBlock>);
    const el = screen.getByTestId("cb").element();
    expect(getComputedStyle(el).whiteSpace).toBe("pre");
  });

  test("allows per-instance opt-in to wrapping via inline style", async () => {
    // Consumers who DO want a wrapped code block on narrow viewports must be
    // able to override the default without fighting our rule.
    const screen = await render(
      <CodeBlock data-testid="cb" style={{ whiteSpace: "pre-wrap" }}>
        short
      </CodeBlock>,
    );
    const el = screen.getByTestId("cb").element();
    expect(getComputedStyle(el).whiteSpace).toBe("pre-wrap");
  });
});

describe("CodeBlock contrast", () => {
  describe("on --ps1ui-color-bg (page canvas)", () => {
    test.for(CASES)("$name passes WCAG contrast against bg", async ({ language, code }) => {
      // CodeBlock's own `background: var(--ps1ui-color-surface)` normally covers
      // the outer wrapper, so a naive test that only sets the wrapper bg would
      // silently measure contrast vs surface twice. Explicitly override the pre's
      // background to transparent so the outer bg is what axe actually sees behind
      // the highlighted tokens.
      const screen = await render(
        <div style={{ background: "var(--ps1ui-color-bg)", padding: 20 }}>
          <CodeBlock language={language} style={{ background: "transparent", border: "none" }}>
            {code}
          </CodeBlock>
        </div>,
      );
      await expectNoAxeViolations(screen.container);
    });
  });

  describe("on --ps1ui-color-surface (CodeBlock's own surface bg)", () => {
    test.for(CASES)("$name passes WCAG contrast against surface", async ({ language, code }) => {
      // CodeBlock.css sets `background: var(--ps1ui-color-surface)`, so axe
      // naturally sees the surface behind the tokens here without any override.
      const screen = await render(
        <div style={{ background: "var(--ps1ui-color-bg)", padding: 20 }}>
          <CodeBlock language={language}>{code}</CodeBlock>
        </div>,
      );
      await expectNoAxeViolations(screen.container);
    });
  });
});
