import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

export type CardProps = ComponentProps<"div">;

export function Card({ className, ...rest }: CardProps) {
  const classes = cx("poiui-card", className);
  return <div {...rest} className={classes} />;
}
