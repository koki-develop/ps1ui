import { createElement } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../../utils/cx";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingElement = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type HeadingSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
export type HeadingWeight = "regular" | "medium" | "semibold" | "bold";

type HeadingOwnProps<E extends HeadingElement> = {
  level: HeadingLevel;
  as?: E;
  size?: HeadingSize;
  weight?: HeadingWeight;
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
  size,
  weight,
  className,
  ...rest
}: HeadingProps<E>) {
  const tag = as ?? (`h${level}` as HeadingElement);
  const defaults = LEVEL_DEFAULTS[level];
  const finalSize = size ?? defaults.size;
  const finalWeight = weight ?? defaults.weight;
  const classes = cx(
    "ps1ui-heading",
    `ps1ui-heading--size-${finalSize}`,
    `ps1ui-heading--weight-${finalWeight}`,
    className,
  );
  return createElement(tag, { ...rest, className: classes });
}
