import { createElement } from "react";
import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cx } from "../../utils/cx";

export type AnchorVariant = "primary" | "subtle";

type AnchorOwnProps<E extends ElementType> = {
  as?: E;
  variant?: AnchorVariant;
};

// Deliberate exception to the general "use ComponentProps<'tag'>" rule other components follow —
// same reasoning as Text: with a polymorphic `as` prop TypeScript cannot correctly narrow the
// `ref` prop's type. Anchor accepts both string tags and React component types (`as={NextLink}`),
// so a loose ref type would silently accept mismatched refs; dropping ref from the prop type is
// safer than a misleading loose type.
export type AnchorProps<E extends ElementType = "a"> = AnchorOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof AnchorOwnProps<E>>;

export function Anchor<E extends ElementType = "a">({
  as,
  variant = "primary",
  className,
  ...rest
}: AnchorProps<E>) {
  const tag = as ?? "a";
  const classes = cx("ps1ui-anchor", `ps1ui-anchor--${variant}`, className);
  return createElement(tag, { ...rest, className: classes });
}
