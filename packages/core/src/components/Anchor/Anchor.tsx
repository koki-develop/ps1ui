import { createElement } from "react";
import type { ComponentProps, CSSProperties, ElementType } from "react";
import { cx } from "../../utils/cx";
import { resolveResponsive, type Responsive } from "../../utils/responsive";
import { fontSizeToVar } from "../../utils/typography";

export type AnchorVariant = "primary" | "subtle";

// AnchorSize covers the same slice of the shared FontSizeToken scale as
// TextSize, so a link and the body copy around it are sized in one
// vocabulary. Deliberately its own type rather than an alias of TextSize:
// both are public API, and neither should silently move when the other
// gains or drops a step.
export type AnchorSize = "xs" | "sm" | "md" | "lg" | "xl";

type AnchorOwnProps<E extends ElementType> = {
  /** Element or component to render instead of the native <a> — e.g. a router Link. */
  as?: E;
  /** Visual style: "primary" for standalone links, "subtle" for links inside running text. */
  variant?: AnchorVariant;
  /** Font size on the type scale. Left unset, the link inherits the surrounding text's size. */
  size?: Responsive<AnchorSize>;
};

// Polymorphic prop derivation — `ComponentProps` (ref included) on purpose;
// the full account of why lives on TextProps in Text.tsx.
export type AnchorProps<E extends ElementType = "a"> = AnchorOwnProps<E> &
  Omit<ComponentProps<E>, keyof AnchorOwnProps<E>>;

export function Anchor<E extends ElementType = "a">({
  as,
  variant = "primary",
  size,
  className,
  style,
  ...rest
}: AnchorProps<E>) {
  const tag = as ?? "a";
  const classes = cx("ps1ui-anchor", `ps1ui-anchor--${variant}`, className);
  // No default size on purpose: an omitted `size` leaves Anchor.css's
  // font-size invalid at computed-value time, which resolves to the
  // inherited size — the only sane behaviour for a link sitting inside
  // running text. See Anchor.css for the mechanism.
  const sizeVars = resolveResponsive(size, "--_anchor-size", fontSizeToVar);

  // Caller style first, resolved vars last: `--_*` is the reserved internal
  // prefix and wins on purpose — responsive values are prop-controlled. Cast
  // because csstype has no index signature for `--*` keys (React 19 included).
  const mergedStyle: CSSProperties = {
    ...style,
    ...sizeVars,
  } as CSSProperties;

  return createElement(tag, { ...rest, className: classes, style: mergedStyle });
}
