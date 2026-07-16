import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { cx } from "../../utils/cx";
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
  code?: string;
  children?: string;
  // `CodeBlockLanguage | (string & {})` is TypeScript's "loose union" pattern:
  // canonical language names surface in autocomplete, but aliases (`ts`, `html`, ...)
  // and dynamically-sourced strings (e.g. from a markdown fenced-code parser) still
  // pass through the type and are resolved at runtime via refractor's alias table.
  language?: CodeBlockLanguage | (string & {});
};

export function CodeBlock({
  code,
  children,
  language,
  className,
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

  // axe scrollable-region-focusable: a <pre> with `overflow-x: auto` must be
  // keyboard-reachable IF its content actually overflows. Setting tabIndex=0
  // unconditionally would drop every tiny snippet into the tab order for no
  // benefit and paint a focus ring on hover-focus, so we measure the pre's
  // scrollWidth and only expose it as focusable when it exceeds clientWidth.
  // The initial state is `true` so long code is never *un*reachable on the
  // very first paint, even before useLayoutEffect has had a chance to measure.
  const preRef = useRef<HTMLPreElement | null>(null);
  const [scrollable, setScrollable] = useState(true);
  useLayoutEffect(() => {
    // preRef.current is always populated before useLayoutEffect fires (React sets
    // refs during commit, effects run after), so no defensive null check.
    const el = preRef.current!;
    const measure = () => setScrollable(el.scrollWidth > el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [source]);

  // Merge the caller's ref with our internal preRef so both get the DOM node.
  // Matches the pattern in Checkbox.tsx — see that file for the rationale.
  const mergedRef = useCallback(
    (node: HTMLPreElement | null) => {
      preRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  return (
    <pre
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- axe scrollable-region-focusable requires the <pre> be keyboard-reachable when its content overflows; the effect above gates this on measured overflow so short snippets stay out of the tab order.
      tabIndex={scrollable ? 0 : undefined}
      {...rest}
      ref={mergedRef}
      className={cx("ps1ui-codeblock", className)}
    >
      <code className={registered ? `language-${language}` : undefined}>{highlighted}</code>
    </pre>
  );
}
