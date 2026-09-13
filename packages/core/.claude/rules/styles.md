---
paths:
  - "**/src/styles/**"
  - "**/postcss.config.mjs"
  - "**/tsdown.config.ts"
  - "**/scripts/check-css-split.mjs"
  - "**/scripts/check-dist-registrations.mjs"
---

# Design tokens & CSS build

All design tokens live in `src/styles/tokens.css` (`--ps1ui-*`) — the single source of truth. Every color token is a `light-dark(LIGHT, DARK)` pair. `light-dark()` resolves against whichever `color-scheme` is in effect on the element that substitutes the `var()` — not against the element that declares the custom property — so a descendant's `color-scheme` alone decides which half of each pair it sees. tokens.css deliberately does NOT set `color-scheme` on its `:root` block itself: the document-wide default lives per entry instead — base.css's `html { color-scheme: dark }` rule is the default for the full-canvas entries (base.css / styles.css), while components.css (which imports only tokens.css) ships no document-level `color-scheme` at all, so embedded ps1ui follows whatever `color-scheme` the host document already has, light where the host declares none.

Browsers with no `light-dark()` support at all get a hardcoded fallback instead of switching: tokens.css ends with `@supports not (color: light-dark(#000, #fff)) { :root { … } }`, one declaration per `light-dark()` token set to its DARK literal, and `check:light-dark-fallback` fails the build if that block drifts out of sync with the pairs above it, or if any other stylesheet under `src/` uses `light-dark()` (a pair outside tokens.css has no fallback — declare it as a token and reference it with `var()`).

`[data-ps1ui-theme="light"|"dark"|"system"]` is the public theme switch: it only ever sets `color-scheme` (light / dark / `light dark` respectively) and works on any element — `<html>` for a whole-page theme, or a `<PS1Root theme="...">` subtree — because `color-scheme` inherits down the tree and every `light-dark()` token re-resolves against it with no other rules needed. `PS1Root.css`'s `.ps1ui-root[data-ps1ui-theme]` rule is the one addition on top of that: a `theme`-bearing PS1Root also paints its own `background`/`color` from `--ps1ui-color-bg` / `--ps1ui-color-fg`, so the subtree is self-contained even where a descendant reads `color: inherit`. An untheme'd PS1Root, and the bare `[data-ps1ui-theme]` attribute hand-authored on a foreign element (`components.css` embedders), stay pure `color-scheme` switches with no painted surface.

When changing a color token, mirror the hex into `.storybook/ps1uiTheme.ts` (`check:palette` enforces it — it mirrors both the dark and light hexes, since the Storybook manager iframe can't read CSS vars and needs its own copy of both `ps1uiThemes.dark` / `.light`; `manager.ts` switches between them at runtime to follow the preview's theme toolbar, and `ThemedDocsContainer.tsx` does the same for Docs pages).

## Fill / text / text-on-tint roles

Each semantic hue (`primary` / `accent` / `danger` / `muted`) publishes three token families for three distinct roles, because in light theme one hex cannot satisfy all three at once:

- **Fill** — the base `--ps1ui-color-<hue>` / `-hover` / `-active` / `-fg` quartet. Used wherever the hue paints a background or a border: Button primary/danger, Badge solid, Checkbox/Radio/Switch, focus rings and focus borders. `-fg` sits on top of the fill and needs ≥ 4.5:1 against it; the fill itself needs ≥ 3:1 against the canvas (a non-text graphical boundary).
- **Text** — `--ps1ui-color-<hue>-text` / `-text-hover` / `-text-active`. Used wherever the hue IS the text, painted directly on the page canvas or a Card surface: Anchor, Text, Heading, Tab, Details, Badge outline.
- **Text-on-tint** — `--ps1ui-color-<hue>-text-on-tint`. Used wherever the hue is text sitting on a translucent tint of its own fill color — a stricter contrast case than plain canvas text: Badge subtle, Button ghost hover.

Dark theme collapses all three roles to the same hex per hue (one hue reads as one color there); light theme needs brighter fill values and darker text values, which is why the split exists.

**Rule for new components**: a hue used as a fill or border always takes the base quartet; a hue used as text takes `-text*` (or `-text-on-tint` when the text sits on a translucent tint of the same hue) — never the fill token.

Three CSS entries, built by `build:css`:

- `styles.css` — full canvas (base + components), the standard consumer import.
- `base.css` — fontsource + tokens + cross-browser reset + ambient canvas. The reset un-styles bare semantic tags; its side effects and the html-vs-body rationale are documented in `base.css`'s own comments — read them before touching.
- `components.css` — tokens + component CSS only, for embedding into foreign design systems. **Never add global resets here**; every top-level selector must be `:root`, `.ps1ui-*`, or `[data-ps1ui-theme...]` (`check:css-split` enforces structurally — the theme-switch rules ship here too so embedders can theme ps1ui components without ps1ui painting anything on their element). It also ships no document-level `color-scheme` — `check:css-split` additionally fails if a `:root` or `.ps1ui-*` rule declares `color-scheme`, since only `[data-ps1ui-theme...]` may. Deliberately not `@layer`-wrapped — rationale and supported override paths are in its header comment.

## Bundler caveat: Lightning CSS and `light-dark()`

Lightning CSS — Vite's default CSS minifier — downlevels `light-dark()` into a `prefers-color-scheme`-only polyfill when `build.cssTarget` (or `css.lightningcss.targets`) is below Chrome 123 / Firefox 120 / Safari 17.5, which is below Vite's own default target. The polyfill resolves each token where the custom property is _declared_ (`tokens.css`'s `:root`), not where it's consumed, so whole-page theming (`<html data-ps1ui-theme>`) and `"system"` keep working, but per-subtree `PS1Root theme` silently stops switching. This repo's own `.storybook/main.ts` pins `cssTarget: ["chrome123", "firefox120", "safari17.5"]` for exactly this reason — copy that pattern in any Vite-based consumer or demo. Core's own `dist` CSS is built with PostCSS (see below), so it ships `light-dark()` untouched regardless.

PostCSS inlines only relative (`./`, `../`) `@import`s; bare specifiers pass through for the consumer's bundler (see `postcss.config.mjs`'s comment). **New first-party CSS imports must use relative paths** or they silently fail to inline. Consequence: dist CSS keeps the bare fontsource import, so the CSS entries require a bundler — plain `<link rel="stylesheet">` 404s.

## Package exports

`dist/` is unbundled ESM-only (one module per source file; see `tsdown.config.ts` for why) so consumers tree-shake per component. `"use client"` boundaries are drawn inside the library (the interactive components — Checkbox, Radio, RadioGroup, Table, Tabs / TabList / Tab / TabPanel, Tooltip, ContributionGraph, CodeBlock), keeping server-safe components server-safe in RSC frameworks. The `sideEffects` globs protect CSS imports and CodeBlock's `refractor.register` calls from tree-shaking — `check:dist` verifies all of this post-build. React `^19` peer dep is required by the ref-as-prop pattern. The JS entry never injects styles; consumers import a CSS entry themselves.
