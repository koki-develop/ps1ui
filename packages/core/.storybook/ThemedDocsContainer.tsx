import { useEffect, useState } from "react";
import type { FC, PropsWithChildren } from "react";
import { DocsContainer } from "@storybook/addon-docs/blocks";
import type { DocsContainerProps } from "@storybook/addon-docs/blocks";
import { GLOBALS_UPDATED, SET_GLOBALS } from "storybook/internal/core-events";
import type { GlobalsUpdatedPayload, Globals, SetGlobalsPayload } from "storybook/internal/types";

import { ps1uiThemes } from "./ps1uiTheme";

const themeKeyFor = (globals: Globals | undefined): "dark" | "light" =>
  globals?.theme === "light" ? "light" : "dark";

// `Docs.tsx` (addon-docs) renders `<Container context={context} theme={docsParameter.theme} />`
// once, synchronously — `parameters.docs.theme` is a static value read at that one render, so it
// can never react to the toolbar. The container is the only place a docs theme is actually
// consumed (it feeds `theme` straight into `<ThemeProvider>` — see addon-docs' DocsContainer.tsx),
// so swapping the container itself, rather than the `docs.theme` parameter, is the only point that
// can make Docs pages follow the toolbar's `theme` global live.
export const ThemedDocsContainer: FC<PropsWithChildren<DocsContainerProps>> = ({
  context,
  children,
}) => {
  const { channel } = context;

  const [themeKey, setThemeKey] = useState<"dark" | "light">(() => {
    // The preview emits `SET_GLOBALS` once on load, before this container ever mounts, and
    // `GLOBALS_UPDATED` on every toolbar change after that — `channel.last(...)` replays whichever
    // fired most recently (Storybook's `Channel` records every event's args, listener or not) so
    // the initial render already reflects the current toolbar choice instead of flashing dark.
    const lastUpdated = channel.last(GLOBALS_UPDATED) as [GlobalsUpdatedPayload] | undefined;
    const lastSet = channel.last(SET_GLOBALS) as [SetGlobalsPayload] | undefined;
    return themeKeyFor(lastUpdated?.[0]?.globals ?? lastSet?.[0]?.globals);
  });

  useEffect(() => {
    const onSetGlobals = ({ globals }: SetGlobalsPayload) => setThemeKey(themeKeyFor(globals));
    const onGlobalsUpdated = ({ globals }: GlobalsUpdatedPayload) =>
      setThemeKey(themeKeyFor(globals));

    channel.on(SET_GLOBALS, onSetGlobals);
    channel.on(GLOBALS_UPDATED, onGlobalsUpdated);
    return () => {
      channel.off(SET_GLOBALS, onSetGlobals);
      channel.off(GLOBALS_UPDATED, onGlobalsUpdated);
    };
  }, [channel]);

  return (
    <DocsContainer context={context} theme={ps1uiThemes[themeKey]}>
      {children}
    </DocsContainer>
  );
};
