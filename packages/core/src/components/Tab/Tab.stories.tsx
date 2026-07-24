import type { Meta, StoryObj } from "@storybook/react-vite";

import { TabList } from "../TabList/TabList";
import { TabPanel } from "../TabPanel/TabPanel";
import { Tabs } from "../Tabs/Tabs";
import { Tab } from "./Tab";

const meta = {
  title: "Components/Tab",
  component: Tab,
  argTypes: {
    disabled: { control: "boolean" },
    selected: { control: "boolean" },
  },
} satisfies Meta<typeof Tab>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: "apple", selected: true, children: "Apple" },
  render: (args) => (
    <TabList aria-label="fruit">
      <Tab {...args} />
    </TabList>
  ),
};

export const Unselected: Story = {
  args: { value: "apple", selected: false, children: "Apple" },
  render: Default.render,
};

export const Disabled: Story = {
  args: { value: "apple", disabled: true, children: "Apple" },
  render: Default.render,
};

export const InsideTabs: Story = {
  args: { value: "apple", children: "Apple" },
  render: () => (
    <Tabs defaultValue="apple">
      <TabList aria-label="fruit">
        <Tab value="apple">Apple</Tab>
        <Tab value="banana">Banana</Tab>
        <Tab value="cherry" disabled>
          Cherry
        </Tab>
      </TabList>
      <TabPanel value="apple">apple panel</TabPanel>
      <TabPanel value="banana">banana panel</TabPanel>
      <TabPanel value="cherry">cherry panel</TabPanel>
    </Tabs>
  ),
};
