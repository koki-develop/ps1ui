import { createElement } from "react";
import type { ComponentProps, ElementType, ReactNode } from "react";
import { cx } from "../../utils/cx";
import { isSlotFilled } from "../../utils/slots";

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

// Polymorphic prop derivation — `ComponentProps` (ref included) on purpose;
// the full account of why lives on TextProps in Text.tsx.
export type BadgeProps<E extends ElementType = "span"> = BadgeOwnProps<E> &
  Omit<ComponentProps<E>, keyof BadgeOwnProps<E>>;

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
  // `isSlotFilled`, not `!== undefined`: the badge root carries a permanent
  // flex `gap`, so a slot opened for the false branch of
  // `leading={hasIcon && <Icon/>}` shows up as visible space before the label
  // with nothing in it. See utils/slots.ts for the full set of excluded values.
  const content = isSlotFilled(leading) ? (
    <>
      <span className="ps1ui-badge__leading">{leading}</span>
      {children}
    </>
  ) : (
    children
  );
  return createElement(tag, { ...rest, className: classes }, content);
}
