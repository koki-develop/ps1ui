# @ps1ui/core — CLAUDE.md

React UI component library for a Terminal / Mono design system (dark canvas, JetBrains Mono). All commands below run from this directory (`packages/core`).

## Commands

- `pnpm build` — `check` + `build:js` (`tsdown` with `unbundle: true` → one `.mjs` + `.d.mts` per source module under `dist/`, entry `dist/index.mjs`; see tsdown.config.ts for why) + `build:css` (postcss → `dist/styles.css` + `dist/base.css` + `dist/components.css`) + `check:dist`
- `pnpm check` — `typecheck` + `check:palette` + `check:languages`
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm check:palette` — see "Palette sync" below
- `pnpm check:languages` — verifies every language name in `CodeBlockLanguage` (`src/components/CodeBlock/refractor.ts`) is actually registered by refractor at runtime
- `pnpm check:dist` — post-build checks: (1) importing `dist/index.mjs` still registers every CodeBlock extension language (catches our build dropping the `refractor.register(...)` calls), (2) the dist module containing those register calls is matched by a `package.json` `sideEffects` glob (a stale glob would make consumer bundlers treat it as pure and silently drop the registrations — invisible to any runtime check here), (3) every `"use client"` source module keeps its directive at the top of its dist module (pins rolldown's preserveModules directive preservation), and (4) `dist/components.css` contains only `:root` and `.ps1ui-*` selectors (PostCSS AST walk, structural — not a marker grep — so it catches ANY leak, not just the two properties a marker check would happen to name), and the reset's `*`-rooted rule is present in both `dist/base.css` and `dist/styles.css`
- `pnpm lint` / `pnpm lint:fix` — `oxlint`
- `pnpm fmt` / `pnpm fmt:check` — `oxfmt`
- `pnpm test` — Vitest in watch mode; `pnpm test run` for one-shot
- `pnpm test:coverage` — `vitest run --coverage --project unit --project storybook` (`v8` provider, output at `./coverage`). The `vrt` project is excluded on purpose: its files don't count toward coverage, and running it would re-execute every screenshot compare — turning intentional visual changes into coverage-gate failures in CI.
- `pnpm test:vrt` — run visual regression baselines only (`--project vrt`); see "Visual regression testing" below
- `pnpm test:vrt:update` — refresh VRT baselines (`--project vrt -u`); scoped to `vrt` because `-u` also rewrites inline/file snapshots
- `pnpm storybook` — dev server on port 6006
- `pnpm build-storybook` — static build → `storybook-static/`. Base path defaults to `/`; set `STORYBOOK_BASE_PATH=/some/subpath/` to deploy under a subpath — `.storybook/main.ts`'s `viteFinal` merges it into Vite's `config.base` so every emitted asset URL is prefixed. `@ps1ui/site`'s `build:storybook` uses this to bundle Storybook into `packages/site/dist/storybook/` at `/ps1ui/storybook/`. Also: `.storybook/manager-head.html` uses **relative** font paths (`./fonts/...`) so the same head HTML resolves correctly under any base.

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

VRT runs in the `vrt` project via Vitest 4's `expect.element(...).toMatchScreenshot()` (docs: https://vitest.dev/guide/browser/visual-regression-testing). Comparator is `pixelmatch` with `threshold: 0.1` (pixelmatch's default — a stricter 0.05 rejected consecutive WebKit/Firefox frames on text-only fixtures) and `allowedMismatchedPixelRatio: 0.01`, kept tight enough that a real token/color drift still trips the diff. Playwright's `animations: "disabled"` and `caret: "hide"` are the provider defaults, so no CSS freeze layer is needed.

Files: `<Component>.vrt.test.tsx` next to the component (every component ships one, except `PS1Root`). VRT files are excluded from coverage (`vitest.config.ts` `coverage.exclude`).

**`VrtFrame` (`src/testing/vrt.tsx`)** is the shared capture wrapper — dark-canvas background + 20 px padding + `display: inline-block`. Every VRT file uses it so screenshots share the same canvas context (deterministic for `background: transparent` variants), the frame stays tight to the component (no bloated PNGs), and `:focus-visible` shadows/outlines don't clip. Frame carries `data-testid="vrt-frame"` (screenshot target); the component-under-test carries `data-testid="vrt-target"` (pseudo-state selector hook). Interactive template:

```tsx
import { VrtFrame } from "../../testing/vrt";
import { withPseudoState, type PseudoClass } from "../../testing/pseudo-state";

