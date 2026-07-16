// Shared typography primitives for components that expose a `size` or
// `weight` prop backed by --ps1ui-font-size-* / a discrete numeric
// font-weight scale. Currently consumed by Text and Heading.
//
// A shared surface prevents the two components from silently drifting on
// what "medium" or "sm" means; add a new weight or size once here and both
// components pick it up when they extend their own local unions.

// FontSizeToken is the raw slug shared across every ps1ui typography scale
// (Text: "xs" | "sm" | "md" | "lg" | "xl"; Heading: "sm" | "md" | "lg" |
// "xl" | "2xl" | "3xl"). Each component narrows the union in its own
// component-local size type; `fontSizeToVar` accepts the widest union so it
// can serve both without a cast.
export type FontSizeToken = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

// FontWeight is the shared weight scale — every ps1ui typography component
// maps its `weight` prop through this union.
export type FontWeight = "regular" | "medium" | "semibold" | "bold";

// FontSizeToken → CSS `var(--ps1ui-font-size-<slug>)`. Kept as a single
// mapping function so a token rename lands in one place. Text and Heading
// both call this with their own narrower slug union.
export function fontSizeToVar<S extends FontSizeToken>(v: S): string {
  return `var(--ps1ui-font-size-${v})`;
}

// FontWeight → numeric CSS font-weight. Discrete 100-step scale that keeps
// author declarations (author > UA) in charge: `regular` = 400 (normal),
// `medium` = 500, `semibold` = 600, `bold` = 700. If a future consumer
// wants an even lighter or heavier step, add the union member here and the
// mapping in the same commit.
export function weightToValue(v: FontWeight): number {
  switch (v) {
    case "regular":
      return 400;
    case "medium":
      return 500;
    case "semibold":
      return 600;
    case "bold":
      return 700;
  }
}
