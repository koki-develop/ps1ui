import type { ComponentProps, CSSProperties } from "react";
import { cx } from "../../utils/cx";
import { safePositiveInt } from "../../utils/numbers";
import { resolveResponsive, type Responsive } from "../../utils/responsive";
import { spaceToVar, type SpaceScale } from "../../utils/spacing";

export type GridGap = SpaceScale;

export type GridProps = ComponentProps<"div"> & {
  /**
   * Number of equal-width columns.
   * @default 1
   */
  columns?: Responsive<number>;
  /**
   * Gap between cells on the space scale.
   * @default "md"
   */
  gap?: Responsive<GridGap>;
  /**
   * Make this Grid a container-query context so descendants' responsive props
   * — including child `GridItem`s' `colSpan` — resolve against its width
   * instead of the nearest ancestor container. Costs the Grid its intrinsic
   * width — it collapses to 0 in shrink-to-fit parents (row flex, auto grid
   * track, float), so give it a definite inline size when opting in.
   * @default false
   */
  queryContainer?: boolean;
};

export function Grid({ columns, gap, queryContainer, className, style, ...rest }: GridProps) {
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
  const classes = cx("ps1ui-grid", queryContainer && "ps1ui-grid--query-container", className);
  return <div {...rest} className={classes} style={mergedStyle} />;
}
