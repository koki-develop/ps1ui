import type { Preview, ReactRenderer } from "@storybook/react-vite";
import { withThemeByDataAttribute } from "@storybook/addon-themes";

import "@fontsource-variable/jetbrains-mono";
import "../src/styles/styles.css";

import { ThemedDocsContainer } from "./ThemedDocsContainer";

const preview: Preview = {
  tags: ["autodocs"],
  decorators: [
    // Drives the same `data-ps1ui-theme` attribute consumers set themselves
    // (see tokens.css / PS1Root's `theme` prop) — what the toolbar switches
    // here is exactly what ships, no separate preview-only theming layer.
    // The `storybook` Vitest project (vitest.config.ts) has no toolbar, so it
    // applies this decorator with its `defaultTheme` and therefore tests
    // every story in dark — light-theme contrast is owned by the
    // `*.contrast.test.tsx` files, not by story a11y runs.
    withThemeByDataAttribute<ReactRenderer>({
      themes: {
        dark: "dark",
        light: "light",
      },
      defaultTheme: "dark",
      attributeName: "data-ps1ui-theme",
    }),
  ],
  parameters: {
    a11y: {
      test: "error",
    },
    docs: {
      // `theme` is deliberately absent: it is a static value read once at
      // render (see ThemedDocsContainer.tsx's header comment). `container`
      // is the switch that lets Docs pages follow the toolbar's `theme`
      // global live.
      container: ThemedDocsContainer,
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
