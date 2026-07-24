import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

export type DividerOrientation = "horizontal" | "vertical";
export type DividerVariant = "solid" | "dashed" | "dotted";

export type DividerProps = ComponentProps<"hr"> & {
  /** Axis the rule paints along. */
  orientation?: DividerOrientation;
  /** Border style used for the rule. */
  variant?: DividerVariant;
};

export function Divider({
  orientation = "horizontal",
  variant = "solid",
  className,
  ...rest
}: DividerProps) {
  const classes = cx(
    "ps1ui-divider",
    `ps1ui-divider--${orientation}`,
    `ps1ui-divider--${variant}`,
    className,
  );
  // aria-orientation is placed BEFORE `...rest` so a caller-supplied value
  // wins, matching the project-wide passthrough convention. `<hr>`'s implicit
  // ARIA role is `separator`, whose default orientation is `horizontal` — so
  // the attribute is only emitted for vertical, keeping the default DOM clean.
  return (
    <hr
      aria-orientation={orientation === "vertical" ? "vertical" : undefined}
      {...rest}
      className={classes}
    />
  );
}
