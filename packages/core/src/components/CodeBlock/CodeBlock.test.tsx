import { createRef, type ReactElement } from "react";
import { describe, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";
import { expectNoAxeViolations } from "../../testing/axe";
import { CodeBlock, type CodeBlockLanguage } from "./CodeBlock";
import { refractor } from "./refractor";

const TS_SAMPLE = `const greet = (name: string): string => \`hello, \${name}\`;`;
const TSX_SAMPLE = `export const Hi = ({ name }: { name: string }) => <p>hi {name}</p>;`;
const BASH_SAMPLE = `#!/bin/bash\necho "hello world" | grep -oE 'h.+d'`;
const JSON_SAMPLE = `{ "name": "ps1ui", "version": "0.0.0", "private": true }`;
const MD_SAMPLE = `# Title\n\n> quote\n\n- one\n- two\n\n\`code\``;
const CSS_SAMPLE = `.a { color: red; --b: 1px; }`;
const DIFF_SAMPLE = `- old line\n+ new line`;

// `satisfies` fails compilation if any name drifts out of CodeBlockLanguage,
// keeping the a11y matrix in sync with the registered-language enumeration.
const HIGHLIGHTED_LANGUAGES = [
  "typescript",
  "tsx",
  "bash",
  "json",
  "markdown",
  "css",
  "diff",
] as const satisfies readonly CodeBlockLanguage[];

const SAMPLE: Record<(typeof HIGHLIGHTED_LANGUAGES)[number], string> = {
  typescript: TS_SAMPLE,
  tsx: TSX_SAMPLE,
  bash: BASH_SAMPLE,
  json: JSON_SAMPLE,
  markdown: MD_SAMPLE,
  css: CSS_SAMPLE,
  diff: DIFF_SAMPLE,
};

describe("CodeBlock", () => {
  describe("rendering", () => {
    test("renders a <pre> wrapping a <code>", async () => {
      const screen = await render(<CodeBlock data-testid="cb">{TS_SAMPLE}</CodeBlock>);
      const pre = screen.getByTestId("cb").element();
      expect(pre.tagName.toLowerCase()).toBe("pre");
      expect(pre.querySelector("code")).not.toBeNull();
    });

    test("renders raw text (no <span> tokens) when language is omitted", async () => {
      const screen = await render(<CodeBlock data-testid="cb">{TS_SAMPLE}</CodeBlock>);
      const pre = screen.getByTestId("cb").element();
      expect(pre.textContent).toBe(TS_SAMPLE);
      expect(pre.querySelectorAll("span.token").length).toBe(0);
    });

    test("renders raw text when language is not registered in refractor", async () => {
      const screen = await render(
        <CodeBlock data-testid="cb" language="not-a-real-language">
          {TS_SAMPLE}
        </CodeBlock>,
      );
      const pre = screen.getByTestId("cb").element();
      expect(pre.textContent).toBe(TS_SAMPLE);
      expect(pre.querySelectorAll("span.token").length).toBe(0);
    });

    test("emits Prism-style <span class='token …'> nodes when language is registered", async () => {
      const screen = await render(
        <CodeBlock data-testid="cb" language="typescript">
          {TS_SAMPLE}
        </CodeBlock>,
      );
      const pre = screen.getByTestId("cb").element();
      expect(pre.querySelectorAll("span.token").length).toBeGreaterThan(0);
      expect(pre.textContent).toBe(TS_SAMPLE);
    });

    test("emits Prism-style tokens for a registered ALIAS (e.g. 'ts' → typescript)", async () => {
      // Confirms the `(string & {})` escape hatch actually resolves aliases at
      // runtime, not just canonical names. Prevents a regression where the guard
      // (`refractor.registered(language)`) starts rejecting aliases.
      const screen = await render(
        <CodeBlock data-testid="cb" language="ts">
          {TS_SAMPLE}
        </CodeBlock>,
      );
      const pre = screen.getByTestId("cb").element();
      expect(pre.querySelectorAll("span.token").length).toBeGreaterThan(0);
    });
  });

  // The `code` prop exists so consumers can bypass the `children` mechanism
  // in environments that rewrap JSX children (Astro `.astro` → React island,
  // React Server Components → Client Components). Named props are passed
  // through as-is by those boundaries, so `<CodeBlock code={snippet} />`
  // survives them where `<CodeBlock>{snippet}</CodeBlock>` breaks.
  describe("code prop", () => {
    test("renders the string from `code` prop when children are omitted", async () => {
      const screen = await render(<CodeBlock data-testid="cb" code={TS_SAMPLE} />);
      const pre = screen.getByTestId("cb").element();
      expect(pre.textContent).toBe(TS_SAMPLE);
    });

    test("highlights the `code` prop when language is registered", async () => {
      const screen = await render(
        <CodeBlock data-testid="cb" code={TS_SAMPLE} language="typescript" />,
      );
      const pre = screen.getByTestId("cb").element();
      expect(pre.querySelectorAll("span.token").length).toBeGreaterThan(0);
      expect(pre.textContent).toBe(TS_SAMPLE);
    });

    test("`code` wins over `children` when both are supplied", async () => {
      const screen = await render(
        <CodeBlock data-testid="cb" code={TS_SAMPLE}>
          {BASH_SAMPLE}
        </CodeBlock>,
      );
      const pre = screen.getByTestId("cb").element();
      expect(pre.textContent).toBe(TS_SAMPLE);
    });

    test("renders an empty <code> when neither `code` nor `children` are supplied", async () => {
      const screen = await render(<CodeBlock data-testid="cb" />);
      const pre = screen.getByTestId("cb").element();
      expect(pre.querySelector("code")).not.toBeNull();
      expect(pre.textContent).toBe("");
    });
  });

  describe("language-* class on <code>", () => {
    test("adds `language-<lang>` when language is registered", async () => {
      const screen = await render(
        <CodeBlock data-testid="cb" language="typescript">
          {TS_SAMPLE}
        </CodeBlock>,
      );
      const code = screen.getByTestId("cb").element().querySelector("code");
      expect(code?.getAttribute("class")).toBe("language-typescript");
    });

    test("adds `language-<alias>` when an alias resolves to a registered language", async () => {
      // Uses the raw alias string the caller passed, matching Prism convention
      // (a downstream tool that saw `<CodeBlock language="ts">` gets `.language-ts`).
      const screen = await render(
        <CodeBlock data-testid="cb" language="ts">
          {TS_SAMPLE}
        </CodeBlock>,
      );
      const code = screen.getByTestId("cb").element().querySelector("code");
      expect(code?.getAttribute("class")).toBe("language-ts");
    });

    test("omits the language-* class when language is unregistered (typo path)", async () => {
      // The pre-registered-check fix: an unhighlighted block must not advertise
      // itself as a highlighted one via a `.language-*` class. Prevents downstream
      // tools / consumer Prism themes from styling raw-text as highlighted code.
      const screen = await render(
        <CodeBlock data-testid="cb" language="typescrpt">
          {TS_SAMPLE}
        </CodeBlock>,
      );
      const code = screen.getByTestId("cb").element().querySelector("code");
      expect(code?.getAttribute("class")).toBeNull();
    });

    test("omits the language-* class when language is undefined", async () => {
      const screen = await render(<CodeBlock data-testid="cb">{TS_SAMPLE}</CodeBlock>);
      const code = screen.getByTestId("cb").element().querySelector("code");
      expect(code?.getAttribute("class")).toBeNull();
    });
  });

  describe("class composition", () => {
    test("applies the ps1ui-codeblock base class", async () => {
      const screen = await render(<CodeBlock data-testid="cb">{TS_SAMPLE}</CodeBlock>);
      await expect.element(screen.getByTestId("cb")).toHaveClass("ps1ui-codeblock");
    });

    test("merges caller-supplied className without dropping the base class", async () => {
      const screen = await render(
        <CodeBlock data-testid="cb" className="extra">
          {TS_SAMPLE}
        </CodeBlock>,
      );
      const el = screen.getByTestId("cb");
      await expect.element(el).toHaveClass("ps1ui-codeblock");
      await expect.element(el).toHaveClass("extra");
    });
  });

  describe("passthrough", () => {
    test("forwards native <pre> attributes (id, data-*, aria-*)", async () => {
      const screen = await render(
        <CodeBlock id="snippet" aria-label="example" data-testid="cb">
          {TS_SAMPLE}
        </CodeBlock>,
      );
      const el = screen.getByTestId("cb");
      await expect.element(el).toHaveAttribute("id", "snippet");
      await expect.element(el).toHaveAttribute("aria-label", "example");
    });

    test("forwards the style attribute", async () => {
      const screen = await render(
        <CodeBlock data-testid="cb" style={{ maxWidth: 240 }}>
          {TS_SAMPLE}
        </CodeBlock>,
      );
      const el = screen.getByTestId("cb").element() as HTMLPreElement;
      expect(el.style.maxWidth).toBe("240px");
    });

    test("forwards the native HTML lang attribute (BCP47 tag) untouched", async () => {
      // `language` is our syntax-highlighting prop; the native HTML `lang`
      // (BCP47 natural-language tag) must still pass through cleanly so a11y
      // tools see the correct content language.
      const screen = await render(
        <CodeBlock data-testid="cb" lang="ja" language="typescript">
          {TS_SAMPLE}
        </CodeBlock>,
      );
      const el = screen.getByTestId("cb").element();
      expect(el.getAttribute("lang")).toBe("ja");
    });

    test("forwards ref (RefObject) to the underlying <pre>", async () => {
      const ref = createRef<HTMLPreElement>();
      await render(<CodeBlock ref={ref}>{TS_SAMPLE}</CodeBlock>);
      expect(ref.current).toBeInstanceOf(HTMLPreElement);
      expect(ref.current?.tagName.toLowerCase()).toBe("pre");
    });

    test("forwards ref (callback) to the underlying <pre>", async () => {
      const cb = vi.fn<(node: HTMLPreElement | null) => void>();
      await render(<CodeBlock ref={cb}>{TS_SAMPLE}</CodeBlock>);
      expect(cb).toHaveBeenCalled();
      expect(cb.mock.calls[0]?.[0]).toBeInstanceOf(HTMLPreElement);
    });

    test("still records to the caller's ref even though we use an internal ref for ResizeObserver", async () => {
      // Regression guard: the mergedRef must call the caller's ref, not just
      // set the internal one for the scrollable-region observation.
      const ref = createRef<HTMLPreElement>();
      const screen = await render(
        <CodeBlock ref={ref} data-testid="cb">
          {TS_SAMPLE}
        </CodeBlock>,
      );
      expect(ref.current).toBe(screen.getByTestId("cb").element());
    });
  });

  describe("tabIndex (scrollable-region-focusable)", () => {
    test("removes tabindex once ResizeObserver measures non-overflowing content", async () => {
      // Short content fits inside a wide container — no horizontal overflow, so
      // there is no scroll to reach and tabindex should be absent after measurement.
      const screen = await render(
        <div style={{ width: 800 }}>
          <CodeBlock data-testid="cb">short</CodeBlock>
        </div>,
      );
      const el = screen.getByTestId("cb").element() as HTMLPreElement;
      await vi.waitFor(() => {
        expect(el.getAttribute("tabindex")).toBeNull();
      });
    });

    test("keeps tabindex=0 when content overflows horizontally", async () => {
      // Force overflow: constrain maxWidth and use a long unbreakable line.
      // The pre must remain keyboard-focusable so scrollable content is reachable.
      const long = "abcdefghij".repeat(60); // ~600 chars, no whitespace
      const screen = await render(
        <CodeBlock data-testid="cb" style={{ maxWidth: 120 }}>
          {long}
        </CodeBlock>,
      );
      const el = screen.getByTestId("cb").element() as HTMLPreElement;
      await vi.waitFor(() => {
        expect(el.getAttribute("tabindex")).toBe("0");
      });
    });

    test("allows caller to override tabIndex explicitly (prop wins over internal state)", async () => {
      const screen = await render(
        <CodeBlock data-testid="cb" tabIndex={-1}>
          {TS_SAMPLE}
        </CodeBlock>,
      );
      const el = screen.getByTestId("cb").element() as HTMLPreElement;
      await vi.waitFor(() => {
        expect(el.tabIndex).toBe(-1);
      });
    });

    test("updates tabindex when content flips between overflowing and not", async () => {
      // Start non-overflowing (short), then swap in long content; the observer
      // must re-measure and expose tabindex=0. Guards against a naive one-shot
      // measurement that would miss overflow appearing later.
      const short = "short";
      const long = "abcdefghij".repeat(60);
      const screen = await render(
        <CodeBlock data-testid="cb" style={{ maxWidth: 120 }}>
          {short}
        </CodeBlock>,
      );
      const el = screen.getByTestId("cb").element() as HTMLPreElement;
      await vi.waitFor(() => {
        expect(el.getAttribute("tabindex")).toBeNull();
      });
      screen.rerender(
        <CodeBlock data-testid="cb" style={{ maxWidth: 120 }}>
          {long}
        </CodeBlock>,
      );
      await vi.waitFor(() => {
        expect(el.getAttribute("tabindex")).toBe("0");
      });
    });
  });

  describe("language enumeration", () => {
    // `refractor.registered("clike")` and `refractor.registered("markup-templating")`
    // return true at runtime because refractor's common bundle pre-registers them —
    // they exist to be extended by other grammars (php, java, django, twig, blade, …),
    // not to be highlighted directly. Passing them as the top-level language would
    // yield near-empty tokenization, so CodeBlockLanguage must NOT list them.

    test("excludes 'clike' from CodeBlockLanguage even though refractor registers it", () => {
      // Compile-time assertion: fails to type-check the moment "clike" is added
      // back to KNOWN_LANGS. `true` is only assignable to `never` if the extends
      // clause resolves to `never` — i.e. "clike" is NOT in CodeBlockLanguage.
      const _excluded: "clike" extends CodeBlockLanguage ? never : true = true;
      expect(_excluded).toBe(true);
      // Runtime sanity: refractor still has it (other grammars extend it).
      expect(refractor.registered("clike")).toBe(true);
    });

    test("excludes 'markup-templating' from CodeBlockLanguage even though refractor registers it", () => {
      const _excluded: "markup-templating" extends CodeBlockLanguage ? never : true = true;
      expect(_excluded).toBe(true);
      expect(refractor.registered("markup-templating")).toBe(true);
    });
  });

  describe("re-render behavior", () => {
    // The useMemo cache in CodeBlock.tsx is a performance concern (avoid re-
    // tokenizing multi-KB code on every parent re-render) and not directly
    // observable from the DOM. What IS observable is that the highlighted <code>
    // subtree updates correctly when children/language change and stays stable
    // otherwise — regressions in the memo deps show up as either stale content
    // (deps too narrow) or CLS flicker (deps too wide).

    test("re-highlights the DOM when children change", async () => {
      const before = `const a = 1;`;
      const after = `const zzz = "different";`;
      const screen = await render(
        <CodeBlock data-testid="cb" language="typescript">
          {before}
        </CodeBlock>,
      );
      expect(screen.getByTestId("cb").element().textContent).toBe(before);
      screen.rerender(
        <CodeBlock data-testid="cb" language="typescript">
          {after}
        </CodeBlock>,
      );
      await vi.waitFor(() => {
        expect(screen.getByTestId("cb").element().textContent).toBe(after);
      });
    });

    test("re-highlights the DOM when language changes", async () => {
      // Uses the language-* class to prove the highlight actually re-ran (as
      // opposed to only the class updating): the previous DOM state's tokens
      // would remain if useMemo cached with stale deps.
      const screen = await render(
        <CodeBlock data-testid="cb" language="typescript">
          {TS_SAMPLE}
        </CodeBlock>,
      );
      const codeEl = () => screen.getByTestId("cb").element().querySelector("code");
      expect(codeEl()?.getAttribute("class")).toBe("language-typescript");
      screen.rerender(
        <CodeBlock data-testid="cb" language="json">
          {TS_SAMPLE}
        </CodeBlock>,
      );
      await vi.waitFor(() => {
        expect(codeEl()?.getAttribute("class")).toBe("language-json");
      });
    });

    test("preserves the highlighted DOM when a parent re-renders with unchanged code+language", async () => {
      // If useMemo's deps drift or the cache breaks, refractor.highlight and
      // toJsxRuntime rebuild the token tree, producing new DOM nodes. Keeping
      // the same <code> element identity across re-renders proves the memo cache
      // is intact — React reuses the element it got from the memo'd JSX.
      const Parent = ({ n }: { n: number }) => (
        <>
          <span data-testid="n">{n}</span>
          <CodeBlock data-testid="cb" language="typescript">
            {TS_SAMPLE}
          </CodeBlock>
        </>
      );
      const screen = await render(<Parent n={0} />);
      const initialCode = screen.getByTestId("cb").element().querySelector("code");
      const initialTokens = initialCode?.querySelectorAll("span.token");
      screen.rerender(<Parent n={1} />);
      await vi.waitFor(() => {
        expect(screen.getByTestId("n").element().textContent).toBe("1");
      });
      const afterCode = screen.getByTestId("cb").element().querySelector("code");
      const afterTokens = afterCode?.querySelectorAll("span.token");
      // Same <code> node reused (DOM identity), same tokens (child identity by index).
      expect(afterCode).toBe(initialCode);
      expect(afterTokens?.length).toBe(initialTokens?.length);
      expect(afterTokens?.[0]).toBe(initialTokens?.[0]);
    });
  });

  describe("a11y", () => {
    type A11yCase = { name: string; node: () => ReactElement };

    const highlightedCases: A11yCase[] = HIGHLIGHTED_LANGUAGES.map(
      (language): A11yCase => ({
        name: `language=${language}`,
        node: () => <CodeBlock language={language}>{SAMPLE[language]}</CodeBlock>,
      }),
    );

    const cases: A11yCase[] = [
      ...highlightedCases,
      { name: "no language (raw text)", node: () => <CodeBlock>{TS_SAMPLE}</CodeBlock> },
      {
        name: "unknown language (raw text)",
        node: () => <CodeBlock language="not-real">{TS_SAMPLE}</CodeBlock>,
      },
    ];

    test.for(cases)("$name → no axe violations", async ({ node }) => {
      const screen = await render(node());
      await expectNoAxeViolations(screen.container);
    });
  });
});
