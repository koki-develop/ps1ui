import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

// Thin typed wrapper for `<th>` inside a `<Table>`. Header-cell styling
// lives on `.ps1ui-table th` in Table.css, so a bare `<th>` continues to
// render identically — Th exists to give call sites a stable class hook
// (`.ps1ui-th`) and a documented API surface for what belongs inside a
// `<Table>` (same contract as ListItem inside List). Semantics stay native:
// pass `scope="col"` / `scope="row"` exactly as you would on a raw <th>.
export type ThProps = ComponentProps<"th">;

export function Th({ className, ...rest }: ThProps) {
  return <th {...rest} className={cx("ps1ui-th", className)} />;
}
