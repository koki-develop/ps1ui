---
paths:
  - "**/src/styles/**"
  - "**/postcss.config.mjs"
  - "**/tsdown.config.ts"
  - "**/scripts/check-css-split.mjs"
  - "**/scripts/check-dist-registrations.mjs"
---

# Design tokens & CSS build

All design tokens live in `src/styles/tokens.css` (`--ps1ui-*`) — the single source of truth. When changing a color token, mirror the hex into `.storybook/ps1uiTheme.ts` (`check:palette` enforces it; the Storybook manager iframe can't read CSS vars).

Three CSS entries, built by `build:css`:

- `styles.css` — full canvas (base + components), the standard consumer import.
- `base.css` — fontsource + tokens + cross-browser reset + ambient canvas. The reset un-styles bare semantic tags; its side effects and the html-vs-body rationale are documented in `base.css`'s own comments — read them before touching.
- `components.css` — tokens + component CSS only, for embedding into foreign design systems. **Never add global resets here**; every top-level selector must be `:root` or `.ps1ui-*` (`check:css-split` enforces structurally). Deliberately not `@layer`-wrapped — rationale and supported override paths are in its header comment.

PostCSS inlines only relative (`./`, `../`) `@import`s; bare specifiers pass through for the consumer's bundler (see `postcss.config.mjs`'s comment). **New first-party CSS imports must use relative paths** or they silently fail to inline. Consequence: dist CSS keeps the bare fontsource import, so the CSS entries require a bundler — plain `<link rel="stylesheet">` 404s.

## Package exports

`dist/` is unbundled ESM-only (one module per source file; see `tsdown.config.ts` for why) so consumers tree-shake per component. `"use client"` boundaries are drawn inside the library (Checkbox / CodeBlock), keeping server-safe components server-safe in RSC frameworks. The `sideEffects` globs protect CSS imports and CodeBlock's `refractor.register` calls from tree-shaking — `check:dist` verifies all of this post-build. React `^19` peer dep is required by the ref-as-prop pattern. The JS entry never injects styles; consumers import a CSS entry themselves.
