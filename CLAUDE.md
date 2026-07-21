# CLAUDE.md

`ps1ui` is a pnpm monorepo. Packages:

- `@ps1ui/core` — React component library (`packages/core`)
- `@ps1ui/site` — Astro 7 landing page (`packages/site`), deployed to https://koki-develop.github.io/ps1ui/ via `.github/workflows/pages.yml`

## Working in this repo

- The root `package.json` only has `dev` (→ `@ps1ui/site` dev server) and `storybook` (→ `@ps1ui/core` Storybook) as convenience proxies. All other per-package commands live in each package — see `packages/<name>/CLAUDE.md`.
- Adding a component to `@ps1ui/core` also requires a docs page in `@ps1ui/site` — the `new-component` skill (`packages/core/.claude/skills/`) has the full checklist.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 10080` (7 days). Newly-published versions of dependencies won't install for a week. If a fresh install fails with a minimum-release-age error, add the offending package to `minimumReleaseAgeExclude` (follow the existing pattern) — don't lower the global threshold.
- **GitHub Pages first-time setup**: `Settings > Pages > Source` must be switched to **GitHub Actions** before the first deploy — this is a repo config that can't be flipped from code.

## Commit convention

Commit messages follow Conventional Commits and drive release-please. Only three types are used:

| type    | Use for                                                               | release-please |
| ------- | --------------------------------------------------------------------- | -------------- |
| `feat`  | Changes visible to `@ps1ui/core` consumers that add/extend behavior   | minor bump     |
| `fix`   | Changes visible to `@ps1ui/core` consumers that fix broken behavior   | patch bump     |
| `chore` | Everything else                                                       | no release     |

The rule for choosing `feat`/`fix` vs `chore` is a single question: **does this change affect the public API or runtime behavior of `@ps1ui/core` as seen by its consumers?** If no, it's `chore` — no matter how large or important the change is. Do not introduce other types (`docs`, `refactor`, `test`, `ci`, `build`, `style`, `perf`, etc.); fold them all into `chore`.

Examples of `chore`:

- Anything under `@ps1ui/site` (the landing page is not published to npm)
- Internal refactors that keep the public API identical
- Tests, Storybook stories, VRT baseline updates
- CI / GitHub Actions, dependency bumps (including Renovate PRs)
- Config files (`tsconfig.json`, `oxlint.config.ts`, etc.), documentation, root `package.json` script tweaks

### Breaking changes

Append `!` to the type (`feat!:` / `fix!:`) or add a `BREAKING CHANGE:` footer. release-please treats these as a major bump.

### Scope

Do not add a scope. The only published package is `@ps1ui/core`, so a scope would be redundant. The one exception is the `chore(main): release core x.y.z` commits that release-please generates itself — leave those alone.

### Subject line

- English, imperative mood, capitalized first word, no trailing period, ≤ 72 chars
- Do not append `(#123)` manually — GitHub adds the PR number on squash-merge

### Examples

```
✔ feat: Add Textarea component
✔ feat: Add `variant` prop to Button
✔ fix: Correct Textarea focus ring color in dark mode
✔ fix!: Rename Button `kind` prop to `variant`
✔ chore: Update VRT baselines
✔ chore: Bump vitest to 3.2.0
✔ chore: Add root dev/storybook script shortcuts       ← no consumer-visible change
✔ chore: Update site landing hero copy                 ← site is not published
✔ chore: Refactor Button internals                     ← public API unchanged

✘ feat: Update VRT baselines                           → chore
✘ feat: Add script shortcuts to root package.json      → chore (no consumer impact)
✘ fix: Fix typo in CLAUDE.md                           → chore
✘ update: Add new component                            → feat (non-standard type)
```
