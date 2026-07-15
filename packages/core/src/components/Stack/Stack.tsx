import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";
import type { SpaceScale } from "../../utils/spacing";

export type StackDirection = "row" | "column";
export type StackGap = SpaceScale;
export type StackAlign = "start" | "center" | "end" | "stretch" | "baseline";
export type StackJustify = "start" | "center" | "end" | "between" | "around" | "evenly";

export type StackProps = ComponentProps<"div"> & {
  direction?: StackDirection;
  gap?: StackGap;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
};

export function Stack({
  direction = "column",
  gap = "md",
  align,
  justify,
  wrap = false,
  className,
  ...rest
}: StackProps) {
  const classes = cx(
    "ps1ui-stack",
    `ps1ui-stack--direction-${direction}`,
    `ps1ui-stack--gap-${gap}`,
    align && `ps1ui-stack--align-${align}`,
    justify && `ps1ui-stack--justify-${justify}`,
    wrap && "ps1ui-stack--wrap",
    className,
  );
  return <div {...rest} className={classes} />;
}
