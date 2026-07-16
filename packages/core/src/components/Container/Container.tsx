import type { ComponentProps, CSSProperties } from "react";
import { cx } from "../../utils/cx";
import { resolveResponsive, type Responsive } from "../../utils/responsive";
import { spaceToVar, type SpaceScale } from "../../utils/spacing";

export type ContainerSize = "sm" | "md" | "lg" | "xl" | "full";

export type ContainerProps = ComponentProps<"div"> & {
  size?: Responsive<ContainerSize>;
  px?: Responsive<SpaceScale>;
};

// size → max-width. `full` maps to `none` (unbounded), the rest reference
// the --ps1ui-container-* max-width tokens in tokens.css.
const sizeToVar = (v: ContainerSize): string =>
  v === "full" ? "none" : `var(--ps1ui-container-${v})`;

export function Container({ size, px, className, style, ...rest }: ContainerProps) {
  const sizeVars = resolveResponsive(size, "--_container-size", sizeToVar);
  const pxVars = resolveResponsive(px, "--_container-px", spaceToVar);
  // Caller style first, internal `--_*` vars win — see Text.tsx. Cast because
  // csstype has no index signature for `--*` keys (React 19 included).
  const mergedStyle: CSSProperties = {
    ...style,
    ...sizeVars,
    ...pxVars,
  } as CSSProperties;
  return <div {...rest} className={cx("ps1ui-container", className)} style={mergedStyle} />;
}
