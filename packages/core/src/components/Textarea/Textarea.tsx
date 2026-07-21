import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

export type TextareaProps = ComponentProps<"textarea">;

export function Textarea({ className, ...rest }: TextareaProps) {
  const classes = cx("ps1ui-textarea", className);
  return <textarea {...rest} className={classes} />;
}
