// Clamp to a positive integer (≥ 1). Used at system boundaries where a
// CSS property requires a positive-integer count and any other value drops
// the whole declaration:
//   - `grid-template-columns: repeat(N, ...)` (Grid columns) — N ≥ 1 integer
//   - `grid-column: span N` (GridItem colSpan) — N ≥ 1 integer
//
// Guard here so a caller passing e.g. `items.length` on an empty list, or
// `Number(badInput)`, still produces a valid 1-track value instead of the
// browser silently dropping the declaration (which collapses the grid to
// auto-flow / 1-track defaults — often the same visible result, but not
// on negative / fractional inputs, and the debug story is worse either way).
//
// `Number.isFinite` gate is required because `Math.max(1, NaN)` is NaN and
// `Math.max(1, Infinity)` is Infinity — neither hits the `Math.max(1, ...)`
// clamp. Applied per-breakpoint entry when passed as a `resolveResponsive`
// transform, so a responsive object like `{ base: NaN, md: 3 }` produces
// `{ ${prefix}-base: 1, ${prefix}-md: 3 }`.
export function safePositiveInt(v: number): number {
  return Number.isFinite(v) ? Math.max(1, Math.floor(v)) : 1;
}
