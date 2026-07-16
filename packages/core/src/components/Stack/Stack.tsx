import type { ComponentProps, CSSProperties } from "react";
import { cx } from "../../utils/cx";
import { resolveResponsive, type Responsive } from "../../utils/responsive";
import { spaceToVar, type SpaceScale } from "../../utils/spacing";

export type StackDirection = "row" | "column";
export type StackGap = SpaceScale;
export type StackAlign = "start" | "center" | "end" | "stretch" | "baseline";
export type StackJustify = "start" | "center" | "end" | "between" | "around" | "evenly";

export type StackProps = ComponentProps<"div"> & {
  direction?: Responsive<StackDirection>;
  gap?: Responsive<StackGap>;
  align?: Responsive<StackAlign>;
  justify?: Responsive<StackJustify>;
  wrap?: Responsive<boolean>;
};

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

export function Stack({
  direction,
  gap,
  align,
  justify,
  wrap,
  className,
  style,
  ...rest
}: StackProps) {
  const directionVars = resolveResponsive(direction, "--_stack-direction", directionToValue);
  const gapVars = resolveResponsive(gap, "--_stack-gap", spaceToVar);
  const alignVars = resolveResponsive(align, "--_stack-align", alignToValue);
  const justifyVars = resolveResponsive(justify, "--_stack-justify", justifyToValue);
  const wrapVars = resolveResponsive(wrap, "--_stack-wrap", wrapToValue);

  // React 18's CSSProperties does not permit `--*` custom-property keys;
  // stamp them via a cast — same pattern as Container.tsx and Grid.tsx.
  const mergedStyle: CSSProperties = {
    ...style,
    ...directionVars,
    ...gapVars,
    ...alignVars,
    ...justifyVars,
    ...wrapVars,
  } as CSSProperties;

  return <div {...rest} className={cx("ps1ui-stack", className)} style={mergedStyle} />;
}
