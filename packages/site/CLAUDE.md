# @ps1ui/site — CLAUDE.md

Astro 7 landing page for `@ps1ui/core`. Deployed to
https://koki-develop.github.io/ps1ui/ via `.github/workflows/pages.yml`.

## Commands

- `pnpm dev` — Astro dev server (http://localhost:4321/ps1ui/). Does **not** serve `/storybook` — for Storybook dev use `pnpm --filter @ps1ui/core storybook` (port 6006).
- `pnpm build` — `astro build` + `build:storybook`, both writing into `dist/`. Requires `@ps1ui/core` `dist/` present for Astro's imports (the Storybook step reads core's source, not its dist).
- `pnpm build:storybook` — builds `@ps1ui/core`'s Storybook into `dist/storybook/` with base `/ps1ui/storybook/`. Sets `STORYBOOK_BASE_PATH` and dispatches via `pnpm --filter @ps1ui/core exec storybook build` so no Storybook dependency is added to this package. Unix-only (env-var-prefix syntax); the repo has no Windows workflow.
- `pnpm preview` — serve the built `dist/` locally (both `/ps1ui/` and `/ps1ui/storybook/` are served from the same origin, matching the GitHub Pages topology).
- `pnpm typecheck` — `tsc --noEmit` (see note below on `astro check`)
- `pnpm check` — alias of `typecheck`

`astro check` is intentionally omitted from `typecheck` until `@astrojs/language-server` supports TypeScript 7.0 — the current release (2.16.11 as of 2026-07-16) crashes on `getTsconfig` with "Cannot read properties of undefined (reading 'fileExists')". `tsc --noEmit` still catches type errors in `.tsx` files and in the frontmatter of `.astro` files that `.astro`'s TS module maps to. Re-enable once compatibility lands.

## Page structure

- `/` — landing (hero + install + CTAs), `src/pages/index.astro`
- `/getting-started/` — setup guide, `src/pages/getting-started.astro`
- `/components/` + `/components/<slug>/` — component index and one page per `@ps1ui/core` component. Each page is a hand-written `src/pages/components/<slug>.astro` using the `ComponentPage` layout (header + import line from the registry) and `Demo` blocks (live static render + code string). **Adding a component to core means adding its entry to `src/lib/components.ts` (registry: sidebar, index, page headers) AND a matching page file.** Live previews render statically — avoid demos that need client JS to look right (e.g. Checkbox `indeterminate` is a DOM property set in an effect, so it won't show without hydration).
- `/storybook/` — static Storybook build (see below); linked only from the footer.

## Conventions

- **Depend on built `@ps1ui/core`**: `workspace:*` resolves via symlink but Astro imports its `dist/` exports (`@ps1ui/core`, `@ps1ui/core/styles.css`). Always run `pnpm --filter @ps1ui/core build` before `pnpm --filter @ps1ui/site dev|build`.
- **Base path**: `astro.config.mjs` sets `base: "/ps1ui"`. Static asset URLs referenced from `.astro` templates (image `src`, `<link href>`) are auto-prefixed by Astro. Internal `<a href>` attributes are NOT auto-prefixed — route every internal link through the `href()` helper in `src/lib/url.ts` (`href("components/button/")`; base-relative, no leading slash, trailing slash required because `trailingSlash: "always"`).
- **No `client:*` unless proven needed**: every `@ps1ui/core` public component renders statically. `CodeBlock` uses hooks internally but its SSR output is complete syntax-highlighted HTML — hydration only re-measures overflow on window resize, which we skip. Adding `client:load` ships React runtime (~40KB); don't.
- **Reset-aware markup**: `@ps1ui/core/base.css` resets bare `<a>` / `<h*>` / `<button>` / `<ul>` / `<img>` etc. to un-styled state. Always route through `<Anchor>` / `<Heading>` / `<Button>` / `<CodeBlock>`.
- **No lint/fmt in hooks**: `lefthook.yml` oxlint/oxfmt is scoped to `packages/core/`. Astro `.astro` files aren't oxlint-supported yet, so this package is currently unlinted.
- **PR gating vs deploy**: `ci.yml` runs `pnpm --filter @ps1ui/site typecheck` (parallel with `@ps1ui/core` lint/fmt:check) and `build` (after `@ps1ui/core build`) on every PR — that's the site's PR ゲート. Because `build` now chains Storybook, PR CI catches Storybook build regressions too. `.github/workflows/pages.yml` only fires on `push: main` / `workflow_dispatch` and does the actual deploy — no yml changes were needed for the `/storybook` addition since site's `pnpm build` produces the full artifact tree.

## Storybook at `/storybook`

- The deployed Pages artifact serves Storybook at `https://koki-develop.github.io/ps1ui/storybook/`. It's a plain static build of `@ps1ui/core`'s Storybook written into `dist/storybook/` by `pnpm build:storybook`.
- Base path is injected via the `STORYBOOK_BASE_PATH` env var, which `@ps1ui/core/.storybook/main.ts`'s `viteFinal` merges into `config.base`. Unset → Vite uses `/` (dev / standalone `pnpm build-storybook`); set to `/ps1ui/storybook/` here so Vite prefixes every emitted asset URL.
- Dev has no unified `/storybook` — run `pnpm --filter @ps1ui/core storybook` (port 6006) alongside `pnpm dev` when iterating. Only `pnpm build` + `pnpm preview` produces the merged surface.

## Initial GitHub Pages setup (one-time manual)

Repo `Settings > Pages > Source` must be switched to **GitHub Actions** before the first deploy — this is a repo config that can't be flipped from code.
