import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

export type ButtonVariant = "primary" | "secondary";

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = cx("poiui-button", `poiui-button--${variant}`, className);
  return <button {...rest} type={type} className={classes} />;
}
