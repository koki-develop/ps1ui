import { create } from "storybook/theming";

// Palette hexes duplicate src/styles/tokens.css — the Storybook manager
// iframe runs outside the preview and cannot read the library's CSS
// variables, so it must be mirrored here. Keep in sync when tokens change.
export const poiuiTheme = create({
  base: "dark",

  brandTitle: "poiui",
  brandUrl: "https://github.com/koki-develop/poiui",

  colorPrimary: "#7ee787",
  colorSecondary: "#7ee787",

  appBg: "#0b0f14",
  appContentBg: "#0b0f14",
  appHoverBg: "#0f1520",
  appPreviewBg: "#0b0f14",
  appBorderColor: "#21262d",
  appBorderRadius: 3,

  fontBase:
    '"JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, Monaco, monospace',
  fontCode:
    '"JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, Monaco, monospace',

  textColor: "#c7d5df",
  textInverseColor: "#0b0f14",
  textMutedColor: "#8b98a5",

  barTextColor: "#8b98a5",
  barHoverColor: "#7ee787",
  barSelectedColor: "#7ee787",
  barBg: "#0f1520",

  buttonBg: "#0f1520",
  buttonBorder: "#30363d",

  booleanBg: "#0f1520",
  booleanSelectedBg: "#30363d",

  inputBg: "#0b0f14",
  inputBorder: "#30363d",
  inputTextColor: "#c7d5df",
  inputBorderRadius: 3,
});
