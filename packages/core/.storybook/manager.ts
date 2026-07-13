import { addons } from "storybook/manager-api";

import { ps1uiTheme } from "./ps1uiTheme";

addons.setConfig({
  theme: ps1uiTheme,
});
