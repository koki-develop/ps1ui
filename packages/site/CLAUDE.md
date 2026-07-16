# @ps1ui/site — CLAUDE.md

Astro 7 landing page for `@ps1ui/core`. Deployed to
https://koki-develop.github.io/ps1ui/ via `.github/workflows/pages.yml`.

## Commands

- `pnpm dev` — Astro dev server (http://localhost:4321/ps1ui/)
- `pnpm build` — static build → `dist/` (requires `@ps1ui/core` `dist/` present)
- `pnpm preview` — serve the built `dist/` locally
- `pnpm typecheck` — `tsc --noEmit` (see note below on `astro check`)
- `pnpm check` — alias of `typecheck`

`astro check` is intentionally omitted from `typecheck` until `@astrojs/language-server` supports TypeScript 7.0 — the current release (2.16.11 as of 2026-07-16) crashes on `getTsconfig` with "Cannot read properties of undefined (reading 'fileExists')". `tsc --noEmit` still catches type errors in `.tsx` files and in the frontmatter of `.astro` files that `.astro`'s TS module maps to. Re-enable once compatibility lands.

## Conventions

- **Depend on built `@ps1ui/core`**: `workspace:*` resolves via symlink but Astro imports its `dist/` exports (`@ps1ui/core`, `@ps1ui/core/styles.css`). Always run `pnpm --filter @ps1ui/core build` before `pnpm --filter @ps1ui/site dev|build`.
- **Base path**: `astro.config.mjs` sets `base: "/ps1ui"`. Static asset URLs referenced from `.astro` templates (image `src`, `<link href>`) are auto-prefixed by Astro. Internal `<a href>` attributes are NOT auto-prefixed — when adding a link to another page in this site, prefix the path with `import.meta.env.BASE_URL` yourself (currently only external links exist, so no helper is warranted; add one if internal linking grows).
- **No `client:*` unless proven needed**: every `@ps1ui/core` public component renders statically. `CodeBlock` uses hooks internally but its SSR output is complete syntax-highlighted HTML — hydration only re-measures overflow on window resize, which we skip. Adding `client:load` ships React runtime (~40KB); don't.
- **Reset-aware markup**: `@ps1ui/core/base.css` resets bare `<a>` / `<h*>` / `<button>` / `<ul>` / `<img>` etc. to un-styled state. Always route through `<Anchor>` / `<Heading>` / `<Button>` / `<CodeBlock>`.
- **No lint/fmt in hooks**: `lefthook.yml` oxlint/oxfmt is scoped to `packages/core/`. Astro `.astro` files aren't oxlint-supported yet, so this package is currently unlinted.
- **PR gating vs deploy**: `ci.yml` runs `pnpm --filter @ps1ui/site typecheck` + `build` on every PR (after `@ps1ui/core build`) — that's the site's PR ゲート. `.github/workflows/pages.yml` only fires on `push: main` / `workflow_dispatch` and does the actual deploy.

## Initial GitHub Pages setup (one-time manual)

Repo `Settings > Pages > Source` must be switched to **GitHub Actions** before the first deploy — this is a repo config that can't be flipped from code.
