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

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.stories.tsx", "src/**/*.test.tsx", "src/testing/**"],
      // Aggregate is enforced across BOTH projects (unit + storybook); running with
      // `--project unit` or `--project storybook` alone will drop below 100% and fail.
      // Always run `pnpm test:coverage` (no --project filter) for gate checks.
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
          browser: {
            enabled: true,
            provider: playwright(),
            instances: browserInstances(),
            headless: true,
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
          browser: {
            enabled: true,
            provider: playwright(),
            instances: browserInstances(),
            headless: true,
          },
        },
      },
    ],
  },
});
