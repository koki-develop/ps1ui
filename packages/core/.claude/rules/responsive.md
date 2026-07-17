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

## Containment side effects (`container-type: inline-size`)

1. `position: fixed` / `absolute` / `sticky` descendants re-parent to the nearest primitive — overlay components must Portal to `document.body`.
2. Each primitive is an isolated stacking context — inner `z-index: 9999` won't paint over external siblings.
3. Intrinsic inline-size is 0 in shrink-to-fit flex/grid parents — defended by the grouped `.ps1ui-root, .ps1ui-container, .ps1ui-grid, .ps1ui-stack` selector in `src/styles/components.css` (`align-self/justify-self: stretch; min-width: 0`). **A new responsive-container primitive must join that selector**; per-primitive "resists collapse" tests catch it.

Without a `container-type` ancestor (`<PS1Root>`), responsive props silently fall back to `base` — documented behavior, not a bug.

## Test conventions

Responsive components add these describe blocks (copy from Stack / Grid tests): containment context, inline style CSS variables, computed styles at 5 container widths (400/700/900/1200/1400 — one per breakpoint band), the non-inheritance matrix, and per-band VRT captures.