const CASES = VARIANTS.flatMap((variant) => STATES.map((state) => ({ variant, state })));

test.for(CASES)("variant=$variant / state=$state", async ({ variant, state }, ctx) => {
  ctx.skip(state === "focus-visible" && server.browser === "webkit", "…");
  const screen = await render(
    <VrtFrame>
      <Component variant={variant} data-testid="vrt-target">
        …
      </Component>
    </VrtFrame>,
  );
  const pseudo: readonly PseudoClass[] = state === "default" || state === "disabled" ? [] : [state];
  await withPseudoState('[data-testid="vrt-target"]', pseudo, async () => {
    await expect.element(screen.getByTestId("vrt-frame")).toMatchScreenshot(`${variant}-${state}`);
  });
});
```

**Axis strategy for typography-only components** (Text, Heading, Label): don't cartesian-product the axes — 5×5×4 = 100 near-duplicate baselines. Cover each axis independently with the other axes at defaults. Level cases in Heading double as `LEVEL_DEFAULTS`-mapping regression coverage.

**Native controls Safari excludes from Tab.** macOS Safari's default "Full Keyboard Access" excludes non-text form controls and links: `<button>`, `<a href>`, `<input type=checkbox>`, and any `<div|pre> tabindex=0` (CodeBlock's scrollable pattern). All of these need the WebKit `ctx.skip` for `focus-visible`. Text inputs are Tab-reachable everywhere, so no skip for `Input` `:focus`.

**`ctx.skip(...)` — not early `return`.** Skipping via `ctx.skip(condition, reason)` is deliberate: the reporter labels those cases as _skipped_ and the reason surfaces in the log. An early `if (cond) return;` compiles + passes locally (the test just exits, no assertions) but shows up as _pass_ in CI reporter output, silently green-checking whatever regression the skip was hiding.

**Font residency gate.** The `vrt` project's setup file (`src/testing/vrt-setup.ts`) blocks each test until JetBrains Mono is resident — fresh-session captures otherwise race the webfont load and bake the fallback monospace into a baseline. Even so, local **webkit + darwin** captures of `Button as='a'` have been observed to rasterize in two stable variants across sessions (fonts verified resident in both); darwin baselines are untracked scratch, so if that pair mismatches locally, regenerate (`pnpm test:vrt:update`) and re-run before suspecting a real regression — the committed `-linux.png` set on CI is the source of truth and has been stable.

**Known VRT flakes (skipped, not fixable from our side).** Two combos on Firefox rasterise inconsistently across successive captures: `Button variant=secondary + state=focus-visible` and `Anchor variant=subtle + state=focus-visible`. Both share the pattern _transparent background + focus-ring box-shadow alpha blend + text_ — Firefox's compositor re-samples the alpha layer per frame, producing 4-6% pixel drift between consecutive captures that no realistic tolerance can absorb without defeating VRT's regression-catching purpose. Stable Screenshot Detection times out ~100% of the time on these. Skipped with `ctx.skip(variant === ... && state === "focus-visible" && server.browser === "firefox", ...)`. Coverage loss is bounded: Chromium and WebKit still capture these combos (WebKit's focus-visible skip is a separate FKA concern), and the non-focus states on all browsers still capture the transparent variant.

**Baseline layout & source of truth.** Baselines live at `src/components/<Name>/__screenshots__/<file>/<name>-<browser>-<platform>.png`. Only **`-linux.png`** baselines are committed (the CI runtime); `-darwin.png` and `-win32.png` are `.gitignore`d so per-developer / per-OS captures never enter git. This means:

- Locally on macOS: first `pnpm test:vrt` after a fresh checkout auto-generates darwin baselines (Vitest's `updateSnapshot: "new"` behavior) and reports missing-reference errors for that run only. Re-run and it passes. Darwin baselines are untracked scratch — regenerate freely.
- On CI Linux: `updateSnapshot: "none"`, so missing baselines fail hard instead of auto-generating.

**VrtFrame edits invalidate every committed baseline.** Because `VrtFrame` is the outer capture wrapper for every VRT test, any change to its padding, background, or DOM structure shifts every screenshot in `packages/core/src/components/**/__screenshots__/**/*-linux.png` by construction. Land those edits in a dedicated commit, let `main`'s auto-heal regenerate the baselines (locally regenerating `-linux.png` is prohibited — see "CI baselines" below), and then inspect a representative sample of the auto-heal commit's ~200-baseline diff — that commit deserves a human look even though the auto-heal path creates it.

**CI baselines.** Gated by `.github/workflows/vrt.yml` (uploads `-actual`/`-diff` PNGs from `.vitest-attachments/` as a `vrt-diff-<runId>-<attempt>` artifact on failure). Kept as a separate workflow from `ci.yml` because "vrt is red" is an intentionally noisy signal — every PR that adds a new component or intentionally changes a visible surface lands red until main auto-heals — and bundling it into the general CI lane would muddy the "did lint/build/unit pass?" semantics. Auto-healed on `main` by `.github/workflows/vrt-update.yml` — see that file's header comment for the full flow. **`-linux.png` baselines are CI-managed: NEVER regenerate or commit them locally** (e.g. via a Linux container) — local runners rasterize differently enough to plant flaky baselines, and the auto-heal commit is the single reviewable source of baseline changes. A PR that intentionally changes pixels simply stays VRT-red until it merges and auto-heal regenerates on `main`.

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

**Forced colors (Windows High Contrast).** In `forced-colors: active` mode the browser repaints author colors with the system palette: `background-color` is force-replaced and `box-shadow` is stripped, while border colors survive as visible ink. Two adjustments ship (MDN's recommended shape — minimal in-query tweaks, not a separate design): a single grouped `@media (forced-colors: active)` rule in `src/styles/components.css` restores a real outline (`2px solid CanvasText`) for every component whose focus ring is box-shadow-based — **a new box-shadow-focus component means adding its class to that grouped selector** — and Checkbox.css redraws its indeterminate bar as a border instead of `background: currentColor` (the checked ✓ is already border-drawn and needs nothing); component-specific fixes like that stay in the component's own CSS. Regression-tested in `src/styles/forced-colors.test.tsx` — forced colors is entered via the `emulateForcedColors` browser command (Playwright `page.emulateMedia`, see `vitest.browser-commands.ts` + `src/testing/forced-colors.ts`); tests assert geometry only (outline/border widths, never colors — those are the system's) and feature-detect emulation support per engine via `matchMedia`, skipping where unsupported. All forced-colors tests live in that ONE file because the emulation is page-global and Browser Mode isolates per file.

### Coverage

Two dimensions — line and behavioral.

**Line:** `vitest.config.ts` sets `coverage.thresholds: { statements/branches/functions/lines: 100 }`. `pnpm test:coverage` fails if any drop below. Keep it that way — this library is thin enough that 100% is achievable and any regression is a real gap.

**Behavioral:** 100% lines is not behavior coverage — a `:hover` rule executed by an a11y visual test can pass without asserting that the color actually shifted. **YOU MUST add a direct assertion for every observable behavior a change introduces or alters** — CSS state transitions, computed styles, classes, DOM attributes, event handlers. Use `getComputedStyle` behind `withPseudoState` (`src/testing/pseudo-state.ts`) for CSS-state assertions; derive expected colors from CSS vars via probe elements rather than hardcoding hex. If a behavior is genuinely untestable, note the reason in a comment before shipping — silent omission is not an option.

## Responsive props (container-query based)

**Model.** ps1ui components accept `Responsive<T>` values for size/spacing/layout props. `Responsive<T>` is `T | Partial<Record<Breakpoint, T>>` where `Breakpoint = "base" | "sm" | "md" | "lg" | "xl"`. Scalars are equivalent to `{ base: T }`; object values override at container-query breakpoints (`sm` = 40rem / `md` = 48rem / `lg` = 64rem / `xl` = 80rem, mirroring `--ps1ui-breakpoint-*` in tokens.css).

**Mechanism.** Component TS calls `resolveResponsive(value, "--_<comp>-<axis>", transform)` (from `src/utils/responsive.ts`) which returns a record of CSS custom properties to spread into inline `style`. Component CSS declares an intermediate cascade (`--_size-base: var(--_<comp>-size-base, <default>); --_size-sm: var(--_<comp>-size-sm, var(--_size-base));` etc.) and each `@container (min-width: X)` block reassigns `--_size` to the matched breakpoint's intermediate var. The fallback chain means a partial responsive object cascades naturally — a missing breakpoint inherits the previous one's effective value.

**Non-inheriting input variables (load-bearing).** Every `--_<comp>-<axis>-<bp>` that `resolveResponsive` emits MUST be registered with `@property { syntax: "*"; inherits: false; }` at the top of that component's CSS. CSS custom properties inherit by default (css-variables §2), so without this guard a parent Stack's inline `--_stack-gap-md` would cascade into every nested Stack and corrupt the child's own `var(--_stack-gap-md, fallback)` — the child's gap silently jumps to the parent's md value at the md container query, ignoring the child's own resolution. Every responsive-prop component (Container / Grid / Stack / Heading / Text) has a header `@property` block; a new responsive axis added to any of these MUST add matching `@property` blocks for all 5 breakpoints or the leak returns. `unset` / `revert` / `revert-layer` are NOT interchangeable with this approach for custom properties — they resolve to the inherited value, defeating the block. Only `initial` OR `@property inherits:false` produce the guaranteed-invalid value the `var()` fallback chain needs. The regression net lives in each component's `.test.tsx` "does not inherit outer's per-breakpoint input vars" describe block — one test per emitted axis, covering every emitted axis so a forgotten `@property` trips CI immediately.

**Where responsive is offered:** Container (`size`, `px`), Grid (`columns`, `gap`), Stack (`direction`, `gap`, `align`, `justify`, `wrap`), Heading (`size`, `weight`), Text (`size`, `weight`). Container / Grid / Stack additionally establish a named containment context (`container-name: ps1ui-container` / `ps1ui-grid` / `ps1ui-stack`) via `container-type: inline-size`.

**Containment ancestor.** Every responsive component needs a `container-type: inline-size` ancestor for its `@container` queries to fire. Consumers wrap their app tree in `<PS1Root>` once at the top level. PS1Root establishes `container-name: ps1ui-root / inline-size` on a single `<div>` and does nothing else; it's the responsive contract's ONLY required scaffold. Without a containment ancestor, responsive props silently fall back to their `base` value — documented behaviour, not a bug.

**Level-driven defaults + Responsive objects.** Heading has `LEVEL_DEFAULTS` mapping `level → default (size, weight)`. When a caller passes a responsive object without `base`, `withResponsiveBase(value, defaults[level].size)` injects the level default at base so `<Heading level={1} size={{ md: "2xl" }}>` still renders `3xl` at narrow contexts and `2xl` at md+. Use this helper when a component's base default depends on another prop.

**Containment side effects.** `container-type: inline-size` implies `contain: layout style inline-size`, which has four shipped consequences (MDN "Using CSS containment"):

1. **`position: fixed` re-parents.** Raw `position: fixed` inside PS1Root / Container / Grid / Stack scrolls with the page instead of pinning to the viewport. Modal / Tooltip / Popover render via React Portal to `document.body` to escape.
2. **`position: absolute` re-parents.** An absolutely-positioned descendant that expected to anchor to an outer `position: relative` ancestor now anchors to the nearest primitive instead. Consumers who wrap `<div style="position: relative">` around a section and rely on abs-positioned children (badges, decorative overlays) inside a nested Container should keep the containing block explicit — either put the relative wrapper _inside_ the Container, or use Portal.
3. **New stacking context.** Each primitive becomes an isolated stacking context: a descendant with `z-index: 9999` no longer paints over external siblings — it's clipped to the primitive's z-index range. Overlays that must escape (dropdowns rendered inline, sticky headers overlapping the next section) need Portal, or the primitive needs an appropriate `z-index` of its own to lift the whole subtree.
4. **Intrinsic inline-size is 0 (defended in the primitives, not the caller's problem).** `contain: inline-size` treats intrinsic width as 0 for parent sizing — so a raw `container-type: inline-size` element inside a shrink-to-fit flex/grid parent (e.g. `align-items: flex-start`, `justify-items: start`) collapses to width 0, and any descendant using `@container` queries silently degrades. **The single grouped selector `.ps1ui-root, .ps1ui-container, .ps1ui-grid, .ps1ui-stack` in `src/styles/components.css` ships `align-self: stretch; justify-self: stretch; min-width: 0;` to defuse this** — the primitives fill their parent's cross-axis in flex/grid contexts and permit inner overflow-scroll surfaces (CodeBlock etc.) to shrink freely inside narrow row parents instead of bursting them open. All three declarations are no-ops in a plain block context. **New responsive-container primitives MUST add their class to that grouped selector**; the regression is caught by per-primitive `resists collapse via align-self: stretch in shrink-wrap flex parent` tests in Stack / Container / Grid / PS1Root `.test.tsx`.

Consequences 1–3 also apply to `position: sticky` descendants (sticky element's containing block becomes the nearest primitive, so it scrolls out with the primitive rather than the viewport). Document these in per-component notes when introducing an overlay primitive.

**Test conventions for responsive components.** In addition to the standard 5-axis structure below, add:

- **`containment context`** — assert `getComputedStyle(el).containerType === "inline-size"` and `containerName === "ps1ui-<comp>"` (leaf components like Text/Heading assert `containerType !== "inline-size"` — they consume container queries but do not establish them).
- **`inline style CSS variables`** — enumerate every scalar value, verify only `--_<comp>-<axis>-base` is emitted; then verify responsive objects emit one entry per specified breakpoint. Regex the style attribute for the negative case: `expect(styleAttr).not.toMatch(/--_<comp>-<axis>-/)` when no prop is passed.
- **`computed styles: responsive (via @container queries)`** — render inside a `container-type: inline-size` wrapper at 5 fixed widths (400 / 700 / 900 / 1200 / 1400) that land one per breakpoint band (base / sm / md / lg / xl). A `renderInContainerAtWidth(width, ui)` helper in each test file centralizes the wrapper markup. Verify `getComputedStyle` resolves each band's value. Also test the cascade fallback (partial responsive object without base → CSS default; explicit gap in the object → later breakpoint inherits earlier's effective value).
- **`does not inherit outer's per-breakpoint input vars`** — one assertion per emitted axis. Outer component sets the leaking axis with `{ base: <X>, md: <Y> }` where `Y` differs from every fallback the inner would compute; inner sets ONLY a scalar `base` (or omits the prop). Render inside a 900px `width` wrapper so the outer's `container-type: inline-size` puts descendants above the md threshold. Assert inner's computed style reflects its OWN base, NOT `Y`. If this test passes without the `@property { inherits: false }` block in the component's CSS, either you're inspecting the wrong element or the cascade doesn't leak on this axis (verify by removing the `@property` block temporarily — it MUST fail).
- **VRT baselines** — one capture per breakpoint band (below-sm / sm-band / md-band / lg-band / xl-band). The `below-sm` capture uses `stageWidth: 320` deliberately to double as the WCAG 2.2 SC 1.4.10 (Reflow) baseline — proves the primitive fits at the narrowest supported viewport without horizontal overflow.

