import { addons } from "storybook/manager-api";

import { poiuiTheme } from "./poiuiTheme";

addons.setConfig({
  theme: poiuiTheme,
});
