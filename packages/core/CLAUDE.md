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
- `pnpm test:vrt` — run visual regression baselines only (`--project vrt`); see "Visual regression testing" below
- `pnpm test:vrt:update` — refresh VRT baselines (`--project vrt -u`); scoped to `vrt` because `-u` also rewrites inline/file snapshots
- `pnpm storybook` — dev server on port 6006
- `pnpm build-storybook` — static build → `storybook-static/`

## Testing

Tests run in real Chromium, Firefox, and WebKit via **Vitest Browser Mode** (`@vitest/browser-playwright` + `vitest-browser-react`) — see `vitest.config.ts`'s `browserInstances()`. If browsers are missing on a fresh clone: `pnpm exec playwright install`. `pnpm test:coverage` runs Chromium only — `@vitest/coverage-v8` errors outright with more than one browser instance (V8 coverage is a Chromium-only capability); since coverage measures JS execution paths, not rendering, this loses nothing, and `browserInstances()` picks Chromium-only automatically whenever `--coverage` is passed.

Three Vitest projects (`vitest.config.ts`):

- **`unit`** — `<Component>.test.tsx` files sitting next to each component. Excludes `**/*.vrt.test.tsx`.
- **`storybook`** — every `.stories.tsx` becomes a test via `@storybook/addon-vitest`'s `storybookTest()` plugin. `@storybook/addon-a11y` runs axe on each story, and `parameters.a11y.test: "error"` in `preview.tsx` makes violations fail the test (not just warn).
- **`vrt`** — `<Component>.vrt.test.tsx` files. Visual regression baselines via Vitest 4's built-in `toMatchScreenshot`. Kept as its own project so `-u` (baseline refresh) doesn't accidentally rewrite unit-test snapshots. See "Visual regression testing" below.

Gotchas:

- `render()` from `vitest-browser-react` is **async** — always `await render(...)`.
- Assertions use `await expect.element(locator).toBeVisible()` etc.; interactions are also awaited: `await locator.click()`.
- Browser Mode isolates state per **file**, not per test — don't rely on cross-test isolation of module-level side effects.
- For the `storybook` project, do **not** add a manual `test.include` or a `setProjectAnnotations()` setup file — `storybookTest()` indexes stories from `.storybook/main.ts`'s `stories` glob and auto-applies preview annotations. Adding either breaks it.
- Both `@storybook/addon-vitest` and `@storybook/addon-a11y` must be listed in `.storybook/main.ts`'s `addons` for a11y checks and interaction panels to wire in.
- Some assertions are genuinely engine-specific (a vendor CSS property/value one engine doesn't parse, a real platform keyboard-navigation difference). Prefer feature detection (`CSS.supports(prop, value)`) over hardcoding a browser name — it fails loudly if a browser starts rejecting a value for real reasons, not just "this engine happens to be different." Only fall back to `import { server } from "vitest/browser"; server.browser === "firefox"` when the difference is a rendering/behavior quirk `CSS.supports` can't see (verify empirically before hardcoding — see `src/styles/reset.test.tsx`'s and `Button.contrast.test.tsx`'s comments for two verified examples, including one where `CSS.supports` returns a false positive).
- **Known intermittent Firefox flake, no fix from our side**: tests that call `.focus()` then `await userEvent.keyboard(" ")` on a checkbox/button (Space-key activation) occasionally fail on the Playwright Firefox provider under concurrent 3-browser load (reproduced ~15-20% of full-suite runs, never in isolation) — Firefox's native Space-activation sequence for form controls genuinely differs from Chromium/WebKit (extra `DOMActivate` event, `keypress` reports `keyCode 0` instead of `32`), and the synthesized key occasionally doesn't complete it in time. `expect.poll()` doesn't help (the event already misfired, it won't retro-actively succeed) and neither did a render-settle tick (see `src/testing/settle.ts`) — this isn't the same render-timing gap that helper closes for `:focus-visible`. If a Space-key test fails, re-run before assuming a real regression; see `Checkbox.test.tsx`'s "Space toggles checked state when focused" for the fullest account, cross-referenced from `Button.test.tsx`.

