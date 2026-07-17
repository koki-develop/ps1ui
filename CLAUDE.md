# CLAUDE.md

`ps1ui` is a pnpm monorepo. Packages:

- `@ps1ui/core` — React component library (`packages/core`)
- `@ps1ui/site` — Astro 7 landing page (`packages/site`), deployed to https://koki-develop.github.io/ps1ui/ via `.github/workflows/pages.yml`

## Working in this repo

- The root has no npm scripts. Per-package commands live in each package — see `packages/<name>/CLAUDE.md`.
- Adding a component to `@ps1ui/core` also requires a docs page in `@ps1ui/site` — the `new-component` skill (`packages/core/.claude/skills/`) has the full checklist.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 10080` (7 days). Newly-published versions of dependencies won't install for a week. If a fresh install fails with a minimum-release-age error, add the offending package to `minimumReleaseAgeExclude` (follow the existing pattern) — don't lower the global threshold.
- **GitHub Pages first-time setup**: `Settings > Pages > Source` must be switched to **GitHub Actions** before the first deploy — this is a repo config that can't be flipped from code.
