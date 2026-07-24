import { createElement } from "react";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";
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

// Deliberate exception to the general "use ComponentProps<'tag'>" rule other components follow.
// With the polymorphic `as` prop, TypeScript cannot narrow the `ref` prop's type against the
// resolved element E — allowing `ref` here would silently accept mismatched ref types
// (e.g. a ref typed for HTMLParagraphElement on `<Text as="span" ref={…} />`). Keeping `ref`
// out of the prop type entirely is safer than a misleading loose type; don't switch this
// to ComponentProps for consistency with the other components.
export type TextProps<E extends TextElement = "p"> = TextOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof TextOwnProps<E>>;

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
