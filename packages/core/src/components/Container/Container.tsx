import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";
import type { SpaceScale } from "../../utils/spacing";

export type ContainerSize = "sm" | "md" | "lg" | "xl" | "full";

export type ContainerProps = ComponentProps<"div"> & {
  size?: ContainerSize;
  px?: SpaceScale;
};

export function Container({ size = "lg", px = "lg", className, ...rest }: ContainerProps) {
  const classes = cx(
    "ps1ui-container",
    `ps1ui-container--size-${size}`,
    `ps1ui-container--px-${px}`,
    className,
  );
  return <div {...rest} className={classes} />;
}
