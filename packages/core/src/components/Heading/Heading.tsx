import { createElement } from "react";
import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { cx } from "../../utils/cx";
import { resolveResponsive, withResponsiveBase, type Responsive } from "../../utils/responsive";
import { fontSizeToVar, weightToValue, type FontWeight } from "../../utils/typography";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingElement = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type HeadingSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
// HeadingWeight is a re-export of the shared FontWeight scale. Keeping a
// component-local alias preserves the public type name (backwards compat)
// while the underlying scale stays single-sourced in utils/typography.ts.
export type HeadingWeight = FontWeight;

type HeadingOwnProps<E extends HeadingElement> = {
  /** Semantic level: renders the matching h1–h6 tag and sets the default size and weight. */
  level: HeadingLevel;
  /** Heading tag to render when it should differ from level — visual defaults stay driven by level. */
  as?: E;
  /** Font size. Defaults to the level's size. */
  size?: Responsive<HeadingSize>;
  /** Font weight. Defaults to the level's weight. */
  weight?: Responsive<HeadingWeight>;
};

// Deliberate exception to the general "use ComponentProps<'tag'>" rule other components follow —
// same reasoning as Text: with a polymorphic `as` prop TypeScript cannot correctly narrow the
// `ref` type. All h1-h6 do resolve to HTMLHeadingElement so ref would happen to work today, but
// keeping the polymorphic pattern consistent avoids surprises if the tag set ever widens.
export type HeadingProps<E extends HeadingElement = HeadingElement> = HeadingOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof HeadingOwnProps<E>>;

// Exhaustive over HeadingLevel so a new level cannot be added without classifying its defaults.
const LEVEL_DEFAULTS: Record<HeadingLevel, { size: HeadingSize; weight: HeadingWeight }> = {
  1: { size: "3xl", weight: "bold" },
  2: { size: "2xl", weight: "semibold" },
  3: { size: "xl", weight: "semibold" },
  4: { size: "lg", weight: "semibold" },
  5: { size: "md", weight: "medium" },
  6: { size: "sm", weight: "medium" },
};

export function Heading<E extends HeadingElement = HeadingElement>({
  level,
  as,
  size: sizeProp,
  weight: weightProp,
  className,
  style,
  ...rest
}: HeadingProps<E>) {
  const tag = as ?? (`h${level}` as HeadingElement);
  const defaults = LEVEL_DEFAULTS[level];
  // `withResponsiveBase` bakes the level's default in at the `base`
  // breakpoint when the caller either omits the prop entirely or passes a
  // responsive object with no `base` entry. Concretely, `<Heading level={1}
  // size={{ md: "2xl" }}>` renders as level 1's default `3xl` at base, then
  // `2xl` at the md breakpoint — matching the intuition "level sets the
  // default; the object overrides at specific widths".
  const size = withResponsiveBase(sizeProp, defaults.size);
  const weight = withResponsiveBase(weightProp, defaults.weight);

  const sizeVars = resolveResponsive(size, "--_heading-size", fontSizeToVar);
  const weightVars = resolveResponsive(weight, "--_heading-weight", weightToValue);

  // Caller style first, internal `--_*` vars win — see Text.tsx. Cast because
  // csstype has no index signature for `--*` keys (React 19 included).
  const mergedStyle: CSSProperties = {
    ...style,
    ...sizeVars,
    ...weightVars,
  } as CSSProperties;

  return createElement(tag, {
    ...rest,
    className: cx("ps1ui-heading", className),
    style: mergedStyle,
  });
}
