"use client";

import { Fragment, useLayoutEffect, useMemo, type ComponentProps } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { cx } from "../../utils/cx";
import { useMergedRef } from "../../utils/useMergedRef";
import { useScrollableFocus } from "../../utils/useScrollableFocus";
import { refractor, type CodeBlockLanguage } from "./refractor";

export type { CodeBlockLanguage };

// `language` is a new prop (not the native HTML `lang` attribute). HTML `lang`
// is a BCP47 natural-language tag ("en", "ja") — a different concept that
// remains part of the base <pre> attrs and passes through untouched. See
// CodeBlock.test.tsx for the passthrough assertion.
//
// `code` is an alternative to `children` for environments that wrap JSX
// children on the way to a React tree — e.g. Astro's `.astro` → React island
// boundary rewraps `children` as an AstroComponentInstance, breaking the
// `children: string` contract. Named props are passed through as-is, so
// `<CodeBlock code={snippet}>` survives that boundary. `code` wins when both
// are supplied; the same string appears in the rendered DOM either way.
export type CodeBlockProps = Omit<ComponentProps<"pre">, "children"> & {
  /** Code to render. Takes precedence over children; use it where JSX children get rewrapped (e.g. Astro islands). */
  code?: string;
  /** Code to render, as the element's only child. */
  children?: string;
  // `CodeBlockLanguage | (string & {})` is TypeScript's "loose union" pattern:
  // canonical language names surface in autocomplete, but aliases (`ts`, `html`, ...)
  // and dynamically-sourced strings (e.g. from a markdown fenced-code parser) still
  // pass through the type and are resolved at runtime via refractor's alias table.
  /** Prism language name or alias. Unknown or omitted values render as plain text. */
  language?: CodeBlockLanguage | (string & {});
};

export function CodeBlock({
  code,
  children,
  language,
  className,
  onBlur,
  ref: forwardedRef,
  ...rest
}: CodeBlockProps) {
  // `code` takes precedence — see the type doc for the Astro/RSC-wrapped-children
  // rationale. Empty string is the "neither provided" fallback so the component
  // renders a valid empty <pre> instead of throwing on `.highlight(undefined)`.
  const source = code ?? children ?? "";
  // `registered` captures both "language was provided" and "refractor knows it" —
  // used for the highlight path, the language-<x> class, and to keep the class
  // off unhighlighted blocks (so downstream tools and consumer Prism themes
  // don't mistake a raw-text fallback for a highlighted block).
  //
  // useMemo keyed on (children, language) collapses repeated tokenization when a
  // frequently-re-rendering parent forces this component to re-render with the
  // same code — Prism tokenization of a multi-KB snippet + hast → JSX rebuild
  // is not cheap.
  const { highlighted, registered } = useMemo(() => {
    const isRegistered = !!language && refractor.registered(language);
    return {
      registered: isRegistered,
      highlighted: isRegistered
        ? toJsxRuntime(refractor.highlight(source, language), { Fragment, jsx, jsxs })
        : source,
    };
  }, [source, language]);

  // Keyboard reachability of the <pre> (its own scroll container) — tabIndex
  // only while the code actually overflows, kept while focused, safe-side
  // under static SSR — is the shared useScrollableFocus contract (see the
  // hook's header for the full account). The overflowing content is the
  // inline <code>, whose box a ResizeObserver can't watch, so content-driven
  // re-measures are keyed on the source string instead.
  const { scrollerRef, tabIndex, measure } = useScrollableFocus<HTMLPreElement>();
  useLayoutEffect(() => measure(), [measure, source]);

  // Merge the caller's ref with the hook's so both get the <pre> node.
  const mergedRef = useMergedRef(scrollerRef, forwardedRef);

  return (
    <pre
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- axe scrollable-region-focusable requires the <pre> be keyboard-reachable when its content overflows; useScrollableFocus gates this on measured overflow so short snippets stay out of the tab order.
      tabIndex={tabIndex}
      {...rest}
      ref={mergedRef}
      className={cx("ps1ui-codeblock", className)}
      // Chained (not spread) so the caller's handler still runs: the
      // re-measure drops the kept-while-focused tab stop once focus leaves —
      // see useScrollableFocus.
      onBlur={(event) => {
        onBlur?.(event);
        measure();
      }}
    >
      <code className={registered ? `language-${language}` : undefined}>{highlighted}</code>
    </pre>
  );
}
