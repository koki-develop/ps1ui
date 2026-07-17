import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

// Thin typed wrapper for `<tbody>` inside a `<Table>`. Cell styling lives on
// `.ps1ui-table th / td` in Table.css, so a bare `<tbody>` continues to
// render identically — Tbody exists to give call sites a stable class hook
// (`.ps1ui-tbody`) and a documented API surface for what belongs inside a
// `<Table>` (same contract as ListItem inside List).
export type TbodyProps = ComponentProps<"tbody">;

export function Tbody({ className, ...rest }: TbodyProps) {
  return <tbody {...rest} className={cx("ps1ui-tbody", className)} />;
}
