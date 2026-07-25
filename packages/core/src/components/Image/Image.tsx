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
  // oxlint-disable-next-line jsx-a11y/alt-text -- ultra-thin <img> wrapper: `alt` is part of ComponentProps<"img"> and reaches the element through `...rest`, which the rule cannot see through. Forwarding it explicitly would only silence the rule, not add a guarantee — the type stays optional either way. Image.test.tsx covers the passthrough for both meaningful and empty (decorative) alt.
  return <img {...rest} className={classes} />;
}
