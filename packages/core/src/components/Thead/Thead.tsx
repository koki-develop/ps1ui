import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

// Thin typed wrapper for `<thead>` inside a `<Table>`. All header styling
// lives on `.ps1ui-table thead th` in Table.css, so a bare `<thead>`
// continues to render identically — Thead exists to give call sites a stable
// class hook (`.ps1ui-thead`) and a documented API surface for what belongs
// inside a `<Table>` (same contract as ListItem inside List).
export type TheadProps = ComponentProps<"thead">;

export function Thead({ className, ...rest }: TheadProps) {
  return <thead {...rest} className={cx("ps1ui-thead", className)} />;
}
