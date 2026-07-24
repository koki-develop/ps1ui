import type { Meta, StoryObj } from "@storybook/react-vite";

import { Tab } from "../Tab/Tab";
import { TabList } from "../TabList/TabList";
import { TabPanel } from "../TabPanel/TabPanel";
import { Tabs } from "./Tabs";

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  argTypes: {
    orientation: { control: { type: "inline-radio" }, options: ["horizontal", "vertical"] },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { defaultValue: "overview" },
  render: (args) => (
    <Tabs {...args}>
      <TabList aria-label="doc sections">
        <Tab value="overview">Overview</Tab>
        <Tab value="install">Install</Tab>
        <Tab value="api">API</Tab>
      </TabList>
      <TabPanel value="overview">
        A monospace UI toolkit for building terminal-inspired dashboards.
      </TabPanel>
      <TabPanel value="install">Install with `pnpm add @ps1ui/core`.</TabPanel>
      <TabPanel value="api">See the Props table on each component's page.</TabPanel>
    </Tabs>
  ),
};

export const NoDefaultValue: Story = {
  args: {},
  render: Default.render,
};

export const WithDisabledTab: Story = {
  args: { defaultValue: "overview" },
  render: (args) => (
    <Tabs {...args}>
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
  ),
};

export const GroupDisabled: Story = {
  args: { defaultValue: "overview", disabled: true },
  render: Default.render,
};

export const Vertical: Story = {
  args: { defaultValue: "overview", orientation: "vertical" },
  render: Default.render,
};
