import { create } from "storybook/theming";
import type { ThemeVars } from "storybook/theming";

// Palette hexes duplicate src/styles/tokens.css — the Storybook manager
// iframe runs outside the preview and cannot read the library's CSS
// variables, so they must be mirrored here. Keep in sync when tokens change.
// `dark` mirrors the DARK side of every `light-dark(LIGHT, DARK)` pair in
// tokens.css, `light` mirrors the LIGHT side — `check:palette` enforces that
// every hex below exists somewhere in tokens.css (it doesn't verify which
// side, or the semantic slot mapping). The manager switches between the two
// at runtime to follow the preview's theme toolbar — see manager.ts.
interface Ps1uiPalette {
  base: "dark" | "light";
  colorAccent: string;
  appBg: string;
  appContentBg: string;
  appHoverBg: string;
  appPreviewBg: string;
  appBorderColor: string;
  textColor: string;
  textInverseColor: string;
  textMutedColor: string;
  barTextColor: string;
  barBg: string;
  buttonBg: string;
  buttonBorder: string;
  booleanBg: string;
  booleanSelectedBg: string;
  inputBg: string;
  inputBorder: string;
  inputTextColor: string;
}

const createPs1uiTheme = ({
  base,
  colorAccent,
  appBg,
  appContentBg,
  appHoverBg,
  appPreviewBg,
  appBorderColor,
  textColor,
  textInverseColor,
  textMutedColor,
  barTextColor,
  barBg,
  buttonBg,
  buttonBorder,
  booleanBg,
  booleanSelectedBg,
  inputBg,
  inputBorder,
  inputTextColor,
}: Ps1uiPalette): ThemeVars =>
  create({
    base,

    brandTitle: "ps1ui",
    brandUrl: "https://github.com/koki-develop/ps1ui",

    colorPrimary: colorAccent,
    colorSecondary: colorAccent,

    appBg,
    appContentBg,
    appHoverBg,
    appPreviewBg,
    appBorderColor,
    appBorderRadius: 3,

    fontBase: '"JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, Monaco, monospace',
    fontCode: '"JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, Monaco, monospace',

    textColor,
    textInverseColor,
    textMutedColor,

    barTextColor,
    barHoverColor: colorAccent,
    barSelectedColor: colorAccent,
    barBg,

    buttonBg,
    buttonBorder,

    booleanBg,
    booleanSelectedBg,

    inputBg,
    inputBorder,
    inputTextColor,
    inputBorderRadius: 3,
  });

export const ps1uiThemes = {
  dark: createPs1uiTheme({
    base: "dark",
    colorAccent: "#7ee787",
    appBg: "#0b0f14",
    appContentBg: "#0b0f14",
    appHoverBg: "#0f1520",
    appPreviewBg: "#0b0f14",
    appBorderColor: "#21262d",
    textColor: "#c7d5df",
    textInverseColor: "#0b0f14",
    textMutedColor: "#8b98a5",
    barTextColor: "#8b98a5",
    barBg: "#0f1520",
    buttonBg: "#0f1520",
    buttonBorder: "#30363d",
    booleanBg: "#0f1520",
    booleanSelectedBg: "#30363d",
    inputBg: "#0b0f14",
    inputBorder: "#30363d",
    inputTextColor: "#c7d5df",
  }),
  // Manager accents (colorPrimary/Secondary, barHoverColor, barSelectedColor)
  // sit on a light ground as TEXT/indicators, not as a fill — so they use
  // `--ps1ui-color-primary-text` (#1a8138), not `--ps1ui-color-primary`
  // (#078926), which is tuned for white text ON TOP of it instead.
  light: createPs1uiTheme({
    base: "light",
    colorAccent: "#1a8138",
    appBg: "#ffffff",
    appContentBg: "#ffffff",
    appHoverBg: "#f6f8fa",
    appPreviewBg: "#ffffff",
    appBorderColor: "#d0d7de",
    textColor: "#1f2328",
    textInverseColor: "#ffffff",
    textMutedColor: "#59636e",
    barTextColor: "#59636e",
    barBg: "#f6f8fa",
    buttonBg: "#f6f8fa",
    buttonBorder: "#afb8c1",
    booleanBg: "#f6f8fa",
    booleanSelectedBg: "#afb8c1",
    inputBg: "#ffffff",
    inputBorder: "#afb8c1",
    inputTextColor: "#1f2328",
  }),
};
