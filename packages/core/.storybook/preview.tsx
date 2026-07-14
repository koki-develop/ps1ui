import type { Preview } from "@storybook/react-vite";

import "@fontsource-variable/jetbrains-mono";
import "../src/styles/styles.css";

import { ps1uiTheme } from "./ps1uiTheme";

const preview: Preview = {
  tags: ["autodocs"],
  parameters: {
    a11y: {
      test: "error",
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
