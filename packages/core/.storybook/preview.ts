import type { Preview } from "@storybook/react-vite";

import "@fontsource-variable/jetbrains-mono";
import "../src/styles/index.css";

import { poiuiTheme } from "./poiuiTheme";

const preview: Preview = {
  tags: ["autodocs"],
  parameters: {
    backgrounds: {
      default: "poiui",
      options: {
        poiui: { name: "poiui", value: "#0b0f14" },
      },
    },
    docs: {
      theme: poiuiTheme,
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
