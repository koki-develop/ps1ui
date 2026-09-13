import { createRequire } from "node:module";
import path from "node:path";

import type { StorybookConfig } from "@storybook/react-vite";

const require = createRequire(import.meta.url);
const fontsourceRoot = path.dirname(
  require.resolve("@fontsource-variable/jetbrains-mono/package.json"),
);

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  // Docs-only MDX pages live next to this config, not under src/ — they document
  // the library rather than being part of it. Listed first because sidebar order
  // follows this array, which is what puts Introduction above Components.
  stories: ["./*.mdx", "../src/**/*.stories.@(ts|tsx|mdx)"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
  ],
  staticDirs: [{ from: fontsourceRoot, to: "/fonts/jetbrains-mono" }],
  typescript: {
    reactDocgen: "react-docgen",
  },
  // Subpath deploys (e.g. @ps1ui/site bundling us at /ps1ui/storybook/) set
  // STORYBOOK_BASE_PATH so Vite emits correctly-prefixed asset URLs. Unset in
  // dev / `pnpm build-storybook` so the default (`/`) is preserved.
  async viteFinal(config) {
    const { mergeConfig } = await import("vite");
    const base = process.env.STORYBOOK_BASE_PATH;
    return mergeConfig(config, {
      ...(base ? { base } : {}),
      build: {
        // Vite 8's default `build.cssTarget` (inherited from `build.target`'s
        // "baseline-widely-available", i.e. Safari 16.4 / Firefox 114 as the
        // floor) predates native `light-dark()` support. Below that target,
        // Lightning CSS (Vite's default CSS minifier) rewrites `light-dark()`
        // into a `prefers-color-scheme`-only fallback that ignores the
        // `color-scheme` CSS property entirely — so in the built (minified)
        // output, a nested `data-ps1ui-theme` override (PS1Root's `theme`
        // prop) stops working: every `light-dark()` token keeps resolving
        // against the document's theme. Pinning cssTarget to versions that
        // ship native `light-dark()` (Chrome 123, Firefox 120, Safari 17.5)
        // tells Lightning CSS the feature is already supported, so it passes
        // the function through unchanged and per-subtree theming works in
        // `pnpm build-storybook` output the same way it does in dev.
        cssTarget: ["chrome123", "firefox120", "safari17.5"],
      },
    });
  },
};

export default config;
