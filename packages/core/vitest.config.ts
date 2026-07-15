import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { pointerDown, pointerUp } from "./vitest.browser-commands";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// @vitest/coverage-v8 only instruments a single Chromium instance (it errors outright
// otherwise — V8 coverage is a Chromium-engine-only capability, not something Firefox/
// WebKit expose). Coverage measures JS statement/branch execution, which doesn't vary
// by rendering engine, so restricting the coverage run to Chromium loses nothing;
// cross-browser CSS/DOM correctness is verified by the coverage-free `pnpm test` run.
// Each project needs its OWN array instance: Vitest's workspace plugin runs
// `instance.name ??= ...` on each instance object per project (vitest source:
// packages/vitest/src/node/plugins/workspace.ts), so a shared object reference
// keeps the FIRST project's assigned name ("unit (chromium)") when the second
// project's `resolveBrowserProjects` reads it, tripping its own duplicate-name
// check ("Cannot define a nested project... was already defined").
function browserInstances() {
  // Match any `--coverage`-prefixed flag (`--coverage`, `--coverage=true`,
  // `--coverage.enabled=true`, ...), not just the exact bare token — an exact
  // match would silently miss those variants and let the coverage-v8 crash
  // above resurface.
  const coverageRequested = process.argv.some((arg) => arg.startsWith("--coverage"));
  return coverageRequested
    ? [{ browser: "chromium" as const }]
    : [
        { browser: "chromium" as const },
        { browser: "firefox" as const },
        { browser: "webkit" as const },
      ];
}

// Shared cross-project defaults for `test.browser`. Each project spreads this
// then overlays project-specific fields (name, commands, screenshotFailures,
// expect.toMatchScreenshot). Hoisting these here prevents silent drift when a
// new browser-level setting (viewport, locale, isolate, etc.) is introduced —
// there's exactly one place to add it. `instances` and `provider` are called
// per project (not stored on this base) because both must return their own
// per-project object references (see the `browserInstances()` comment above,
// and `playwright()` similarly returns fresh state each call).
function browserBase() {
  return {
    enabled: true as const,
    provider: playwright(),
    instances: browserInstances(),
    headless: true,
  };
}

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.stories.tsx",
        "src/**/*.test.tsx",
        "src/**/*.vrt.test.tsx",
        "src/testing/**",
      ],
      // Aggregate is enforced across the `unit` + `storybook` projects (the
      // `vrt` project is coverage-excluded above via `*.vrt.test.tsx`). Running
      // with `--project unit` or `--project storybook` alone will drop below
      // 100% and fail. Always run `pnpm test:coverage` (no --project filter)
      // for gate checks.
      thresholds: {
        perFile: true,
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          // VRT files live alongside unit tests but are their own project so
          // that `-u` (screenshot baseline update) is scoped to VRT — `-u`
          // updates inline snapshots too, and we don't want a stray unit-test
          // snapshot getting rewritten during a baseline refresh.
          exclude: ["**/*.vrt.test.tsx"],
          browser: {
            ...browserBase(),
            commands: { pointerDown, releasePointer: pointerUp },
          },
        },
      },
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
            storybookScript: "pnpm storybook --ci",
          }),
        ],
        test: {
          name: "storybook",
          browser: browserBase(),
        },
      },
      {
        extends: true,
        test: {
          name: "vrt",
          include: ["src/**/*.vrt.test.tsx"],
          browser: {
            ...browserBase(),
            commands: { pointerDown, releasePointer: pointerUp },
            // Vitest's default failure snapshot writes `<test-name>-N.png`
            // under __screenshots__/ with no browser/platform suffix, which
            // would collide with VRT's `<name>-<browser>-<platform>.png`
            // baseline layout. `.gitignore` catches the `-N.png` pattern
            // (belt-and-braces), and turning failure snapshots off here also
            // removes the redundant page snapshot — a VRT failure already
            // produces a `-actual` + `-diff` pair under .vitest-attachments/
            // (kept untracked), which is a strictly better diagnostic.
            screenshotFailures: false,
            expect: {
              // Playwright's screenshot defaults (animations: "disabled",
              // caret: "hide") are auto-applied by @vitest/browser-playwright;
              // no CSS override needed. pixelmatch threshold defaults to 0.1
              // — tightened slightly here so genuine color drifts aren't
              // silently absorbed.
              toMatchScreenshot: {
                comparatorName: "pixelmatch",
                comparatorOptions: {
                  // `threshold` at the pixelmatch default (0.1) — a
                  // stricter 0.05 rejected consecutive WebKit/Firefox
                  // frames on text-only fixtures (Anchor subtle,
                  // Button secondary) where the browser rasterises
                  // glyph edges slightly differently per capture,
                  // starving Stable Screenshot Detection. Sub-pixel
                  // text noise is exactly what this tolerance is for.
                  threshold: 0.1,
                  // Ratio kept tight (1%) so a real colour/token drift
                  // of even a small region still trips the diff — a
                  // 20×20 accent swap on a 320×80 capture is ~1.5%,
                  // well over threshold.
                  allowedMismatchedPixelRatio: 0.01,
                },
                // Bumped from the 5s default so Stable Screenshot
                // Detection gets extra retries on text-heavy fixtures
                // that converge slowly on Firefox/WebKit.
                timeout: 15000,
              },
            },
          },
        },
      },
    ],
  },
});
