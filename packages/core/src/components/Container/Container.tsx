import type { ComponentProps, CSSProperties } from "react";
import { cx } from "../../utils/cx";
import { resolveResponsive, type Responsive } from "../../utils/responsive";
import { spaceToVar, type SpaceScale } from "../../utils/spacing";

export type ContainerSize = "sm" | "md" | "lg" | "xl" | "full";

export type ContainerProps = ComponentProps<"div"> & {
  /**
   * Max-width preset; "full" removes the cap.
   * @default "lg"
   */
  size?: Responsive<ContainerSize>;
  /**
   * Horizontal padding on the space scale.
   * @default "lg"
   */
  px?: Responsive<SpaceScale>;
  /**
   * Make this Container a container-query context so descendants' responsive
   * props resolve against its width instead of the nearest ancestor
   * container. Costs the Container its intrinsic width — `width: 100%` keeps
   * it upright in most parents, but as an auto-sized grid track's item it
   * still collapses to 0.
   * @default false
   */
  queryContainer?: boolean;
};

// size → max-width. `full` maps to `none` (unbounded), the rest reference
// the --ps1ui-container-* max-width tokens in tokens.css.
const sizeToVar = (v: ContainerSize): string =>
  v === "full" ? "none" : `var(--ps1ui-container-${v})`;

export function Container({ size, px, queryContainer, className, style, ...rest }: ContainerProps) {
  const sizeVars = resolveResponsive(size, "--_container-size", sizeToVar);
  const pxVars = resolveResponsive(px, "--_container-px", spaceToVar);
  // Caller style first, internal `--_*` vars win — see Text.tsx. Cast because
  // csstype has no index signature for `--*` keys (React 19 included).
  const mergedStyle: CSSProperties = {
    ...style,
    ...sizeVars,
    ...pxVars,
  } as CSSProperties;
  const classes = cx(
    "ps1ui-container",
    queryContainer && "ps1ui-container--query-container",
    className,
  );
  return <div {...rest} className={classes} style={mergedStyle} />;
}
