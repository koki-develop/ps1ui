---
paths:
  - "**/src/components/{Container,Grid,GridItem,Stack,Heading,Text,PS1Root}/**"
  - "**/src/utils/responsive.ts"
  - "**/scripts/check-responsive-property-coverage.mjs"
---

# Responsive props (container-query based)

`Responsive<T>` props resolve via `resolveResponsive(value, "--_<comp>-<axis>", transform)` (`src/utils/responsive.ts`) into inline `--_*` custom properties; component CSS cascades them through `@container` breakpoint blocks (sm 40rem / md 48rem / lg 64rem / xl 80rem). Offered on Container, Grid, GridItem, Stack, Heading, Text. Read `responsive.ts` and an existing component's CSS for the mechanism; Heading's `withResponsiveBase` handles prop-dependent base defaults.

## The load-bearing invariant

Every `--_<comp>-<axis>-<bp>` input var MUST be registered `@property { syntax: "*"; inherits: false; }` in the component's CSS — custom properties inherit by default, so without it a parent's inline var leaks into nested instances of the same primitive. Only `initial` or `@property inherits: false` work; `unset` / `revert` / `revert-layer` resolve to the inherited value and defeat the guard.

Enforced twice, and a new responsive axis must satisfy both:

1. `pnpm check:responsive-property-coverage` — structural: every `resolveResponsive` prefix needs all 5 `@property` blocks in the sibling CSS; orphan blocks are flagged.
2. Each component's "does not inherit outer's per-breakpoint input vars" test matrix — behavioral; its axes table is typed so a new axis fails compilation until covered.

## Containment is opt-in (`queryContainer`)

Only `PS1Root` is a query container unconditionally. `Container` / `Grid` / `Stack` establish one **only** when passed `queryContainer`, which adds `.ps1ui-<comp>--query-container` — the sole selector carrying `container-type: inline-size`. `GridItem` / `Heading` / `Text` are leaves and never establish one.

`container-type: inline-size` costs three global layout side effects, which is why it isn't the default:

1. `position: fixed` / `absolute` / `sticky` descendants re-parent to the nearest query container — overlay components must Portal to `document.body`.
2. It is an isolated stacking context — inner `z-index: 9999` won't paint over external siblings.
3. Intrinsic inline-size resolves to 0, so any shrink-to-fit parent (row flex, auto/max-content grid track, float, inline-block) collapses it to zero width. **This is unfixable in CSS** — the measurement is destroyed, not overridden, and wrapping doesn't help. `align-self/justify-self: stretch` (grouped selector in `src/styles/components.css`) only defends the CROSS axis; a row flex parent's main axis stays exposed. Full write-up lives on `.ps1ui-stack--query-container` in `Stack.css`.

The grouped defense selector in `components.css` must list exactly the classes that declare `container-type` — `.ps1ui-root` plus each `--query-container` modifier. Both directions are covered by per-primitive "containment context" tests (default → `containerType: normal` + shrink-wraps; `queryContainer` → contained + stretched).

Without a query-container ancestor (`<PS1Root>`), responsive props silently fall back to `base` — documented behavior, not a bug.

## Test conventions

Responsive components add these describe blocks (copy from Stack / Grid tests): containment context, inline style CSS variables, computed styles at 5 container widths (400/700/900/1200/1400 — one per breakpoint band), the non-inheritance matrix, and per-band VRT captures.
