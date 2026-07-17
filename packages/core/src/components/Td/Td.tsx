import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

// Thin typed wrapper for `<td>` inside a `<Table>`. Data-cell styling lives
// on `.ps1ui-table td` in Table.css, so a bare `<td>` continues to render
// identically — Td exists to give call sites a stable class hook
// (`.ps1ui-td`) and a documented API surface for what belongs inside a
// `<Table>` (same contract as ListItem inside List).
export type TdProps = ComponentProps<"td">;

export function Td({ className, ...rest }: TdProps) {
  return <td {...rest} className={cx("ps1ui-td", className)} />;
}
