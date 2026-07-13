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
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
  ],
  staticDirs: [{ from: fontsourceRoot, to: "/fonts/jetbrains-mono" }],
  typescript: {
    reactDocgen: "react-docgen",
  },
};

export default config;
