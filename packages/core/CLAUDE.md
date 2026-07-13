# @ps1ui/core — CLAUDE.md

React UI component library for a Terminal / Mono design system (dark canvas, JetBrains Mono). All commands below run from this directory (`packages/core`).

## Commands

- `pnpm build` — `check` + `build:js` (`tsdown` → `dist/index.mjs` + `.d.mts`) + `build:css` (postcss → `dist/styles.css`)
- `pnpm check` — `typecheck` + `check:palette`
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm check:palette` — see "Palette sync" below
- `pnpm lint` / `pnpm lint:fix` — `oxlint`
- `pnpm fmt` / `pnpm fmt:check` — `oxfmt`
- `pnpm test` — Vitest in watch mode; `pnpm test run` for one-shot
- `pnpm test:coverage` — `vitest run --coverage` (`v8` provider, output at `./coverage`)
- `pnpm storybook` — dev server on port 6006
- `pnpm build-storybook` — static build → `storybook-static/`

## Testing

Tests run in real Chromium via **Vitest Browser Mode** (`@vitest/browser-playwright` + `vitest-browser-react`). If Chromium is missing on a fresh clone: `pnpm exec playwright install chromium`.

Two Vitest projects (`vitest.config.ts`):
- **`unit`** — `<Component>.test.tsx` files sitting next to each component
- **`storybook`** — every `.stories.tsx` becomes a test via `@storybook/addon-vitest`'s `storybookTest()` plugin. `@storybook/addon-a11y` runs axe on each story, and `parameters.a11y.test: "error"` in `preview.tsx` makes violations fail the test (not just warn).

Gotchas:
- `render()` from `vitest-browser-react` is **async** — always `await render(...)`.
- Assertions use `await expect.element(locator).toBeVisible()` etc.; interactions are also awaited: `await locator.click()`.
- Browser Mode isolates state per **file**, not per test — don't rely on cross-test isolation of module-level side effects.
- For the `storybook` project, do **not** add a manual `test.include` or a `setProjectAnnotations()` setup file — `storybookTest()` indexes stories from `.storybook/main.ts`'s `stories` glob and auto-applies preview annotations. Adding either breaks it.
- Both `@storybook/addon-vitest` and `@storybook/addon-a11y` must be listed in `.storybook/main.ts`'s `addons` for a11y checks and interaction panels to wire in.

## Component authoring

Each component lives in `src/components/<Name>/` with a four-file set:

```
<Name>.tsx  <Name>.css  <Name>.test.tsx  <Name>.stories.tsx
```

Conventions:
- Ultra-thin native-element wrappers. Type props as `ComponentProps<"tag"> & { extras }` and spread `...rest` straight onto the element (this also lets a caller's `ref` flow through — do not "fix" to `ComponentPropsWithoutRef`).
- Build `className` with the shared `cx(...)` helper (`src/utils/cx.ts`). Don't reinline `[…].filter(Boolean).join(" ")`.
- CSS class naming: `ps1ui-<component>` base, `ps1ui-<component>--<modifier>` for variants. When a component has multiple orthogonal axes, namespace them per axis (e.g. `ps1ui-text--size-sm`, `ps1ui-text--weight-bold`) so they combine unambiguously.
- **Every new component must be re-exported from `src/index.ts`** — both the component and its prop/variant types. That file is the public API surface.

## Design tokens & CSS build

- All design tokens live in `src/styles/tokens.css` as CSS custom properties (`--ps1ui-*`). Single source of truth for colors, spacing, radius, font, transitions.
- `src/styles/index.css` is the CSS entry point: JetBrains Mono fontsource → `tokens.css` → each component's CSS.
- PostCSS inlines **only relative (`./`, `../`) `@import`s**. Bare specifiers stay raw so the consumer's bundler resolves them (inlining them would break packages' internal `url()` paths). **New first-party CSS imports must use a relative path** or they'll silently fail to inline. See the comment in `postcss.config.mjs`.

### Palette sync

Storybook's manager UI theme (`.storybook/ps1uiTheme.ts`) runs in an iframe outside the preview and can't read the library's CSS variables — its hex colors are manually mirrored from `tokens.css`. `pnpm check:palette` (part of `pnpm build`) enforces that every hex literal in `ps1uiTheme.ts` exists in `tokens.css`. **When changing a color token, update `ps1uiTheme.ts` to match** or the build fails.

## Package exports (`package.json`)

- `.` → `dist/index.mjs` + `dist/index.d.mts` — **ESM only, no CJS**
- `./styles.css` → `dist/styles.css` — **consumers must import this separately**; the JS entry does not inject styles
- `sideEffects: ["**/*.css"]` prevents bundlers from tree-shaking the CSS import
- React / React DOM are peer deps (`^18 || ^19`); `@fontsource-variable/jetbrains-mono` is a regular dep because the CSS `@import`s it directly

## TypeScript

TS 7.0 with `verbatimModuleSyntax: true` (→ `import type` / `export type` must be explicit) and `noUncheckedIndexedAccess: true` (→ indexed accesses may be `undefined`).
