import { createElement } from "react";
import type { ComponentProps, CSSProperties, ElementType } from "react";
import { cx } from "../../utils/cx";
import { listRoleFor } from "../../utils/listSemantics";
import { resolveResponsive, type Responsive } from "../../utils/responsive";
import { spaceToVar, type SpaceScale } from "../../utils/spacing";

export type StackDirection = "row" | "column";
export type StackGap = SpaceScale;
export type StackAlign = "start" | "center" | "end" | "stretch" | "baseline";
export type StackJustify = "start" | "center" | "end" | "between" | "around" | "evenly";

type StackOwnProps<E extends ElementType> = {
  /** Element or component to render instead of the default <div> — e.g. "nav" / "main" when the layout box also carries page semantics. */
  as?: E;
  /**
   * Main-axis direction.
   * @default "column"
   */
  direction?: Responsive<StackDirection>;
  /**
   * Gap between items on the space scale.
   * @default "md"
   */
  gap?: Responsive<StackGap>;
  /** Cross-axis alignment (align-items). */
  align?: Responsive<StackAlign>;
  /** Main-axis distribution (justify-content). */
  justify?: Responsive<StackJustify>;
  /**
   * Wrap items onto multiple lines instead of overflowing.
   * @default false
   */
  wrap?: Responsive<boolean>;
  /**
   * Make this Stack a container-query context so descendants' responsive
   * props resolve against its width instead of the nearest ancestor
   * container. Costs the Stack its intrinsic width — it collapses to 0 in
   * shrink-to-fit parents (row flex, auto grid track, float), so give it a
   * definite inline size when opting in.
   * @default false
   */
  queryContainer?: boolean;
};

// Polymorphic prop derivation — `ComponentProps` (ref included) on purpose;
// the full account of why lives on TextProps in Text.tsx.
export type StackProps<E extends ElementType = "div"> = StackOwnProps<E> &
  Omit<ComponentProps<E>, keyof StackOwnProps<E>>;

// direction values pass straight through — CSS flex-direction accepts
// `row` / `column` (and `row-reverse` / `column-reverse`, which the union
// deliberately excludes; add those to the union if the API ever grows).
const directionToValue = (v: StackDirection): string => v;

// Flexbox uses `flex-start` / `flex-end` in the box-alignment spec. The
// StackAlign union exposes the shorter `start` / `end` alias for terseness;
// the transform remaps them so the CSS variable holds a valid `align-items`
// value directly.
const alignToValue = (v: StackAlign): string => {
  switch (v) {
    case "start":
      return "flex-start";
    case "end":
      return "flex-end";
    default:
      return v;
  }
};

// Same treatment as `alignToValue`, plus expansions for the `space-*`
// justify-content variants.
const justifyToValue = (v: StackJustify): string => {
  switch (v) {
    case "start":
      return "flex-start";
    case "end":
      return "flex-end";
    case "between":
      return "space-between";
    case "around":
      return "space-around";
    case "evenly":
      return "space-evenly";
    default:
      return v;
  }
};

// boolean → CSS flex-wrap keyword.
const wrapToValue = (v: boolean): string => (v ? "wrap" : "nowrap");

export function Stack<E extends ElementType = "div">({
  as,
  direction,
  gap,
  align,
  justify,
  wrap,
  queryContainer,
  className,
  style,
  ...rest
}: StackProps<E>) {
  const directionVars = resolveResponsive(direction, "--_stack-direction", directionToValue);
  const gapVars = resolveResponsive(gap, "--_stack-gap", spaceToVar);
  const alignVars = resolveResponsive(align, "--_stack-align", alignToValue);
  const justifyVars = resolveResponsive(justify, "--_stack-justify", justifyToValue);
  const wrapVars = resolveResponsive(wrap, "--_stack-wrap", wrapToValue);

  // Caller style first, internal `--_*` vars win — see Text.tsx. Cast because
  // csstype has no index signature for `--*` keys (React 19 included).
  const mergedStyle: CSSProperties = {
    ...style,
    ...directionVars,
    ...gapVars,
    ...alignVars,
    ...justifyVars,
    ...wrapVars,
  } as CSSProperties;

  const classes = cx("ps1ui-stack", queryContainer && "ps1ui-stack--query-container", className);

  const tag = as ?? "div";
  return createElement(tag, {
    // Placed before `...rest` so a caller-supplied role still wins — see
    // utils/listSemantics.ts for why the <ul> / <ol> / <menu> targets need it.
    role: listRoleFor(tag),
    ...rest,
    className: classes,
    style: mergedStyle,
  });
}
