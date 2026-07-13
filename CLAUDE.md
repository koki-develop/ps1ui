# CLAUDE.md

`ps1ui` is a pnpm monorepo. Currently one package: `@ps1ui/core` in `packages/core`.

## Working in this repo

- The root has no npm scripts. All build / test / storybook / lint commands live in `packages/core` — see `packages/core/CLAUDE.md`.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 10080` (7 days). Newly-published versions of dependencies won't install for a week. If a fresh install fails with a minimum-release-age error, that's why — don't disable the setting, either wait or pin a slightly older version.
