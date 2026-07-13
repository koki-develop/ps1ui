import type { Preview } from "@storybook/react-vite";

import "@fontsource-variable/jetbrains-mono";
import "../src/styles/index.css";

import { ps1uiTheme } from "./ps1uiTheme";

const preview: Preview = {
  tags: ["autodocs"],
  parameters: {
    backgrounds: {
      default: "ps1ui",
      options: {
        ps1ui: { name: "ps1ui", value: "#0b0f14" },
      },
    },
    docs: {
      theme: ps1uiTheme,
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
