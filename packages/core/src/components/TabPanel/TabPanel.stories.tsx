import type { Meta, StoryObj } from "@storybook/react-vite";

import { Tab } from "../Tab/Tab";
import { TabList } from "../TabList/TabList";
import { Tabs } from "../Tabs/Tabs";
import { TabPanel } from "./TabPanel";

const meta = {
  title: "Components/TabPanel",
  component: TabPanel,
} satisfies Meta<typeof TabPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { value: "a", children: "Panel content." },
  render: (args) => (
    <Tabs defaultValue="a">
      <TabList aria-label="fruit">
        <Tab value="a">Apple</Tab>
      </TabList>
      <TabPanel {...args} />
    </Tabs>
  ),
};

export const Standalone: Story = {
  args: { value: "a", "aria-label": "apple", children: "Panel content (no Tabs above)." },
  render: (args) => <TabPanel {...args} />,
};
