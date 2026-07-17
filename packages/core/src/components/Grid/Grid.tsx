import type { ComponentProps, CSSProperties } from "react";
import { cx } from "../../utils/cx";
import { safePositiveInt } from "../../utils/numbers";
import { resolveResponsive, type Responsive } from "../../utils/responsive";
import { spaceToVar, type SpaceScale } from "../../utils/spacing";

export type GridGap = SpaceScale;

export type GridProps = ComponentProps<"div"> & {
  columns?: Responsive<number>;
  gap?: Responsive<GridGap>;
};

export function Grid({ columns, gap, className, style, ...rest }: GridProps) {
  // `repeat(N, ...)` requires N ≥ 1 integer — `safePositiveInt` clamps at
  // the system boundary. See utils/numbers.ts for the full rationale.
  const columnsVars = resolveResponsive(columns, "--_grid-columns", safePositiveInt);
  const gapVars = resolveResponsive(gap, "--_grid-gap", spaceToVar);
  // Caller style first, internal `--_*` vars win — see Text.tsx. Cast because
  // csstype has no index signature for `--*` keys (React 19 included).
  const mergedStyle: CSSProperties = {
    ...style,
    ...columnsVars,
    ...gapVars,
  } as CSSProperties;
  return <div {...rest} className={cx("ps1ui-grid", className)} style={mergedStyle} />;
}
