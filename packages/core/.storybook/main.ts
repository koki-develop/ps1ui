import { createRequire } from "node:module";
import path from "node:path";

import type { StorybookConfig } from "@storybook/react-vite";

const require = createRequire(import.meta.url);
const fontsourceRoot = path.dirname(
  require.resolve("@fontsource-variable/jetbrains-mono/package.json"),
);

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.@(ts|tsx|mdx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-vitest", "@storybook/addon-a11y"],
  staticDirs: [{ from: fontsourceRoot, to: "/fonts/jetbrains-mono" }],
  typescript: {
    reactDocgen: "react-docgen",
  },
  // Subpath deploys (e.g. @ps1ui/site bundling us at /ps1ui/storybook/) set
  // STORYBOOK_BASE_PATH so Vite emits correctly-prefixed asset URLs. Unset in
  // dev / `pnpm build-storybook` so the default (`/`) is preserved.
  async viteFinal(config) {
    const base = process.env.STORYBOOK_BASE_PATH;
    if (!base) return config;
    const { mergeConfig } = await import("vite");
    return mergeConfig(config, { base });
  },
};

export default config;
