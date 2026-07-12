import type { ComponentProps } from "react";

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
  const classes = ["poiui-button", `poiui-button--${variant}`, className]
    .filter(Boolean)
    .join(" ");
  return <button {...rest} type={type} className={classes} />;
}