### Visual regression testing

VRT runs in the `vrt` project via Vitest 4's `expect.element(...).toMatchScreenshot()` (docs: https://vitest.dev/guide/browser/visual-regression-testing). Comparator is `pixelmatch` with `threshold: 0.05` and `allowedMismatchedPixelRatio: 0.005` — tighter than the 0.1 default so token/color drifts aren't silently absorbed. Playwright's `animations: "disabled"` and `caret: "hide"` are the provider defaults, so no CSS freeze layer is needed.

Files: `<Component>.vrt.test.tsx` next to the component (every component ships one). VRT files are excluded from coverage (`vitest.config.ts` `coverage.exclude`).

**`VrtFrame` (`src/testing/vrt.tsx`)** is the shared capture wrapper — dark-canvas background + 20 px padding + `display: inline-block`. Every VRT file uses it so screenshots share the same canvas context (deterministic for `background: transparent` variants), the frame stays tight to the component (no bloated PNGs), and `:focus-visible` shadows/outlines don't clip. Frame carries `data-testid="vrt-frame"` (screenshot target); the component-under-test carries `data-testid="vrt-target"` (pseudo-state selector hook). Interactive template:

```tsx
import { VrtFrame } from "../../testing/vrt";
import { withPseudoState, type PseudoClass } from "../../testing/pseudo-state";

const CASES = VARIANTS.flatMap((variant) => STATES.map((state) => ({ variant, state })));

test.for(CASES)("variant=$variant / state=$state", async ({ variant, state }, ctx) => {
  ctx.skip(state === "focus-visible" && server.browser === "webkit", "…");
  const screen = await render(
    <VrtFrame>
      <Component variant={variant} data-testid="vrt-target">…</Component>
    </VrtFrame>,
  );
  const pseudo: readonly PseudoClass[] =
    state === "default" || state === "disabled" ? [] : [state];
  await withPseudoState('[data-testid="vrt-target"]', pseudo, async () => {
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(`${variant}-${state}`);
  });
});
```

**Axis strategy for typography-only components** (Text, Heading, Label): don't cartesian-product the axes — 5×5×4 = 100 near-duplicate baselines. Cover each axis independently with the other axes at defaults. Level cases in Heading double as `LEVEL_DEFAULTS`-mapping regression coverage.

**Native controls Safari excludes from Tab.** macOS Safari's default "Full Keyboard Access" excludes non-text form controls and links: `<button>`, `<a href>`, `<input type=checkbox>`, and any `<div|pre> tabindex=0` (CodeBlock's scrollable pattern). All of these need the WebKit `ctx.skip` for `focus-visible`. Text inputs are Tab-reachable everywhere, so no skip for `Input` `:focus`.

**`ctx.skip(...)` — not early `return`.** Skipping via `ctx.skip(condition, reason)` is deliberate: the reporter labels those cases as *skipped* and the reason surfaces in the log. An early `if (cond) return;` compiles + passes locally (the test just exits, no assertions) but shows up as *pass* in CI reporter output, silently green-checking whatever regression the skip was hiding.

