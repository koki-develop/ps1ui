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
  // React 18's CSSProperties does not permit `--*` custom-property keys;
  // stamp them via a cast — same pattern used in Grid.tsx. React 19 permits
  // them directly, but the peer-dep range still spans React 18.
  const mergedStyle: CSSProperties = {
    ...style,
    ...sizeVars,
    ...pxVars,
  } as CSSProperties;
  return <div {...rest} className={cx("ps1ui-container", className)} style={mergedStyle} />;
}
