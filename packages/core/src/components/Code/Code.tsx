import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

export type CodeProps = ComponentProps<"code">;

export function Code({ className, ...rest }: CodeProps) {
  const classes = cx("ps1ui-code", className);
  return <code {...rest} className={classes} />;
}