**Known VRT flakes (skipped, not fixable from our side).** Two combos on Firefox rasterise inconsistently across successive captures: `Button variant=secondary + state=focus-visible` and `Anchor variant=subtle + state=focus-visible`. Both share the pattern *transparent background + focus-ring box-shadow alpha blend + text* — Firefox's compositor re-samples the alpha layer per frame, producing 4-6% pixel drift between consecutive captures that no realistic tolerance can absorb without defeating VRT's regression-catching purpose. Stable Screenshot Detection times out ~100% of the time on these. Skipped with `ctx.skip(variant === ... && state === "focus-visible" && server.browser === "firefox", ...)`. Coverage loss is bounded: Chromium and WebKit still capture these combos (WebKit's focus-visible skip is a separate FKA concern), and the non-focus states on all browsers still capture the transparent variant.

**Baseline layout & source of truth.** Baselines live at `src/components/<Name>/__screenshots__/<file>/<name>-<browser>-<platform>.png`. Only **`-linux.png`** baselines are committed (the CI runtime); `-darwin.png` and `-win32.png` are `.gitignore`d so per-developer / per-OS captures never enter git. This means:

- Locally on macOS: first `pnpm test:vrt` after a fresh checkout auto-generates darwin baselines (Vitest's `updateSnapshot: "new"` behavior) and reports missing-reference errors for that run only. Re-run and it passes. Darwin baselines are untracked scratch — regenerate freely.
- On CI Linux: `updateSnapshot: "none"`, so missing baselines fail hard instead of auto-generating.

**VrtFrame edits invalidate every committed baseline.** Because `VrtFrame` is the outer capture wrapper for every VRT test, any change to its padding, background, or DOM structure shifts every screenshot in `packages/core/src/components/**/__screenshots__/**/*-linux.png` by construction. Land those edits in a dedicated commit with manual baseline regen (`pnpm test:vrt:update` in the mcr.microsoft.com/playwright Linux container) + representative-sample diff inspection — do NOT rely on the auto-heal path, which would silently commit ~200 new baselines without a reviewer looking at them.

**CI baselines.** Gated by the `vrt` job in `.github/workflows/ci.yml` (uploads `-actual`/`-diff` PNGs from `.vitest-attachments/` as a `vrt-diff-<runId>-<attempt>` artifact on failure). Auto-healed on `main` by `.github/workflows/vrt-update.yml` — see that file's header comment for the full flow. To green a PR's VRT check *before* merging (e.g. for branch protection), regenerate `-linux.png` baselines in a Linux container and push the diff: `docker run --rm -v $PWD:/w -w /w mcr.microsoft.com/playwright:v1.61.1-noble pnpm --filter @ps1ui/core test:vrt:update`.

**`:focus-visible` on WebKit** is unreachable — macOS Safari's default "Full Keyboard Access" excludes `<button>`/`<a>` from Tab (same as `Button.contrast.test.tsx`); the Playwright WebKit build matches that default. Skip the combination with `ctx.skip(state === "focus-visible" && server.browser === "webkit", "…")` so the reporter labels it skipped instead of pass-with-no-assertions.

**Failure-page snapshots.** Vitest's default `screenshotFailures` output is `<test-name>-<n>.png` under `__screenshots__/` — repo `.gitignore` catches `-[0-9].png` / `-[0-9][0-9].png` so those never leak to git even at N failures per test. VRT baselines and platform-suffixed captures (`-linux.png` / `-darwin.png` / `-win32.png`) don't match the digit pattern, so the two coexist safely in the same directory. `screenshotFailures: false` is set only on the `vrt` project — the per-VRT-failure `-actual` + `-diff` pair under `.vitest-attachments/` is a strictly better diagnostic than a plain page snapshot, and disabling the redundant path snapshot avoids `-1.png` files racing with a future baseline named after a numbered case.

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

**Behavioral:** 100% lines is not behavior coverage — a `:hover` rule executed by an a11y visual test can pass without asserting that the color actually shifted. **YOU MUST add a direct assertion for every observable behavior a change introduces or alters** — CSS state transitions, computed styles, classes, DOM attributes, event handlers. Use `getComputedStyle` behind `withPseudoState` (`src/testing/pseudo-state.ts`) for CSS-state assertions; derive expected colors from CSS vars via probe elements rather than hardcoding hex. If a behavior is genuinely untestable, note the reason in a comment before shipping — silent omission is not an option.

## Component authoring

Each component lives in `src/components/<Name>/` with:

```
<Name>.tsx  <Name>.css  <Name>.test.tsx  <Name>.stories.tsx  <Name>.vrt.test.tsx
<Name>.contrast.test.tsx   # optional; add when introducing a new (fg-token, bg-token) pair — see "Three layers of a11y coverage"
```

VRT files are mandatory for any component that renders visible DOM — a stable pixel surface without a baseline leaves a token/CSS regression net unclaimed. Headless helpers (Provider, Portal, hook-only shims) don't need one — they have no pixel surface to regress against. See the "Visual regression testing" section above for the `VrtFrame` template and axis strategy.

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
