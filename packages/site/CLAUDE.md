# @ps1ui/site — CLAUDE.md

Astro 7 landing page for `@ps1ui/core`. Deployed to https://koki-develop.github.io/ps1ui/ via `.github/workflows/pages.yml` (push to `main` only; PR gating is `ci.yml`'s typecheck + build).

## Commands

- `pnpm dev` — dev server (http://localhost:4321/ps1ui/). Does **not** serve `/storybook` — run `pnpm --filter @ps1ui/core storybook` (port 6006) alongside when needed.
- `pnpm build` — `astro build` + `build:storybook`, both into `dist/`
- `pnpm build:storybook` — builds core's Storybook into `dist/storybook/` at base `/ps1ui/storybook/` via the `STORYBOOK_BASE_PATH` env var; dispatched with `pnpm --filter` so no Storybook dep is added here. Unix-only env-var syntax.
- `pnpm preview` — serve built `dist/` (matches the GitHub Pages topology, `/storybook` included)
- `pnpm typecheck` / `pnpm check` — `tsc --noEmit`. `astro check` is intentionally omitted until `@astrojs/language-server` supports TS 7.0 (it currently crashes on `getTsconfig`); re-enable once compatibility lands.

## Conventions

- **Build core first**: Astro imports `@ps1ui/core`'s `dist/` exports — run `pnpm --filter @ps1ui/core build` before dev/build.
- **Base path**: `astro.config.mjs` sets `base: "/ps1ui"`. Astro auto-prefixes asset URLs but NOT `<a href>` — route every internal link through `href()` (`src/lib/url.ts`; base-relative, no leading slash, trailing slash required).
- **No `client:*` unless proven needed** — every core component renders statically (CodeBlock's SSR output is complete); hydration ships ~40KB of React runtime.
- **Reset-aware markup**: core's `base.css` un-styles bare `<a>` / `<h*>` / `<button>` / `<ul>` / `<img>` — route through `<Anchor>` / `<Heading>` / `<Button>` / `<CodeBlock>`.
- `.astro` files are unlinted (oxlint doesn't support them; lefthook is scoped to `packages/core/`).

## Component pages

`/components/<slug>/` pages are hand-written `src/pages/components/<slug>.astro` files using the `ComponentPage` layout + `Demo` blocks, driven by the registry in `src/lib/components.ts`. Adding a core component requires both a registry entry and a page file — the `new-component` skill in `packages/core` has the full checklist.
