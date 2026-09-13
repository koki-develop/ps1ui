import { addons } from "storybook/manager-api";
import { GLOBALS_UPDATED, SET_GLOBALS } from "storybook/internal/core-events";
import type { GlobalsUpdatedPayload, Globals, SetGlobalsPayload } from "storybook/internal/types";

import { ps1uiThemes } from "./ps1uiTheme";

// Pre-load default so there's no flash of Storybook's stock theme before
// ps1ui/theme-sync (below) gets a chance to run.
addons.setConfig({
  theme: ps1uiThemes.dark,
});

const themeKeyFor = (globals: Globals | undefined): "dark" | "light" =>
  globals?.theme === "light" ? "light" : "dark";

// The preview's theme toolbar (`withThemeByDataAttribute` in preview.tsx)
// only ever reaches the preview iframe via the `theme` global — it has no
// effect on the manager chrome (sidebar, toolbar, addon panels), which reads
// its own separate `theme` option. This addon mirrors the global onto the
// manager via `api.setOptions`, which is what actually updates the running
// UI (unlike `addons.setConfig` above, which only seeds the pre-load
// default).
addons.register("ps1ui/theme-sync", (api) => {
  const applyTheme = (globals: Globals | undefined) => {
    api.setOptions({ theme: ps1uiThemes[themeKeyFor(globals)] });
  };

  // `api.getGlobals()` reads manager-api's own globals store, which starts
  // out empty (`{}`) until the preview's `SET_GLOBALS` arrives — apply
  // whatever is already known now (in case it raced ahead of us)...
  applyTheme(api.getGlobals());

  // ...and again whenever the preview reports globals, whether that's the
  // initial `SET_GLOBALS` on load/reload or a `GLOBALS_UPDATED` from the
  // toolbar being toggled.
  const channel = addons.getChannel();
  channel.on(SET_GLOBALS, ({ globals }: SetGlobalsPayload) => applyTheme(globals));
  channel.on(GLOBALS_UPDATED, ({ globals }: GlobalsUpdatedPayload) => applyTheme(globals));
});
