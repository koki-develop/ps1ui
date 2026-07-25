import { createElement } from "react";
import type { ComponentProps, CSSProperties, ElementType } from "react";
import { cx } from "../../utils/cx";
import { listRoleFor } from "../../utils/listSemantics";
import { resolveResponsive, type Responsive } from "../../utils/responsive";
import { spaceToVar, type SpaceScale } from "../../utils/spacing";

export type ContainerSize = "sm" | "md" | "lg" | "xl" | "full";

type ContainerOwnProps<E extends ElementType> = {
  /** Element or component to render instead of the default <div> — e.g. "main" / "section" when the centered measure is also the page landmark. */
  as?: E;
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

// Polymorphic prop derivation — `ComponentProps` (ref included) on purpose;
// the full account of why lives on TextProps in Text.tsx.
export type ContainerProps<E extends ElementType = "div"> = ContainerOwnProps<E> &
  Omit<ComponentProps<E>, keyof ContainerOwnProps<E>>;

// size → max-width. `full` maps to `none` (unbounded), the rest reference
// the --ps1ui-container-* max-width tokens in tokens.css.
const sizeToVar = (v: ContainerSize): string =>
  v === "full" ? "none" : `var(--ps1ui-container-${v})`;

export function Container<E extends ElementType = "div">({
  as,
  size,
  px,
  queryContainer,
  className,
  style,
  ...rest
}: ContainerProps<E>) {
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
  const tag = as ?? "div";
  return createElement(tag, {
    // Placed before `...rest` so a caller-supplied role still wins — see
    // utils/listSemantics.ts for why the <ul> / <ol> / <menu> targets need it.
    role: listRoleFor(tag),
    ...rest,
    className: classes,
    style: mergedStyle,
  });
}