**Gotcha: same-test double `render()` in vitest-browser-react.** Both calls' elements coexist on the shared page and Playwright's strict-mode locator trips on duplicate `data-testid`. Split into two tests instead. Reference: Stack.test.tsx's split-out `cascade fallback: object without base → CSS default at base breakpoint` / `... → md override kicks in at md band` pair.

## Component authoring

Each component lives in `src/components/<Name>/` with:

```
<Name>.tsx  <Name>.css  <Name>.test.tsx  <Name>.stories.tsx  <Name>.vrt.test.tsx
<Name>.contrast.test.tsx   # optional; add when introducing a new (fg-token, bg-token) pair — see "Three layers of a11y coverage"
```

VRT files are mandatory for any component that renders visible DOM — a stable pixel surface without a baseline leaves a token/CSS regression net unclaimed. Headless helpers (Provider, Portal, hook-only shims) don't need one — they have no pixel surface to regress against. See the "Visual regression testing" section above for the `VrtFrame` template and axis strategy.

Conventions:

- Ultra-thin native-element wrappers. Type props as `ComponentProps<"tag"> & { extras }` and spread `...rest` straight onto the element (this also lets a caller's `ref` flow through — do not "fix" to `ComponentPropsWithoutRef`). This relies on React 19's ref-as-prop (function components receive `ref` in props; no `forwardRef`) — the reason `peerDependencies` requires `react@^19`. Components that need the DOM node themselves (Checkbox, CodeBlock) destructure `ref: forwardedRef` from props and merge it with a local ref.
- Build `className` with the shared `cx(...)` helper (`src/utils/cx.ts`). Don't reinline `[…].filter(Boolean).join(" ")`.
- CSS class naming: `ps1ui-<component>` base, `ps1ui-<component>--<modifier>` for variants (e.g. `ps1ui-text--muted`, `ps1ui-anchor--subtle`, `ps1ui-text--truncate`). Axis-prefixed modifiers (`ps1ui-<component>--<axis>-<value>`) are only needed when two class-driven axes could produce colliding value names; no current component needs one — size/weight axes are driven by CSS custom properties (inline style, see "Responsive props"), not classes. Existing flat modifier names are public API — don't rename them to add a prefix retroactively.
- Responsive/inline-style merge order: components build `style` as `{ ...callerStyle, ...resolvedVars }` — the internally-computed `--_*` custom properties intentionally win over same-named caller keys. `--_*` is the reserved internal prefix; responsive values are controlled via props, and ordinary style keys pass through untouched.
- **Every new component must be re-exported from `src/index.ts`** — both the component and its prop/variant types. That file is the public API surface.
- Polymorphic `as` + `disabled`: `disabled` only exists on form elements, so `<Button as="a" disabled>` is rejected by the type system (`ComponentPropsWithoutRef<"a">` has no `disabled`; locked in by `Button.test-d.tsx`). Untyped JS callers / `as={SomeComponent}` escapes can still leak it as a no-op attribute — that's accepted: per ARIA APG, links are not disabled; render a non-link (or don't render the link) when the action is unavailable. No runtime guard on purpose — the type-level rejection covers TS users, and a dev-only `console.warn` would buy little for its `process.env` bundler coupling.

