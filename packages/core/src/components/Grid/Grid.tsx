import type { ComponentProps, CSSProperties } from "react";
import { cx } from "../../utils/cx";
import type { SpaceScale } from "../../utils/spacing";

export type GridGap = SpaceScale;

export type GridProps = ComponentProps<"div"> & {
  columns?: number;
  gap?: GridGap;
};

// CSS custom-property key that Grid.css's `grid-template-columns` reads
// (`repeat(var(--ps1ui-grid-columns), minmax(0, 1fr))`). Encoded as a value
// so the string only exists in one place — a rename here must be paired
// with the CSS.
const COLUMNS_CSS_VAR = "--ps1ui-grid-columns";

export function Grid({ columns = 1, gap = "md", className, style, ...rest }: GridProps) {
  // Clamp to a positive integer: CSS `repeat(N, ...)` requires N ≥ 1,
  // and `repeat(0, ...)` / negative / non-integer / NaN / Infinity is
  // invalid and drops the whole grid-template-columns declaration. Guard
  // here (system boundary) so a caller passing e.g. `columns={items.length}`
  // on an empty list, or `columns={Number(badInput)}`, still renders a
  // valid 1-track grid instead of silently collapsing to auto-flow.
  // `Number.isFinite` gate is required because `Math.max(1, NaN)` is NaN
  // and `Math.max(1, Infinity)` is Infinity — neither hits the clamp.
  const safeColumns = Number.isFinite(columns) ? Math.max(1, Math.floor(columns)) : 1;
  const classes = cx("ps1ui-grid", `ps1ui-grid--gap-${gap}`, className);
  // React 19's CSSProperties permits `--*` custom properties, but the
  // published peer-dep range spans React 18 whose CSSProperties does not;
  // stamp the var via a typed intermediate so consumers on either react
  // types version compile cleanly.
  const mergedStyle: CSSProperties = {
    ...style,
    [COLUMNS_CSS_VAR]: safeColumns,
  } as CSSProperties;
  return <div {...rest} className={classes} style={mergedStyle} />;
}
