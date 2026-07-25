import { createElement } from "react";
import type { ComponentProps, CSSProperties, ElementType } from "react";
import { cx } from "../../utils/cx";
import { safePositiveInt } from "../../utils/numbers";
import { resolveResponsive, type Responsive } from "../../utils/responsive";

type GridItemOwnProps<E extends ElementType> = {
  /** Element or component to render instead of the default <div> — pair it with the parent Grid's `as` (e.g. `as="li"` inside `<Grid as="ul">`) so the markup stays valid. */
  as?: E;
  /**
   * Number of grid columns the item spans.
   * @default 1
   */
  colSpan?: Responsive<number>;
};

// Polymorphic prop derivation — `ComponentProps` (ref included) on purpose;
// the full account of why lives on TextProps in Text.tsx.
export type GridItemProps<E extends ElementType = "div"> = GridItemOwnProps<E> &
  Omit<ComponentProps<E>, keyof GridItemOwnProps<E>>;

export function GridItem<E extends ElementType = "div">({
  as,
  colSpan,
  className,
  style,
  ...rest
}: GridItemProps<E>) {
  // `grid-column: span N` requires N ≥ 1 integer — `safePositiveInt` clamps
  // at the system boundary. See utils/numbers.ts for the full rationale.
  const colSpanVars = resolveResponsive(colSpan, "--_griditem-col-span", safePositiveInt);
  // Caller style first, internal `--_*` vars win — see Text.tsx. Cast because
  // csstype has no index signature for `--*` keys (React 19 included).
  const mergedStyle: CSSProperties = {
    ...style,
    ...colSpanVars,
  } as CSSProperties;
  return createElement(as ?? "div", {
    ...rest,
    className: cx("ps1ui-griditem", className),
    style: mergedStyle,
  });
}
