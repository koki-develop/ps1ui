# @ps1ui/core — CLAUDE.md

React UI component library for a Terminal / Mono design system (dark canvas, JetBrains Mono). All commands below run from this directory (`packages/core`).

## Commands

- `pnpm build` — `check` + `build:js` (`tsdown` → `dist/index.mjs` + `.d.mts`) + `build:css` (postcss → `dist/styles.css` + `dist/base.css` + `dist/components.css`) + `check:dist`
- `pnpm check` — `typecheck` + `check:palette` + `check:languages`
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm check:palette` — see "Palette sync" below
- `pnpm check:languages` — verifies every language name in `CodeBlockLanguage` (`src/components/CodeBlock/refractor.ts`) is actually registered by refractor at runtime
- `pnpm check:dist` — post-build checks: (1) `dist/index.mjs` still registers every CodeBlock extension language (catches tree-shaking regressions from the `sideEffects` field), and (2) `dist/components.css` contains only `:root` and `.ps1ui-*` selectors (PostCSS AST walk, structural — not a marker grep — so it catches ANY leak, not just the two properties a marker check would happen to name), and the reset's `*`-rooted rule is present in both `dist/base.css` and `dist/styles.css`
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

### Test authoring conventions

Every `<Component>.test.tsx` groups tests into 5 concern-axes via `describe` (skip axes that don't apply):

1. **rendering** — correct DOM tag, default attributes
2. **class composition** — base class, variant/size/weight classes, `className` merge
3. **passthrough** — native attrs (`id`, `data-*`, `aria-*`), `disabled`, `style`
4. **interaction** — `onClick`/`onChange`/keyboard handlers (omit for non-interactive components)
5. **a11y** — a `test.for(cases)` matrix over `variant × state`

Use `test.for(...)` with `$field` name templates for every enumerable axis (variants, sizes, weights, types). Declare the source array with `satisfies` so the compiler catches drift:

```ts
const VARIANTS = ["primary", "secondary"] as const satisfies readonly ButtonVariant[];
```

Adding a new variant to `ButtonVariant` now fails compilation until the array is updated, so a11y matrices stay exhaustive by construction.

For keyboard tests use `userEvent` from vitest's browser context: `import { userEvent } from "vitest/browser"` then `await userEvent.keyboard("{Enter}")`. Dispatching a raw `KeyboardEvent` won't trigger native button behavior.

### Three layers of a11y coverage

- **Unit tests** (`*.test.tsx`) — **semantic** a11y: ARIA attributes, label associations, state changes. CSS is NOT loaded here, so `color-contrast` is not checked. Use `expectNoAxeViolations` for dynamic states unreachable from a static story (post-click, focused, invalid).

  ```ts
  import { expectNoAxeViolations } from "../../testing/axe";

  const screen = await render(<Button>Toggle</Button>);
  await screen.getByRole("button").click();
  await expectNoAxeViolations(screen.container);
  ```

  `src/testing/axe.ts` is a thin wrapper around `axe-core`'s `axe.run` — no `vitest-axe` (that wrapper is unmaintained). `src/testing/**` is not re-exported from `src/index.ts`, so it never ships in `dist/`. Pass an options object as the second arg to disable specific rules or scope the run — `{ rules: { "color-contrast": { enabled: false } } }`.

- **Contrast regression tests** (`*.contrast.test.tsx`) — a middle layer that imports `src/styles/styles.css` and wraps each variant in `--ps1ui-color-bg` / `--ps1ui-color-surface` so axe's `color-contrast` rule computes real ratios. Add one when a token change would risk regressing WCAG AA. **Introducing a new (fg-token, bg-token) pair not already covered by `Text.contrast.test.tsx`** (e.g. a new component using its own accent bg) means adding a matching contrast test for that pair — Storybook covers it visually, but the middle layer is what runs fast on every save.

- **Storybook stories** — **visual** a11y. `addon-a11y` runs axe on each story's initial render against the actual rendered output (CSS applied, dark canvas). `parameters.a11y.test: "error"` in `preview.tsx` makes violations fail the test. Add a story for any visually-distinct combination (new variant × background, new state) so the storybook project auto-picks it up.

### Coverage

Two dimensions — line and behavioral.

**Line:** `vitest.config.ts` sets `coverage.thresholds: { statements/branches/functions/lines: 100 }`. `pnpm test:coverage` fails if any drop below. Keep it that way — this library is thin enough that 100% is achievable and any regression is a real gap.

**Behavioral:** 100% lines is not behavior coverage — a `:hover` rule executed by an a11y visual test can pass without asserting that the color actually shifted. **YOU MUST add a direct assertion for every observable behavior a change introduces or alters** — CSS state transitions, computed styles, classes, DOM attributes, event handlers. Use `getComputedStyle` behind `withForcedPseudoState` (`src/testing/pseudo-state.ts`) for CSS-state assertions; derive expected colors from CSS vars via probe elements rather than hardcoding hex. If a behavior is genuinely untestable, note the reason in a comment before shipping — silent omission is not an option.

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
- Three CSS entry points, all built via `build:css`:
  - `src/styles/styles.css` — the full canvas (imports `base.css` + `components.css`). Default for consumers who fully commit to the PS1 UI look.
  - `src/styles/base.css` — JetBrains Mono fontsource + `tokens.css` + **cross-browser reset** + `html { bg / color / font-family }` + `::selection`. Sets the ambient environment and normalizes UA styles (box-sizing on `*` only — pseudos intentionally excluded so `::before`/`::after` border tricks like Checkbox's rotated-L stay in the initial `content-box`; margin/padding zeroing on block containers; form-control font/color inheritance; `color-scheme: dark`; iOS text-size-adjust / tap-highlight; `sub`/`sup` line-height fix; etc.) so PS1 UI paints the same across Chrome / Safari / Firefox. Locked in by `src/styles/reset.test.tsx`. **Consumer heads-up**: raw semantic tags used OUTSIDE the corresponding component lose their UA appearance — a bare `<a>` inherits color with no underline (route through `<Anchor>`), a bare `<h1>` collapses to body text (route through `<Heading>`), a bare `<button>` has no chrome (route through `<Button>`), `<img>` becomes block (breaks inline avatars unless `display: inline` is set), and `<ul>`/`<ol>` lose their bullets. The full list of side effects is documented in `base.css`'s reset section header. The rationale for keeping ambient canvas rules on `html` rather than `body` (macOS/iOS overscroll region reveals `html`'s background) is documented in `base.css` near the ambient block.
  - `src/styles/components.css` — `tokens.css` + each component's CSS. Component visuals only; no page-canvas styles. For consumers embedding PS1 UI components into a foreign design system. **NEVER add a global reset here** — it would collide with the host system's own reset. The invariant (every top-level selector in `dist/components.css` must be `:root` or start with `.ps1ui-`) is enforced structurally by `scripts/check-css-split.mjs` at build time via a PostCSS AST walk.
- PostCSS inlines **only relative (`./`, `../`) `@import`s**. Bare specifiers stay raw so the consumer's bundler resolves them (inlining them would break packages' internal `url()` paths). **New first-party CSS imports must use a relative path** or they'll silently fail to inline. See the comment in `postcss.config.mjs`.

### Palette sync

Storybook's manager UI theme (`.storybook/ps1uiTheme.ts`) runs in an iframe outside the preview and can't read the library's CSS variables — its hex colors are manually mirrored from `tokens.css`. `pnpm check:palette` (part of `pnpm build`) enforces that every hex literal in `ps1uiTheme.ts` exists in `tokens.css`. **When changing a color token, update `ps1uiTheme.ts` to match** or the build fails.

## Package exports (`package.json`)

- `.` → `dist/index.mjs` + `dist/index.d.mts` — **ESM only, no CJS**
- `./styles.css` → `dist/styles.css` — full canvas (base + components), the standard consumer import
- `./base.css` → `dist/base.css` — canvas-only (root `<html>` bg/color/font + selection); pair with `./components.css` or use alone if you only want the ambient PS1 UI environment
- `./components.css` → `dist/components.css` — components-only; import when embedding PS1 UI components into another design system without touching the page canvas
- The JS entry does **not** inject styles — consumers must import one of the above CSS entries themselves
- `sideEffects: ["**/*.css", "**/CodeBlock/refractor.ts", "dist/index.mjs"]` prevents bundlers from tree-shaking the CSS import and CodeBlock's `refractor.register(...)` calls
- React / React DOM are peer deps (`^18 || ^19`); `@fontsource-variable/jetbrains-mono` is a regular dep because the CSS `@import`s it directly

## TypeScript

TS 7.0 with `verbatimModuleSyntax: true` (→ `import type` / `export type` must be explicit) and `noUncheckedIndexedAccess: true` (→ indexed accesses may be `undefined`).
