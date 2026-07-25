import { createElement } from "react";
import type { ComponentProps, CSSProperties } from "react";
import { cx } from "../../utils/cx";
import { resolveResponsive, type Responsive } from "../../utils/responsive";
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
// instead of silently leaving truncate's inline-block fix un-applied for that tag.
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
  className,
  style,
  ...rest
}: TextProps<E>) {
  const tag = as ?? "p";
  const sizeVars = resolveResponsive(size, "--_text-size", fontSizeToVar);
  const weightVars = resolveResponsive(weight, "--_text-weight", weightToValue);

  const classes = cx(
    "ps1ui-text",
    `ps1ui-text--${variant}`,
    truncate && "ps1ui-text--truncate",
    truncate && INLINE_TEXT_ELEMENTS[tag] && "ps1ui-text--truncate-inline",
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

  return createElement(tag, { ...rest, className: classes, style: mergedStyle });
}
