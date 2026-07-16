// Shared responsive prop primitives.
//
// A "responsive value" is either a scalar of type T, or a Partial record keyed
// by breakpoint name. The five breakpoints are `base` / `sm` / `md` / `lg` /
// `xl`, mobile-first: `base` is the value used at the narrowest container
// width, and each wider breakpoint OVERRIDES the previous when its
// `@container (min-width: X)` condition matches.
//
// Values are propagated to CSS via an inline-style cascade of CSS custom
// properties: each responsive prop emits `${prefix}-${breakpoint}` custom
// properties; the component's CSS then reads them inside `@container` blocks
// with a fallback chain so a missing breakpoint inherits from the previous one.
// See any responsive component's `.css` file for the concrete pattern.

export type Breakpoint = "base" | "sm" | "md" | "lg" | "xl";

// Ordered narrowest → widest. The cascade in CSS reads this same order.
export const BREAKPOINTS = [
  "base",
  "sm",
  "md",
  "lg",
  "xl",
] as const satisfies readonly Breakpoint[];

// A responsive value: either a bare T, or a Partial map of breakpoint → T.
// A bare T is equivalent to `{ base: T }` — a value that never varies.
export type Responsive<T> = T | Partial<Record<Breakpoint, T>>;

// Distinguishes a Responsive object from a scalar. The definitive test is
// (a) the value is a plain object literal (`Object.prototype` prototype —
// gates out `Date` / `Map` / `Set` / `URL` / arrays / class instances, all
// of which expose zero enumerable own keys and would otherwise pass the
// vacuous `every` below), and (b) every enumerable own key is a known
// breakpoint name. React elements (which carry `$$typeof`) are also
// explicitly excluded — passing a React element as a scalar T is legal.
function isResponsiveObject<T>(value: Responsive<T>): value is Partial<Record<Breakpoint, T>> {
  if (typeof value !== "object" || value === null) return false;
  if (Array.isArray(value)) return false;
  if ("$$typeof" in (value as object)) return false;
  // Plain object literal check: `Object.getPrototypeOf({}) === Object.prototype`,
  // but any host object (Date/Map/Set/URL, class instances) has a different
  // prototype and never qualifies as a Responsive shape — even when its
  // own enumerable keys happen to be empty (making the `every` check
  // vacuously true).
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  const keys = Object.keys(value);
  // Empty object also qualifies — resolves to zero emitted custom
  // properties, letting the component's CSS default take over.
  const bpSet = BREAKPOINTS as readonly string[];
  return keys.every((k) => bpSet.includes(k));
}

// Ensure a Responsive<T> has a base value, using `defaultValue` when the
// caller either omitted the prop entirely (undefined) or passed an object
// without a `base` key. Scalars pass through untouched.
//
// Use this when a component's base-value default depends on another prop
// (Heading's `size` default comes from `level` via LEVEL_DEFAULTS, for
// example). Without this normalization, a caller writing
// `<Heading level={1} size={{ md: "2xl" }}>` would land on the CSS fallback
// at base (whatever the stylesheet picked as its own default) instead of
// level 1's expected `3xl`.
export function withResponsiveBase<T>(
  value: Responsive<T> | undefined,
  defaultValue: T,
): Responsive<T> {
  if (value === undefined) return defaultValue;
  if (isResponsiveObject<T>(value) && value.base === undefined) {
    // Spread first so an explicit `undefined` base in the caller's object
    // still gets overridden by the default (arguably surprising, but the
    // alternative would silently drop the base for the CSS fallback).
    return { ...value, base: defaultValue };
  }
  return value;
}

// Convert a Responsive<T> into a record of inline-style CSS custom properties.
// - `undefined` → no properties (component's CSS default takes over)
// - scalar T → `{ [`${prefix}-base`]: transform(value) }`
// - Partial<Record<Breakpoint, T>> → one entry per defined breakpoint
//
// `transform` maps each T to the CSS value that will actually be assigned to
// the custom property. For a `SpaceScale` gap prop this is typically
// `v => v === "none" ? "0" : `var(--ps1ui-space-${v})``; for a numeric
// `columns` prop, an identity + clamping wrapper. The transform is applied
// per-breakpoint entry, not to the whole object.
export function resolveResponsive<T>(
  value: Responsive<T> | undefined,
  cssVarPrefix: string,
  transform: (v: T) => string | number,
): Record<string, string | number> {
  if (value === undefined) return {};
  if (!isResponsiveObject<T>(value)) {
    return { [`${cssVarPrefix}-base`]: transform(value) };
  }
  const result: Record<string, string | number> = {};
  for (const bp of BREAKPOINTS) {
    const v = value[bp];
    if (v !== undefined) {
      result[`${cssVarPrefix}-${bp}`] = transform(v);
    }
  }
  return result;
}
