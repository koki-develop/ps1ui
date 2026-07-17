import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

// Thin typed wrapper for `<tr>` inside a `<Table>`. Cell styling lives on
// `.ps1ui-table th / td` in Table.css, so a bare `<tr>` continues to render
// identically — Tr exists to give call sites a stable class hook
// (`.ps1ui-tr`) and a documented API surface for what belongs inside a
// `<Table>` (same contract as ListItem inside List).
export type TrProps = ComponentProps<"tr">;

export function Tr({ className, ...rest }: TrProps) {
  return <tr {...rest} className={cx("ps1ui-tr", className)} />;
}
