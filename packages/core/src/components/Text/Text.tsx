import { createElement } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../../utils/cx";

export type TextElement = "p" | "span" | "div" | "label" | "strong" | "em" | "small";

export type TextVariant = "body" | "muted" | "subtle" | "primary" | "accent";
export type TextSize = "xs" | "sm" | "md" | "lg" | "xl";
export type TextWeight = "regular" | "medium" | "semibold" | "bold";

type TextOwnProps<E extends TextElement> = {
  as?: E;
  variant?: TextVariant;
  size?: TextSize;
  weight?: TextWeight;
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
  size = "sm",
  weight,
  truncate = false,
  className,
  ...rest
}: TextProps<E>) {
  const tag = as ?? "p";
  const classes = cx(
    "ps1ui-text",
    `ps1ui-text--${variant}`,
    `ps1ui-text--size-${size}`,
    weight && `ps1ui-text--weight-${weight}`,
    truncate && "ps1ui-text--truncate",
    truncate && INLINE_TEXT_ELEMENTS[tag] && "ps1ui-text--truncate-inline",
    className,
  );

  return createElement(tag, { ...rest, className: classes });
}
