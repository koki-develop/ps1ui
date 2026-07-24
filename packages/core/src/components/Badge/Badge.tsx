import { createElement } from "react";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cx } from "../../utils/cx";

export type BadgeVariant = "solid" | "outline" | "subtle";
export type BadgeColor = "primary" | "accent" | "danger" | "muted";

type BadgeOwnProps<E extends ElementType> = {
  /** Element or component to render instead of the native <span> — pass "button" or "a" to make the badge interactive. */
  as?: E;
  /** Visual weight: "solid" filled, "outline" bordered on transparent, "subtle" color-tinted fill. */
  variant?: BadgeVariant;
  /** Semantic color: "primary", "accent", "danger", or neutral "muted". */
  color?: BadgeColor;
  /** Leading element (typically an icon) rendered before children with a shared inline gap. */
  leading?: ReactNode;
};

// Deliberate exception to the general "use ComponentProps<'tag'>" rule other components follow —
// same reasoning as Button / Anchor / Text: with a polymorphic `as` prop TypeScript cannot
// correctly narrow the `ref` prop's type against the resolved element E. Badge defaults to a
// static <span> for display, and accepts <button> / <a> / router Link components when consumers
// need interactivity — a loose ref type would silently accept mismatched refs, so dropping ref
// from the prop type is safer than a misleading loose type.
export type BadgeProps<E extends ElementType = "span"> = BadgeOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof BadgeOwnProps<E>>;

export function Badge<E extends ElementType = "span">({
  as,
  variant = "subtle",
  color = "primary",
  leading,
  children,
  className,
  ...rest
}: BadgeProps<E>) {
  const tag: ElementType = as ?? "span";
  const classes = cx("ps1ui-badge", `ps1ui-badge--${variant}`, `ps1ui-badge--${color}`, className);
  const content =
    leading !== undefined ? (
      <>
        <span className="ps1ui-badge__leading">{leading}</span>
        {children}
      </>
    ) : (
      children
    );
  return createElement(tag, { ...rest, className: classes }, content);
}
