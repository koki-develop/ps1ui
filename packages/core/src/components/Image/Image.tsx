import type { ComponentProps } from "react";
import { cx } from "../../utils/cx";

export type ImageVariant = "plain" | "bordered";

export type ImageProps = ComponentProps<"img"> & {
  /**
   * Visual treatment. `plain` renders the raw image, `bordered` adds a
   * token-driven border and radius.
   */
  variant?: ImageVariant;
};

export function Image({ variant = "plain", className, ...rest }: ImageProps) {
  const classes = cx("ps1ui-image", variant !== "plain" && `ps1ui-image--${variant}`, className);
  return <img {...rest} className={classes} />;
}
