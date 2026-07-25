import { createElement } from "react";
import type { ComponentProps, CSSProperties, ElementType, ReactNode } from "react";
import { cx } from "../../utils/cx";
import { resolveResponsive, type Responsive } from "../../utils/responsive";
import { isSlotFilled } from "../../utils/slots";
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
  /** Leading element (typically an icon) rendered before children with a shared inline gap. */
  leading?: ReactNode;
  /** Trailing element (typically an icon) rendered after children with a shared inline gap. */
  trailing?: ReactNode;
};

// Polymorphic prop derivation — `ComponentProps` (ref included) on purpose;
// the full account of why lives on TextProps in Text.tsx.
export type AnchorProps<E extends ElementType = "a"> = AnchorOwnProps<E> &
  Omit<ComponentProps<E>, keyof AnchorOwnProps<E>>;

export function Anchor<E extends ElementType = "a">({
  as,
  variant = "primary",
  size,
  leading,
  trailing,
  children,
  className,
  style,
  ...rest
}: AnchorProps<E>) {
  const tag = as ?? "a";
  // Opt-in row layout: without an adornment the link stays the plain inline box
  // it has always been, so it still wraps across line boxes inside running text.
  // An adorned link is an atomic unit by construction — "live ↗" must not break
  // between the word and its icon — which is exactly what inline-flex gives.
  // `isSlotFilled` rather than `!== undefined`: `trailing={isExternal && <Icon/>}`
  // must leave an internal link an ordinary wrapping inline box, not a flex row.
  const hasLeading = isSlotFilled(leading);
  const hasTrailing = isSlotFilled(trailing);
  const adorned = hasLeading || hasTrailing;
  const classes = cx(
    "ps1ui-anchor",
    `ps1ui-anchor--${variant}`,
    adorned && "ps1ui-anchor--adorned",
    className,
  );
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

  // Wrapping `children` in a label box (rather than letting it fall through as a
  // bare flex child) does two jobs: it stops a multi-fragment link text from
  // being split into one flex item per fragment — each then separated by the row
  // gap — and it gives Anchor.css a single element to paint the underline on.
  const content = adorned ? (
    <>
      {hasLeading && <span className="ps1ui-anchor__leading">{leading}</span>}
      <span className="ps1ui-anchor__label">{children}</span>
      {hasTrailing && <span className="ps1ui-anchor__trailing">{trailing}</span>}
    </>
  ) : (
    children
  );

  return createElement(tag, { ...rest, className: classes, style: mergedStyle }, content);
}