## Design tokens & CSS build

- All design tokens live in `src/styles/tokens.css` as CSS custom properties (`--ps1ui-*`). Single source of truth for colors, spacing, radius, font, transitions.
- Three CSS entry points, all built via `build:css`:
  - `src/styles/styles.css` — the full canvas (imports `base.css` + `components.css`). Default for consumers who fully commit to the PS1 UI look.
  - `src/styles/base.css` — JetBrains Mono fontsource + `tokens.css` + **cross-browser reset** + `html { bg / color / font-family }` + `::selection`. Sets the ambient environment and normalizes UA styles (box-sizing on `*` only — pseudos intentionally excluded so `::before`/`::after` border tricks like Checkbox's rotated-L stay in the initial `content-box`; margin/padding zeroing on block containers; form-control font/color inheritance; `color-scheme: dark`; iOS text-size-adjust / tap-highlight; `sub`/`sup` line-height fix; etc.) so PS1 UI paints the same across Chrome / Safari / Firefox. Locked in by `src/styles/reset.test.tsx`. **Consumer heads-up**: raw semantic tags used OUTSIDE the corresponding component lose their UA appearance — a bare `<a>` inherits color with no underline (route through `<Anchor>`), a bare `<h1>` collapses to body text (route through `<Heading>`), a bare `<button>` has no chrome (route through `<Button>`), `<img>` becomes block (breaks inline avatars unless `display: inline` is set), and `<ul>`/`<ol>` lose their bullets. The full list of side effects is documented in `base.css`'s reset section header. The rationale for keeping ambient canvas rules on `html` rather than `body` (macOS/iOS overscroll region reveals `html`'s background) is documented in `base.css` near the ambient block.
  - `src/styles/components.css` — `tokens.css` + each component's CSS. Component visuals only; no page-canvas styles. For consumers embedding PS1 UI components into a foreign design system. **NEVER add a global reset here** — it would collide with the host system's own reset. The invariant (every top-level selector in `dist/components.css` must be `:root` or start with `.ps1ui-`) is enforced structurally by `scripts/check-css-split.mjs` at build time via a PostCSS AST walk. Component styles are deliberately **not** wrapped in `@layer`: unlayered host CSS (element-level rules like `button { … }`) would beat layered ps1ui classes regardless of specificity, breaking embedded components by default. The full rationale + supported override paths (token redefinition / specificity / consumer-side `@import … layer(…)`) live in `components.css`'s header comment.
- PostCSS inlines **only relative (`./`, `../`) `@import`s**. Bare specifiers stay raw so the consumer's bundler resolves them (inlining them would break packages' internal `url()` paths). **New first-party CSS imports must use a relative path** or they'll silently fail to inline. See the comment in `postcss.config.mjs`.
- Consequence of the bare-specifier passthrough: `dist/base.css` / `dist/styles.css` still contain `@import "@fontsource-variable/jetbrains-mono"`, which only a bundler-integrated CSS pipeline (Vite / webpack / PostCSS…) can resolve. **The CSS entries cannot be consumed via a plain `<link rel="stylesheet">`** — the browser can't resolve the bare specifier and 404s. Acceptable because the JS entry already presumes a bundler (React library); document this in the consumer README when it's written pre-release. If build-less consumption ever becomes a goal, add a separate CSS entry that splits the font `@import` out instead of weakening the passthrough rule.

### Palette sync

Storybook's manager UI theme (`.storybook/ps1uiTheme.ts`) runs in an iframe outside the preview and can't read the library's CSS variables — its hex colors are manually mirrored from `tokens.css`. `pnpm check:palette` (part of `pnpm build`) enforces that every hex literal in `ps1uiTheme.ts` exists in `tokens.css`. **When changing a color token, update `ps1uiTheme.ts` to match** or the build fails.

## Package exports (`package.json`)

- `.` → `dist/index.mjs` + `dist/index.d.mts` — **ESM only, no CJS**. `dist/` is unbundled (one module per source file, re-exported through `index.mjs`) so consumer bundlers tree-shake per component: `import { Button }` pulls in neither refractor + its grammars nor the `"use client"` components. Checkbox / CodeBlock carry a `"use client"` directive in their own dist modules (they use client-only hooks), so RSC frameworks (Next.js App Router) can import anything from the package inside Server Components without consumer-side wrapper files — the boundary is drawn inside the library, and server-safe components stay server-safe.
- `./styles.css` → `dist/styles.css` — full canvas (base + components), the standard consumer import
- `./base.css` → `dist/base.css` — canvas-only (root `<html>` bg/color/font + selection); pair with `./components.css` or use alone if you only want the ambient PS1 UI environment
- `./components.css` → `dist/components.css` — components-only; import when embedding PS1 UI components into another design system without touching the page canvas
- The JS entry does **not** inject styles — consumers must import one of the above CSS entries themselves
- `sideEffects: ["**/*.css", "**/CodeBlock/refractor.*"]` prevents bundlers from tree-shaking the CSS import and CodeBlock's `refractor.register(...)` calls (the glob covers both `src/.../refractor.ts` and `dist/.../refractor.mjs`). Everything else is declared side-effect-free — that's what lets bundlers skip unused component modules entirely. `check:dist` verifies the glob still matches the emitted registration module.
- React / React DOM are peer deps (`^19` — the ref-as-prop pattern above requires React 19); `@fontsource-variable/jetbrains-mono` is a regular dep because the CSS `@import`s it directly

## TypeScript

TS 7.0 with `verbatimModuleSyntax: true` (→ `import type` / `export type` must be explicit) and `noUncheckedIndexedAccess: true` (→ indexed accesses may be `undefined`).
