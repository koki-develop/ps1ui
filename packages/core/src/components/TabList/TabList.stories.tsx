import type { Meta, StoryObj } from "@storybook/react-vite";

import { Tab } from "../Tab/Tab";
import { TabPanel } from "../TabPanel/TabPanel";
import { Tabs } from "../Tabs/Tabs";
import { TabList } from "./TabList";

const meta = {
  title: "Components/TabList",
  component: TabList,
} satisfies Meta<typeof TabList>;

export default meta;

type Story = StoryObj<typeof meta>;

// Panels are rendered alongside so the auto-generated aria-controls on each
// Tab resolves to a real id — axe fails the "valid attribute value" rule
// when a controls target doesn't exist in the DOM.
export const Default: Story = {
  render: () => (
    <Tabs defaultValue="a">
      <TabList aria-label="fruit">
        <Tab value="a">Apple</Tab>
        <Tab value="b">Banana</Tab>
        <Tab value="c">Cherry</Tab>
      </TabList>
      <TabPanel value="a">apple panel</TabPanel>
      <TabPanel value="b">banana panel</TabPanel>
      <TabPanel value="c">cherry panel</TabPanel>
    </Tabs>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Tabs defaultValue="a" orientation="vertical">
      <TabList aria-label="fruit">
        <Tab value="a">Apple</Tab>
        <Tab value="b">Banana</Tab>
        <Tab value="c">Cherry</Tab>
      </TabList>
      <TabPanel value="a">apple panel</TabPanel>
      <TabPanel value="b">banana panel</TabPanel>
      <TabPanel value="c">cherry panel</TabPanel>
    </Tabs>
  ),
};
