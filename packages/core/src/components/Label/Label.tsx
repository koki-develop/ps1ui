import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

export type LabelProps = ComponentProps<"label">;

export function Label({ className, ...rest }: LabelProps) {
  const classes = cx("ps1ui-label", className);
  // oxlint-disable-next-line jsx-a11y/label-has-associated-control -- ultra-thin <label> wrapper; the caller supplies htmlFor or nests the control.
  return <label {...rest} className={classes} />;
}
