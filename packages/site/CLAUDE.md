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

**Exception — child-only helpers.** A component that only makes sense as a child of another primitive (e.g. `GridItem` inside `Grid`) is documented on the parent's page with `Demo` blocks; it skips its own registry entry AND page, and instead is listed in the parent entry's `childComponents` (which gives it a props table on the parent's page). Rationale: the sidebar carries one entry per top-level primitive, and listing a child helper as a sibling of the parent reads as an independent choice, fragmenting the story exactly where it needs to stay together.

## Props tables

Every component page ends with an auto-generated Props reference: `ComponentPage` renders `PropsTable` for the page's component plus its registry `childComponents` — nothing per-page to write. The data comes from `src/lib/props.ts`, which reads core's **source** types through the TypeScript API (`typescript/unstable/sync` — the same tsgo binary as `tsc`, so it can't disagree with the typecheck): own props (declared type simplified for readers — literal-union aliases expand, `Responsive<T>` reduces to `T`, `X | (string & {})` reduces to `string`; JSDoc description; and the default from exactly one of: destructuring initializer, `as` type-param default, or `@default` JSDoc tag) plus a one-line summary per native passthrough (`ComponentProps<"tag">` is deliberately never expanded into hundreds of DOM attrs). A Props alias shape the extractor can't classify fails the build loudly — extend `props.ts`, don't hand-write a table. In `astro dev` the extraction is cached per server process; restart to pick up core prop-type edits.
