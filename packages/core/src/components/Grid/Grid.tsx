import type { ComponentProps, CSSProperties } from "react";
import { cx } from "../../utils/cx";
import { resolveResponsive, type Responsive } from "../../utils/responsive";
import { spaceToVar, type SpaceScale } from "../../utils/spacing";

export type GridGap = SpaceScale;

export type GridProps = ComponentProps<"div"> & {
  columns?: Responsive<number>;
  gap?: Responsive<GridGap>;
};

// Clamp to a positive integer: CSS `repeat(N, ...)` requires N ≥ 1,
// and `repeat(0, ...)` / negative / non-integer / NaN / Infinity is
// invalid and drops the whole grid-template-columns declaration. Guard
// here (system boundary) so a caller passing e.g. `columns={items.length}`
// on an empty list, or `columns={Number(badInput)}`, still renders a
// valid 1-track grid instead of silently collapsing to auto-flow.
// `Number.isFinite` gate is required because `Math.max(1, NaN)` is NaN
// and `Math.max(1, Infinity)` is Infinity — neither hits the clamp.
// Applied per-breakpoint entry via `resolveResponsive`'s transform,
// so a responsive object like `{ base: NaN, md: 3 }` produces
// `{ --_grid-columns-base: 1, --_grid-columns-md: 3 }`.
function safeColumn(v: number): number {
  return Number.isFinite(v) ? Math.max(1, Math.floor(v)) : 1;
}

export function Grid({ columns, gap, className, style, ...rest }: GridProps) {
  const columnsVars = resolveResponsive(columns, "--_grid-columns", safeColumn);
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
