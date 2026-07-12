import type { ComponentProps } from "react";

export type InputProps = ComponentProps<"input">;

export function Input({ className, type = "text", ...rest }: InputProps) {
  const classes = ["poiui-input", className].filter(Boolean).join(" ");
  return <input {...rest} type={type} className={classes} />;
}
