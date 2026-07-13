import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

export type InputProps = ComponentProps<"input">;

export function Input({ className, type = "text", ...rest }: InputProps) {
  const classes = cx("ps1ui-input", className);
  return <input {...rest} type={type} className={classes} />;
}
