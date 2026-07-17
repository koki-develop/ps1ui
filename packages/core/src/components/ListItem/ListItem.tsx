import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

// Thin typed wrapper for `<li>` inside a `<List>`. The marker styling lives
// on `.ps1ui-list > li` in List.css, so a bare `<li>` continues to render
// identically — ListItem exists to give call sites a stable class hook
// (`.ps1ui-listitem`, matching GridItem's `.ps1ui-griditem`) and a
// documented API surface for what belongs inside a `<List>`.
export type ListItemProps = ComponentProps<"li">;

export function ListItem({ className, ...rest }: ListItemProps) {
  return <li {...rest} className={cx("ps1ui-listitem", className)} />;
}
