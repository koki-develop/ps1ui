// Shared spacing scale for layout primitives (Stack `gap`, Grid `gap`,
// Container `px`, and any future primitive that consumes a horizontal /
// vertical spacing token). Mirrors the `--ps1ui-space-*` tokens in
// `src/styles/tokens.css` one-to-one, with the `none` sentinel for 0.
//
// A single shared type prevents drift across primitives — a future scale
// addition (e.g. `3xl`) touches this file once; each consumer's `gap` /
// `px` prop picks it up for free.
export type SpaceScale = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

// SpaceScale → CSS value. `none` is `0` (unitless — pair with any length
// context); every other value is a `var(...)` reference to the matching
// `--ps1ui-space-*` token so a token rename cascades naturally.
//
// Kept alongside `SpaceScale` on purpose: the mapping is 1:1 with the union,
// so a new scale value forces a co-located update instead of drifting away
// in a component's private helper. Every layout primitive that maps a
// SpaceScale prop to inline CSS custom-property values calls this — Container
// (`px`), Grid (`gap`), Stack (`gap`) — so any future rename or sentinel
// change lands in exactly one place.
export function spaceToVar(v: SpaceScale): string {
  return v === "none" ? "0" : `var(--ps1ui-space-${v})`;
}
