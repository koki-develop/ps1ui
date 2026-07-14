// Contrast regression tests. Loads the real CSS so axe's color-contrast rule can
// compute ratios against the actual painted colors. Each sample is picked to emit
// as many distinct Prism token classes as possible so every --ps1ui-code-* value is
// exercised at least once against both --ps1ui-color-bg and --ps1ui-color-surface.

import "../../styles/index.css";

import { describe, test } from "vitest";
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
