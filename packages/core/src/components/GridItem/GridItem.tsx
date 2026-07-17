import type { ComponentProps, CSSProperties } from "react";
import { cx } from "../../utils/cx";
import { safePositiveInt } from "../../utils/numbers";
import { resolveResponsive, type Responsive } from "../../utils/responsive";

export type GridItemProps = ComponentProps<"div"> & {
  colSpan?: Responsive<number>;
};

export function GridItem({ colSpan, className, style, ...rest }: GridItemProps) {
  // `grid-column: span N` requires N ≥ 1 integer — `safePositiveInt` clamps
  // at the system boundary. See utils/numbers.ts for the full rationale.
  const colSpanVars = resolveResponsive(colSpan, "--_griditem-col-span", safePositiveInt);
  // Caller style first, internal `--_*` vars win — see Text.tsx. Cast because
  // csstype has no index signature for `--*` keys (React 19 included).
  const mergedStyle: CSSProperties = {
    ...style,
    ...colSpanVars,
  } as CSSProperties;
  return <div {...rest} className={cx("ps1ui-griditem", className)} style={mergedStyle} />;
}
