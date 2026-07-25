import { createElement } from "react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cx } from "../../utils/cx";
import { resolveResponsive, type Responsive } from "../../utils/responsive";
import { isSlotFilled } from "../../utils/slots";
import {
  fontSizeToVar,
  weightToValue,
  type FontWeight,
  type TypographyVariant,
} from "../../utils/typography";

export type TextElement = "p" | "span" | "div" | "label" | "strong" | "em" | "small";

// TextVariant / TextWeight are re-exports of the shared TypographyVariant /
// FontWeight scales. Keeping component-local aliases preserves the public
// type names (backwards compat) while the underlying scales stay
// single-sourced in utils/typography.ts.
export type TextVariant = TypographyVariant;
export type TextSize = "xs" | "sm" | "md" | "lg" | "xl";
export type TextWeight = FontWeight;

type TextOwnProps<E extends TextElement> = {
  /** Element to render. */
  as?: E;
  /** Color variant. */
  variant?: TextVariant;
  /**
   * Font size on the type scale.
   * @default "sm"
   */
  size?: Responsive<TextSize>;
  /** Font weight. */
  weight?: Responsive<TextWeight>;
  /** Truncate overflowing text with an ellipsis instead of wrapping. */
  truncate?: boolean;
  /** Leading element (typically an icon) rendered before children with a shared inline gap. */
  leading?: ReactNode;
  /** Trailing element (typically an icon) rendered after children with a shared inline gap. */
  trailing?: ReactNode;
};

// Canonical statement of the polymorphic prop-derivation pattern — every `as`-bearing
// component in the library (Anchor / Badge / Button / Container / Grid / GridItem / Heading /
// Stack / Text) repeats this exact shape and points back here.
//
//   <Name>Props<E> = <Name>OwnProps<E> & Omit<ComponentProps<E>, keyof <Name>OwnProps<E>>
//
// `ComponentProps`, not `ComponentPropsWithoutRef`: React 19's ref-as-prop puts `ref` in the
// element's own prop type, and `ComponentProps<E>` resolves per instantiation, so `ref` lands
// typed against whatever `as` actually resolved to — `<Text as="span" ref={pRef} />` with an
// HTMLParagraphElement ref is a type error, not a silent mismatch. (An earlier revision assumed
// TypeScript couldn't narrow it and dropped `ref` here; `src/polymorphic.test-d.tsx` now pins
// that narrowing — including its one inherent limit, React's bivariant `RefCallback` — for all
// nine components, so the exclusion is gone.) Keeping `ref` also matches the library-wide rule
// that a wrapper never costs its caller ref access.
//
// The `Omit` is what makes the own props authoritative: where a native attribute collides with
// an own prop of the same name, the own prop's type wins instead of unioning with the DOM one.
export type TextProps<E extends TextElement = "p"> = TextOwnProps<E> &
  Omit<ComponentProps<E>, keyof TextOwnProps<E>>;

// Exhaustive over TextElement so adding a tag without classifying it fails to typecheck,
// instead of silently leaving the display fixes un-applied for that tag. Two features
// read it: `truncate` (needs inline-block on an inline tag, since an inline box has no
// ellipsis) and the adornment row (needs inline-flex rather than flex, so `<Text as="span"
// leading="★">` stays inline-level inside running text).
const INLINE_TEXT_ELEMENTS: Record<TextElement, boolean> = {
  p: false,
  div: false,
  span: true,
  label: true,
  strong: true,
  em: true,
  small: true,
};

export function Text<E extends TextElement = "p">({
  as,
  variant = "body",
  size,
  weight,
  truncate = false,
  leading,
  trailing,
  children,
  className,
  style,
  ...rest
}: TextProps<E>) {
  const tag = as ?? "p";
  const sizeVars = resolveResponsive(size, "--_text-size", fontSizeToVar);
  const weightVars = resolveResponsive(weight, "--_text-weight", weightToValue);

  // An adornment turns the root into a flex row and wraps `children` in a label
  // box. Both are opt-in: without `leading`/`trailing` the rendered tree is byte
  // for byte what it has always been — no wrapper element, no display change.
  // `isSlotFilled` (not `!== undefined`) is what keeps that promise for
  // `leading={cond && <Icon/>}`, whose false branch must not conjure a gap.
  const hasLeading = isSlotFilled(leading);
  const hasTrailing = isSlotFilled(trailing);
  const adorned = hasLeading || hasTrailing;
  const inline = INLINE_TEXT_ELEMENTS[tag];

  const classes = cx(
    "ps1ui-text",
    `ps1ui-text--${variant}`,
    truncate && "ps1ui-text--truncate",
    // At most one display modifier is emitted. `--adorned-inline` (inline-flex)
    // supersedes `--truncate-inline` (inline-block) when both would apply, and the
    // choice is made here rather than left to CSS source order — the two rules sit
    // at equal specificity, so relying on order would make a later reshuffle of
    // Text.css silently swap the winner.
    truncate && !adorned && inline && "ps1ui-text--truncate-inline",
    adorned && "ps1ui-text--adorned",
    adorned && inline && "ps1ui-text--adorned-inline",
    className,
  );

  // Caller style first, resolved vars last: `--_*` is the reserved internal
  // prefix and wins on purpose — responsive values are prop-controlled. Cast
  // because csstype has no index signature for `--*` keys (React 19 included).
  const mergedStyle: CSSProperties = {
    ...style,
    ...sizeVars,
    ...weightVars,
  } as CSSProperties;

  // `children` is wrapped rather than left as a bare flex child on purpose: a flex
  // container turns each contiguous text run and each element child into its own
  // flex item, so `<Text leading="★">read <Anchor/> now</Text>` would scatter the
  // row gap between every fragment of the sentence. One label box keeps the gap
  // where it belongs — between the adornment and the text — and gives `truncate`
  // an element to hang its ellipsis on (see Text.css).
  const content = adorned ? (
    <>
      {hasLeading && <span className="ps1ui-text__leading">{leading}</span>}
      <span className="ps1ui-text__label">{children}</span>
      {hasTrailing && <span className="ps1ui-text__trailing">{trailing}</span>}
    </>
  ) : (
    children
  );

  return createElement(tag, { ...rest, className: classes, style: mergedStyle }, content);
}
