// Shared spacing scale for layout primitives (Stack `gap`, Grid `gap`,
// Container `px`, and any future primitive that consumes a horizontal /
// vertical spacing token). Mirrors the `--ps1ui-space-*` tokens in
// `src/styles/tokens.css` one-to-one, with the `none` sentinel for 0.
//
// A single shared type prevents drift across primitives — a future scale
// addition (e.g. `3xl`) touches this file once; each consumer's `gap` /
// `px` prop picks it up for free.
export type SpaceScale = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
