import type { ComponentProps } from "react";

export type CardProps = ComponentProps<"div">;

export function Card({ className, ...rest }: CardProps) {
  const classes = ["poiui-card", className].filter(Boolean).join(" ");
  return <div {...rest} className={classes} />;
}
