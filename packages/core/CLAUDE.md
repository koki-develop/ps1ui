# @ps1ui/core — CLAUDE.md

React UI component library for a monospace design system (dark canvas, JetBrains Mono). All commands run from this directory (`packages/core`).

Domain-specific conventions live in `.claude/rules/` (testing / vrt / responsive / styles) and load when you touch matching files. Long-form rationale lives in header comments of the files involved — read those before changing build config or styles.

## Commands

- `pnpm build` — `check` + `build:js` (tsdown) + `build:css` (postcss) + `check:dist`
- `pnpm check` — `typecheck` + `check:palette` + `check:languages` + `check:responsive-property-coverage`
- `pnpm lint` / `pnpm lint:fix` — oxlint; `pnpm fmt` / `pnpm fmt:check` — oxfmt
- `pnpm test` — Vitest watch; `pnpm test run` for one-shot; `pnpm test:ci` — unit + storybook projects
- `pnpm test:coverage` — unit + storybook, Chromium only, 100% line thresholds (vrt excluded on purpose)
- `pnpm test:vrt` / `pnpm test:vrt:update` — VRT project only (see `.claude/rules/vrt.md`)
- `pnpm storybook` — dev server on port 6006; `pnpm build-storybook` — static build (`STORYBOOK_BASE_PATH` env var controls subpath deploys; used by `@ps1ui/site`)

The `check:*` scripts are structural gates with self-explanatory errors — when one fails, fix what it names, don't weaken the check.

## Testing

Tests run in real Chromium / Firefox / WebKit via Vitest Browser Mode. Missing browsers on a fresh clone: `pnpm exec playwright install`. Three Vitest projects (`vitest.config.ts`): `unit` (`*.test.tsx`), `storybook` (every story auto-tested + axe), `vrt` (`*.vrt.test.tsx`).

Gotchas that errors won't teach you:

- `render()` from vitest-browser-react is async — always `await render(...)`; assertions and interactions are awaited too (`await expect.element(...)`, `await locator.click()`).
- Browser Mode isolates state per **file**, not per test.
- Never add a manual `test.include` or `setProjectAnnotations()` setup to the `storybook` project — `storybookTest()` handles both; adding either breaks it.
- Real input state is global and outlives a test: the Playwright cursor stays where it was last moved, and OS focus belongs to one page at a time. `withPseudoState` owns both — it parks the pointer off-fixture on release and reclaims focus before asserting one — so drive hover/active/focus through it, never through raw `userEvent.hover` / `.focus()` in a test that then reads styles. A cursor left on a fixture silently turns every later resting-state read in that file into a `:hover` read.
- Prefer `CSS.supports(...)` feature detection over hardcoding browser names; fall back to `server.browser` only for verified rendering quirks (`src/styles/reset.test.tsx` has examples, including a `CSS.supports` false positive).
- Known Firefox flake: `.focus()` + Space-key activation tests fail intermittently under full-suite load, never in isolation — re-run before assuming a regression (full account in `Checkbox.test.tsx`).

## Component authoring

Each component: `src/components/<Name>/` with `<Name>.tsx / .css / .test.tsx / .stories.tsx / .vrt.test.tsx` (+ conditional `.contrast.test.tsx`). Use the `new-component` skill for the full checklist — it includes the required `@ps1ui/site` docs page.

- Ultra-thin native wrappers: type props as `ComponentProps<"tag"> & { extras }` and spread `...rest` onto the element. React 19 ref-as-prop — no `forwardRef`, and don't "fix" to `ComponentPropsWithoutRef` (it would drop `ref`).
- Polymorphic (`as`-bearing) components use one shape, no exceptions: `<Name>Props<E> = <Name>OwnProps<E> & Omit<ComponentProps<E>, keyof <Name>OwnProps<E>>`, rendered through `createElement(as ?? "<default>", …)`. The canonical write-up (including why it is `ComponentProps`, not `ComponentPropsWithoutRef`) sits on `TextProps` in `Text.tsx`; the contract is pinned across every such component by `src/polymorphic.test-d.tsx`. Don't extract a shared helper type — `@ps1ui/site`'s props extractor can't follow a type parameter through a nested generic alias.
- Build `className` with `cx(...)` (`src/utils/cx.ts`).
- Class naming: `ps1ui-<component>` base, `ps1ui-<component>--<modifier>` for variants. Existing names are public API — don't rename.
- `style` merge order is `{ ...callerStyle, ...resolvedVars }` — internal `--_*` vars intentionally win over same-named caller keys.
- **Every new component must be re-exported from `src/index.ts`** (component + types) — the public API surface.
- Give every own prop (the non-passthrough ones) a one-line `/** ... */` doc comment — `@ps1ui/site`'s auto-generated Props tables and IDE hovers render it. Defaults applied outside destructuring (CSS custom-property fallbacks) are declared with an `@default` tag, never repeated in the prose.
- Polymorphic `as` + `disabled`: rejected at the type level only (`Button.test-d.tsx`); no runtime guard on purpose.
- 100% line coverage is enforced but isn't behavior coverage — **every observable behavior a change introduces needs a direct assertion** (computed styles via `withPseudoState`, classes, attributes, handlers). If genuinely untestable, say why in a comment.

## TypeScript

TS 7.0 with `verbatimModuleSyntax` (explicit `import type` / `export type`) and `noUncheckedIndexedAccess` (indexed accesses may be `undefined`).
