---
paths:
  - "**/*.vrt.test.tsx"
  - "**/__screenshots__/**"
  - "**/src/testing/vrt*"
  - "**/.github/workflows/vrt*.yml"
---

# Visual regression testing

The `vrt` Vitest project uses Vitest 4's `toMatchScreenshot` (pixelmatch, `threshold: 0.1`, `allowedMismatchedPixelRatio: 0.01`). Every component that renders visible DOM ships a `<Name>.vrt.test.tsx`; headless helpers (Provider/Portal/hook-only) don't.

## Baselines

- Only **`-linux.png`** baselines are committed; `-darwin.png` / `-win32.png` are gitignored scratch — regenerate freely.
- **NEVER regenerate or commit `-linux.png` locally** (including via a Linux container) — local rasterisation plants flaky baselines. A PR that intentionally changes pixels stays VRT-red until it merges and `main`'s auto-heal (`.github/workflows/vrt-update.yml`, see its header comment) regenerates.
- On macOS, the first `pnpm test:vrt` after a fresh checkout auto-generates darwin baselines and reports missing-reference errors once — re-run and it passes.
- Any `VrtFrame` edit invalidates every committed baseline by construction — land it in a dedicated commit and inspect the auto-heal diff.

## Authoring

- Wrap every capture in `VrtFrame` (`src/testing/vrt.tsx`): screenshot target is `data-testid="vrt-frame"`, pseudo-state hook is `data-testid="vrt-target"`. Use `withPseudoState` for hover/focus states — copy the template from any existing `.vrt.test.tsx`.
- Typography-only components (Text, Heading, Label): cover each axis independently at defaults — don't cartesian-product the axes.
- Responsive components: one capture per breakpoint band; the below-sm capture uses `stageWidth: 320`, doubling as the WCAG 2.2 reflow baseline.
- **Skip with `ctx.skip(condition, reason)`, never early `return`** — an early return reports as _pass_ while asserting nothing.
- WebKit can't Tab-reach `:focus-visible` on buttons / links / checkboxes / `tabindex=0` divs (macOS Full Keyboard Access default) — `ctx.skip` those combos. Text inputs are reachable everywhere.

## Known flakes (not fixable from our side)

- Firefox: `Button secondary + focus-visible` and `Anchor subtle + focus-visible` rasterise inconsistently (transparent bg + alpha focus-ring blend) — permanently skipped on Firefox; other browsers still cover them.
- Local webkit+darwin `Button as='a'` captures have two stable variants across sessions — regenerate (`pnpm test:vrt:update`) and re-run before suspecting a real regression.
