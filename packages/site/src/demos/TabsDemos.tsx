// Tabs demos live in a React file (not inline in tabs.astro) so that the
// whole <Tabs> / <TabList> / <Tab> / <TabPanel> composition renders inside a
// SINGLE React island. Astro renders every framework component in a .astro
// file as its own island, so the React Context that <Tabs> uses to wire the
// group's selected value into its <Tab> / <TabPanel> children would never
// cross an island boundary if the pieces were composed from `.astro`
// template syntax — clicking a tab would do nothing.
//
// Rendered with `client:load` from tabs.astro so tab switching actually
// works. This is the "proven needed" exception to packages/site/CLAUDE.md
// § "No `client:*` unless proven needed": a static tab group is inert.

import { Tab, TabList, TabPanel, Tabs } from "@ps1ui/core";

export function TabsBasicDemo() {
  return (
    <Tabs defaultValue="overview">
      <TabList aria-label="doc sections">
        <Tab value="overview">Overview</Tab>
        <Tab value="install">Install</Tab>
        <Tab value="api">API</Tab>
      </TabList>
      <TabPanel value="overview">
        A monospace UI toolkit for building terminal-inspired dashboards.
      </TabPanel>
      <TabPanel value="install">Install with pnpm add @ps1ui/core.</TabPanel>
      <TabPanel value="api">See the Props table on each component&apos;s page.</TabPanel>
    </Tabs>
  );
}

export function TabsDisabledDemo() {
  return (
    <Tabs defaultValue="overview">
      <TabList aria-label="doc sections">
        <Tab value="overview">Overview</Tab>
        <Tab value="install" disabled>
          Install
        </Tab>
        <Tab value="api">API</Tab>
      </TabList>
      <TabPanel value="overview">Overview content.</TabPanel>
      <TabPanel value="install">Install content.</TabPanel>
      <TabPanel value="api">API content.</TabPanel>
    </Tabs>
  );
}

export function TabsVerticalDemo() {
  return (
    <Tabs defaultValue="overview" orientation="vertical">
      <TabList aria-label="doc sections">
        <Tab value="overview">Overview</Tab>
        <Tab value="install">Install</Tab>
        <Tab value="api">API</Tab>
      </TabList>
      <TabPanel value="overview">Overview content.</TabPanel>
      <TabPanel value="install">Install content.</TabPanel>
      <TabPanel value="api">API content.</TabPanel>
    </Tabs>
  );
}
